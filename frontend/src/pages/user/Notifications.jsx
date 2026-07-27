// ============================================
// Notifications Center Page Component
// Lists in-app notifications with read/clear actions
// ============================================

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteUserNotification
} from '../../redux/slices/notificationSlice';
import NotificationCard from '../../components/cards/NotificationCard';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { BellRing, Mail, Save, Smartphone } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export const Notifications = () => {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { notifications, pagination, unreadCount, isLoading } = useSelector((state) => state.notifications);

  const [page, setPage] = useState(1);
  const [preferences, setPreferences] = useState(null);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  const loadNotifications = () => {
    dispatch(fetchUserNotifications({ page, limit: 10 }));
  };

  useEffect(() => {
    loadNotifications();
  }, [dispatch, page]);

  useEffect(() => {
    let active = true;
    api.get('/notifications/preferences')
      .then((response) => { if (active) setPreferences(response.data?.data || null); })
      .catch(() => { if (active) toast.error(t('notifications.loadFailed')); })
      .finally(() => { if (active) setPreferencesLoading(false); });
    return () => { active = false; };
  }, [t]);

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

  const savePreferences = async () => {
    if (!preferences) return;
    setPreferencesSaving(true);
    try {
      const response = await api.put('/notifications/preferences', preferences);
      setPreferences(response.data?.data || preferences);
      toast.success(t('notifications.saved'));
    } catch (error) {
      toast.error(t('notifications.saveFailed'));
    } finally {
      setPreferencesSaving(false);
    }
  };

  const handleRead = async (id) => {
    try {
      await dispatch(markNotificationRead(id)).unwrap();
    } catch {
      toast.error(t('notifications.markFailed'));
    }
  };

  const handleReadAll = async () => {
    try {
      await dispatch(markAllNotificationsRead()).unwrap();
      toast.success(t('notifications.allRead'));
    } catch {
      toast.error(t('notifications.markFailed'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteUserNotification(id)).unwrap();
      toast.success(t('notifications.cleared'));
    } catch {
      toast.error(t('notifications.deleteFailed'));
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
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">
            {t('notifications.center')}
          </h1>
          <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
            {t('notifications.subtitle')}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleReadAll}>
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      <section className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-900" aria-labelledby="notification-preferences-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="notification-preferences-title" className="flex items-center gap-2 text-lg font-bold text-surface-900 dark:text-white">
              <BellRing className="h-5 w-5 text-primary-600" aria-hidden="true" />
              {t('notifications.preferences')}
            </h2>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              {t('notifications.preferencesDesc')}
            </p>
          </div>
          <Button
            onClick={savePreferences}
            disabled={preferencesLoading || !preferences}
            isLoading={preferencesSaving}
            icon={<Save className="h-4 w-4" aria-hidden="true" />}
          >
            {t('notifications.savePreferences')}
          </Button>
        </div>

        {preferencesLoading ? (
          <p className="mt-4 text-sm text-surface-500" role="status">{t('notifications.loadingPreferences')}</p>
        ) : preferences ? (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {channelOptions.map(([key, labelKey, descriptionKey, Icon]) => (
                <label key={key} className="flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border border-surface-200 p-3 dark:border-surface-700">
                  <input
                    type="checkbox"
                    checked={Boolean(preferences[key])}
                    onChange={(event) => updatePreference(key, event.target.checked)}
                    className="mt-1 h-5 w-5 accent-primary-600"
                  />
                  <Icon className="mt-0.5 h-5 w-5 text-primary-600" aria-hidden="true" />
                  <span>
                    <strong className="block text-sm text-surface-900 dark:text-white">{t(labelKey)}</strong>
                    <span className="block text-xs text-surface-500 dark:text-surface-400">{t(descriptionKey)}</span>
                  </span>
                </label>
              ))}
            </div>

            <fieldset>
              <legend className="text-sm font-bold text-surface-900 dark:text-white">{t('notifications.categories')}</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {categoryOptions.map(([key, labelKey]) => (
                  <label key={key} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-surface-200 px-3 py-2 text-sm dark:border-surface-700">
                    <input
                      type="checkbox"
                      checked={Boolean(preferences.categories?.[key])}
                      onChange={(event) => updatePreference(`categories.${key}`, event.target.checked)}
                      className="h-5 w-5 accent-primary-600"
                    />
                    <span>{t(labelKey)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : (
          <p className="mt-4 text-sm text-rose-600" role="alert">{t('notifications.unavailable')}</p>
        )}
      </section>

      {isLoading && notifications.length === 0 ? (
        <Loader fullPage />
      ) : notifications.length === 0 ? (
        <EmptyState
          title={t('notifications.emptyTitle')}
          description={t('notifications.emptyDesc')}
        />
      ) : (
        <>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification._id}
                notification={notification}
                onRead={handleRead}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </>
      )}
    </div>
  );
};

export default Notifications;
