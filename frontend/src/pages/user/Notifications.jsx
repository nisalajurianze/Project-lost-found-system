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

export const Notifications = () => {
  const dispatch = useDispatch();
  const { notifications, pagination, unreadCount, isLoading } = useSelector((state) => state.notifications);

  const [page, setPage] = useState(1);

  const loadNotifications = () => {
    dispatch(fetchUserNotifications({ page, limit: 10 }));
  };

  useEffect(() => {
    loadNotifications();
  }, [dispatch, page]);

  const handleRead = async (id) => {
    try {
      await dispatch(markNotificationRead(id)).unwrap();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleReadAll = async () => {
    try {
      await dispatch(markAllNotificationsRead()).unwrap();
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error('Failed to mark notifications.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteUserNotification(id)).unwrap();
      toast.success('Notification cleared.');
    } catch (err) {
      toast.error('Failed to delete notification.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">
            Notifications Center
          </h1>
          <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
            Stay updated on your item matches and ownership approvals
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleReadAll}>
            Mark All Read
          </Button>
        )}
      </div>

      {isLoading && notifications.length === 0 ? (
        <Loader fullPage />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="Your inbox is clean! We will alert you here if any matching updates occur."
        />
      ) : (
        <>
          <div className="space-y-3">
            {notifications.map((n) => (
              <NotificationCard
                key={n._id}
                notification={n}
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

