import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiEdit2, FiRefreshCw, FiSave, FiTrash2 } from 'react-icons/fi';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../services/api';
import settingService from '../../services/settingService';

const DEFAULT_SPAM_SETTINGS = Object.freeze({
  spam_max_pending_claims: 5,
  spam_max_rejected_claims: 3,
  spam_max_claims_per_day: 5,
});

const SPAM_BOUNDS = Object.freeze({
  spam_max_pending_claims: { min: 1, max: 50 },
  spam_max_rejected_claims: { min: 1, max: 50 },
  spam_max_claims_per_day: { min: 1, max: 100 },
});

const DEFAULT_RETENTION_SETTINGS = Object.freeze({
  retention_inactive_days: 30,
  retention_resolved_days: 3,
  retention_unconfirmed_claims_days: 14,
});

const RETENTION_BOUNDS = Object.freeze({
  retention_inactive_days: { min: 1, max: 365 },
  retention_resolved_days: { min: 1, max: 90 },
  retention_unconfirmed_claims_days: { min: 1, max: 60 },
});

const parseSettingInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const SiteSettings = () => {
  const { t } = useLanguage();
  const [contactDetails, setContactDetails] = useState({ office: '', email: '', phone: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [isSavingAuth, setIsSavingAuth] = useState(false);
  const [spamSettings, setSpamSettings] = useState(DEFAULT_SPAM_SETTINGS);
  const [isSavingSpam, setIsSavingSpam] = useState(false);
  const [retentionSettings, setRetentionSettings] = useState(DEFAULT_RETENTION_SETTINGS);
  const [isSavingRetention, setIsSavingRetention] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const [contactRes, authRes, pendingRes, rejectedRes, velocityRes, inactiveRes, resolvedRes, unconfirmedRes] = await Promise.all([
        settingService.getSetting('contact_details').catch((error) => error?.response?.status === 404 ? null : Promise.reject(error)),
        settingService.getSetting('require_email_verification').catch((error) => error?.response?.status === 404 ? null : Promise.reject(error)),
        settingService.getSetting('spam_max_pending_claims').catch((error) => error?.response?.status === 404 ? null : Promise.reject(error)),
        settingService.getSetting('spam_max_rejected_claims').catch((error) => error?.response?.status === 404 ? null : Promise.reject(error)),
        settingService.getSetting('spam_max_claims_per_day').catch((error) => error?.response?.status === 404 ? null : Promise.reject(error)),
        settingService.getSetting('retention_inactive_days').catch((error) => error?.response?.status === 404 ? null : Promise.reject(error)),
        settingService.getSetting('retention_resolved_days').catch((error) => error?.response?.status === 404 ? null : Promise.reject(error)),
        settingService.getSetting('retention_unconfirmed_claims_days').catch((error) => error?.response?.status === 404 ? null : Promise.reject(error)),
      ]);

      const contact = contactRes?.data || {};
      setContactDetails({
        office: contact.office || '',
        email: contact.email || '',
        phone: contact.phone || '',
      });
      if (authRes?.data !== null && authRes?.data !== undefined) {
        setRequireEmailVerification(authRes.data === true || authRes.data === 'true');
      }
      setSpamSettings({
        spam_max_pending_claims: parseSettingInteger(pendingRes?.data, DEFAULT_SPAM_SETTINGS.spam_max_pending_claims),
        spam_max_rejected_claims: parseSettingInteger(rejectedRes?.data, DEFAULT_SPAM_SETTINGS.spam_max_rejected_claims),
        spam_max_claims_per_day: parseSettingInteger(velocityRes?.data, DEFAULT_SPAM_SETTINGS.spam_max_claims_per_day),
      });
      setRetentionSettings({
        retention_inactive_days: parseSettingInteger(inactiveRes?.data, DEFAULT_RETENTION_SETTINGS.retention_inactive_days),
        retention_resolved_days: parseSettingInteger(resolvedRes?.data, DEFAULT_RETENTION_SETTINGS.retention_resolved_days),
        retention_unconfirmed_claims_days: parseSettingInteger(unconfirmedRes?.data, DEFAULT_RETENTION_SETTINGS.retention_unconfirmed_claims_days),
      });
    } catch {
      toast.error(t('settings.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveContactDetails = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await settingService.updateSetting(
        'contact_details',
        contactDetails,
        'Public university support contact details shown on the Contact page.',
        true,
      );
      toast.success(t('settings.contactSuccess'));
      setIsEditing(false);
    } catch {
      toast.error(t('settings.contactError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAuthSetting = async () => {
    setIsSavingAuth(true);
    const newValue = !requireEmailVerification;
    try {
      await settingService.updateSetting(
        'require_email_verification',
        newValue,
        'Require email verification before a new account can sign in.',
      );
      setRequireEmailVerification(newValue);
      toast.success(t(newValue ? 'settings.authEnabled' : 'settings.authDisabled'));
    } catch {
      toast.error(t('settings.authError'));
    } finally {
      setIsSavingAuth(false);
    }
  };

  const validateSpamSettings = () => {
    const normalized = {};
    for (const [key, bounds] of Object.entries(SPAM_BOUNDS)) {
      const parsed = Number.parseInt(spamSettings[key], 10);
      if (!Number.isInteger(parsed) || parsed < bounds.min || parsed > bounds.max) {
        toast.error(t('settings.invalidRange', { min: bounds.min, max: bounds.max }));
        return null;
      }
      normalized[key] = parsed;
    }
    return normalized;
  };

  const handleSaveSpamSettings = async (event) => {
    event.preventDefault();
    const normalized = validateSpamSettings();
    if (!normalized) return;
    setIsSavingSpam(true);
    try {
      await Promise.all([
        settingService.updateSetting(
          'spam_max_pending_claims',
          normalized.spam_max_pending_claims,
          'Maximum concurrent pending claims before new claim requests are temporarily blocked.',
        ),
        settingService.updateSetting(
          'spam_max_rejected_claims',
          normalized.spam_max_rejected_claims,
          'Rejected-claim threshold that adds an advisory human-review risk signal; it never suspends an account automatically.',
        ),
        settingService.updateSetting(
          'spam_max_claims_per_day',
          normalized.spam_max_claims_per_day,
          'Maximum claim submissions in a rolling 24-hour window before new requests are temporarily rate-limited.',
        ),
      ]);
      setSpamSettings(normalized);
      toast.success(t('settings.abuseSuccess'));
    } catch {
      toast.error(t('settings.abuseError'));
    } finally {
      setIsSavingSpam(false);
    }
  };

  const validateRetentionSettings = () => {
    const normalized = {};
    for (const [key, bounds] of Object.entries(RETENTION_BOUNDS)) {
      const parsed = Number.parseInt(retentionSettings[key], 10);
      if (!Number.isInteger(parsed) || parsed < bounds.min || parsed > bounds.max) {
        toast.error(t('settings.invalidRange', { min: bounds.min, max: bounds.max }));
        return null;
      }
      normalized[key] = parsed;
    }
    return normalized;
  };

  const handleSaveRetentionSettings = async (event) => {
    event.preventDefault();
    const normalized = validateRetentionSettings();
    if (!normalized) return;
    setIsSavingRetention(true);
    try {
      await Promise.all([
        settingService.updateSetting(
          'retention_inactive_days',
          normalized.retention_inactive_days,
          'Number of days before an unresolved/inactive item is automatically archived and its images purged.',
        ),
        settingService.updateSetting(
          'retention_resolved_days',
          normalized.retention_resolved_days,
          'Number of days after handover/claim completion before item images and AI records are purged.',
        ),
        settingService.updateSetting(
          'retention_unconfirmed_claims_days',
          normalized.retention_unconfirmed_claims_days,
          'Number of days before an approved but unconfirmed claim connection is automatically cancelled.',
        ),
      ]);
      setRetentionSettings(normalized);
      toast.success(t('settings.retentionSuccess'));
    } catch {
      toast.error(t('settings.retentionError'));
    } finally {
      setIsSavingRetention(false);
    }
  };

  const handleRunCleanupNow = async () => {
    setIsRunningCleanup(true);
    try {
      await api.post('/system-settings/run-cleanup');
      toast.success(t('settings.cleanupSuccess'));
    } catch {
      toast.error(t('settings.cleanupError'));
    } finally {
      setIsRunningCleanup(false);
    }
  };

  const handleContactChange = (event) => {
    const { name, value } = event.target;
    setContactDetails((previous) => ({ ...previous, [name]: value }));
  };

  const handleSpamChange = (key, value) => {
    setSpamSettings((previous) => ({ ...previous, [key]: value }));
  };

  const handleRetentionChange = (key, value) => {
    setRetentionSettings((previous) => ({ ...previous, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-8" role="status" aria-label={t('settings.loadingLabel')}>
        <div className="h-8 w-1/4 animate-pulse rounded bg-surface-200 dark:bg-surface-800" />
        <div className="h-64 animate-pulse rounded bg-surface-200 dark:bg-surface-800" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 pb-24 sm:p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{t('settings.subtitle')}</p>
      </header>

      <section className="card border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-800" aria-labelledby="contact-settings-title">
        <div className="mb-6 flex items-center justify-between border-b border-surface-100 pb-3 dark:border-surface-700">
          <h2 id="contact-settings-title" className="font-display text-lg font-bold text-surface-900 dark:text-white">{t('settings.contactTitle')}</h2>
          {!isEditing && (
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)} icon={<FiEdit2 aria-hidden="true" />}>
              {t('settings.edit')}
            </Button>
          )}
        </div>

        <form onSubmit={handleSaveContactDetails} className="space-y-4">
          <Input label={t('settings.officeLabel')} name="office" value={contactDetails.office} onChange={handleContactChange} placeholder={t('settings.officePlaceholder')} required disabled={!isEditing} />
          <Input type="email" label={t('settings.emailLabel')} name="email" value={contactDetails.email} onChange={handleContactChange} placeholder={t('settings.emailPlaceholder')} required disabled={!isEditing} />
          <Input label={t('settings.phoneLabel')} name="phone" value={contactDetails.phone} onChange={handleContactChange} placeholder={t('settings.phonePlaceholder')} required disabled={!isEditing} />

          {isEditing && (
            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" isLoading={isSaving} icon={<FiSave aria-hidden="true" />}>{t('settings.saveContact')}</Button>
              <Button type="button" variant="ghost" onClick={() => { setIsEditing(false); fetchSettings(); }} disabled={isSaving}>{t('settings.cancel')}</Button>
            </div>
          )}
        </form>
      </section>

      <section className="card mt-6 border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-800" aria-labelledby="auth-settings-title">
        <h2 id="auth-settings-title" className="mb-4 border-b border-surface-100 pb-3 font-display text-lg font-bold text-surface-900 dark:border-surface-700 dark:text-white">{t('settings.authTitle')}</h2>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900">
          <div>
            <h3 className="text-base font-semibold text-surface-900 dark:text-white">{t('settings.requireEmailTitle')}</h3>
            <p className="mt-1 max-w-lg text-sm text-surface-500 dark:text-surface-400">{t('settings.authDescription')}</p>
          </div>
          <button
            type="button"
            className={`relative inline-flex h-11 w-14 flex-shrink-0 items-center rounded-full border-2 border-transparent p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${requireEmailVerification ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'} ${isSavingAuth ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            role="switch"
            aria-label={t('settings.authSwitchLabel')}
            aria-checked={requireEmailVerification}
            onClick={handleToggleAuthSetting}
            disabled={isSavingAuth}
          >
            <span aria-hidden="true" className={`block h-7 w-7 rounded-full bg-white shadow transition-transform ${requireEmailVerification ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      </section>

      <section className="card mt-6 border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-800" aria-labelledby="abuse-settings-title">
        <h2 id="abuse-settings-title" className="mb-3 border-b border-surface-100 pb-3 font-display text-lg font-bold text-surface-900 dark:border-surface-700 dark:text-white">{t('settings.abuseTitle')}</h2>
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">{t('settings.abuseNotice')}</p>

        <form onSubmit={handleSaveSpamSettings} className="space-y-4">
          <Input type="number" min="1" max="50" label={t('settings.pendingLabel')} value={spamSettings.spam_max_pending_claims} onChange={(event) => handleSpamChange('spam_max_pending_claims', event.target.value)} placeholder="5" helperText={t('settings.pendingHelp')} required />
          <Input type="number" min="1" max="50" label={t('settings.rejectedLabel')} value={spamSettings.spam_max_rejected_claims} onChange={(event) => handleSpamChange('spam_max_rejected_claims', event.target.value)} placeholder="3" helperText={t('settings.rejectedHelp')} required />
          <Input type="number" min="1" max="100" label={t('settings.dailyLabel')} value={spamSettings.spam_max_claims_per_day} onChange={(event) => handleSpamChange('spam_max_claims_per_day', event.target.value)} placeholder="5" helperText={t('settings.dailyHelp')} required />
          <div className="pt-2">
            <Button type="submit" variant="primary" isLoading={isSavingSpam} icon={<FiSave aria-hidden="true" />}>{t('settings.saveAbuse')}</Button>
          </div>
        </form>
      </section>

      <section className="card mt-6 border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-800" aria-labelledby="retention-settings-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 pb-3 dark:border-surface-700">
          <div>
            <h2 id="retention-settings-title" className="font-display text-lg font-bold text-surface-900 dark:text-white">{t('settings.retentionTitle')}</h2>
            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{t('settings.retentionSubtitle')}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRunCleanupNow}
            isLoading={isRunningCleanup}
            icon={<FiRefreshCw aria-hidden="true" className={isRunningCleanup ? 'animate-spin' : ''} />}
          >
            {t('settings.runCleanupNow')}
          </Button>
        </div>

        <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">{t('settings.retentionNotice')}</p>

        <form onSubmit={handleSaveRetentionSettings} className="space-y-4">
          <Input
            type="number"
            min="1"
            max="365"
            label={t('settings.inactiveDaysLabel')}
            value={retentionSettings.retention_inactive_days}
            onChange={(event) => handleRetentionChange('retention_inactive_days', event.target.value)}
            placeholder="30"
            helperText={t('settings.inactiveDaysHelp')}
            required
          />
          <Input
            type="number"
            min="1"
            max="90"
            label={t('settings.resolvedDaysLabel')}
            value={retentionSettings.retention_resolved_days}
            onChange={(event) => handleRetentionChange('retention_resolved_days', event.target.value)}
            placeholder="3"
            helperText={t('settings.resolvedDaysHelp')}
            required
          />
          <Input
            type="number"
            min="1"
            max="60"
            label={t('settings.unconfirmedDaysLabel')}
            value={retentionSettings.retention_unconfirmed_claims_days}
            onChange={(event) => handleRetentionChange('retention_unconfirmed_claims_days', event.target.value)}
            placeholder="14"
            helperText={t('settings.unconfirmedDaysHelp')}
            required
          />
          <div className="pt-2">
            <Button type="submit" variant="primary" isLoading={isSavingRetention} icon={<FiSave aria-hidden="true" />}>{t('settings.saveRetention')}</Button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default SiteSettings;
