import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { BellRing, Mail, Save, Smartphone } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export const NotificationPreferencesModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    api.get('/notifications/preferences')
      .then((response) => {
        if (active) setPreferences(response.data?.data || null);
      })
      .catch(() => {
        if (active) toast.error(t('notifications.loadFailed'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isOpen, t]);

  const updatePreference = (field, value) => {
    setPreferences((current) => {
      if (!current) return current;
      if (field.startsWith('categories.')) {
        const key = field.split('.')[1];
        return { ...current, categories: { ...current.categories, [key]: value } };
      }
      return { ...current, [field]: value };
    });
  };

  const handleSave = async () => {
    if (!preferences) return;
    setSaving(true);
    try {
      const response = await api.put('/notifications/preferences', preferences);
      setPreferences(response.data?.data || preferences);
      toast.success(t('notifications.saved'));
      onClose();
    } catch {
      toast.error(t('notifications.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const channelOptions = [
    ['pushEnabled', 'notifications.push', 'notifications.pushDesc', Smartphone],
    ['emailEnabled', 'notifications.email', 'notifications.emailDesc', Mail],
  ];

  const categoryOptions = [
    ['matches', 'notifications.matches'],
    ['claims', 'notifications.claims'],
    ['handover', 'notifications.handover'],
    ['reminders', 'notifications.reminders'],
    ['system', 'notifications.system'],
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('notifications.preferences')}
      size="lg"
    >
      <div className="space-y-6">
        <p className="text-sm text-surface-500 dark:text-surface-400">
          {t('notifications.preferencesDesc')}
        </p>

        {loading ? (
          <div className="py-8 text-center text-sm text-surface-500" role="status">
            {t('notifications.loadingPreferences')}
          </div>
        ) : preferences ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {channelOptions.map(([key, labelKey, descriptionKey, Icon]) => (
                <label
                  key={key}
                  className="flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border border-surface-200 p-3.5 transition hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/50"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(preferences[key])}
                    onChange={(event) => updatePreference(key, event.target.checked)}
                    className="mt-1 h-5 w-5 accent-primary-600 rounded"
                  />
                  <Icon className="mt-0.5 h-5 w-5 text-primary-600 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="block text-sm text-surface-900 dark:text-white">{t(labelKey)}</strong>
                    <span className="block text-xs text-surface-500 dark:text-surface-400 mt-0.5">{t(descriptionKey)}</span>
                  </span>
                </label>
              ))}
            </div>

            <fieldset>
              <legend className="text-sm font-bold text-surface-900 dark:text-white mb-3">
                {t('notifications.categories')}
              </legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {categoryOptions.map(([key, labelKey]) => (
                  <label
                    key={key}
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-surface-200 px-3.5 py-2.5 text-sm transition hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/50"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(preferences.categories?.[key])}
                      onChange={(event) => updatePreference(`categories.${key}`, event.target.checked)}
                      className="h-5 w-5 accent-primary-600 rounded"
                    />
                    <span className="text-surface-800 dark:text-surface-200 font-medium">{t(labelKey)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700/50">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                isLoading={saving}
                icon={<Save className="h-4 w-4" aria-hidden="true" />}
              >
                {t('notifications.savePreferences')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-rose-600" role="alert">{t('notifications.unavailable')}</p>
        )}
      </div>
    </Modal>
  );
};

export default NotificationPreferencesModal;
