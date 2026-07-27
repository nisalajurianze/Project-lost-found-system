import api from '../services/api';

export const PUSH_NOTIFICATION_ERROR_CODES = Object.freeze({
  UNSUPPORTED: 'PUSH_UNSUPPORTED',
  PERMISSION_DENIED: 'PUSH_PERMISSION_DENIED',
  INVALID_PUBLIC_KEY: 'PUSH_INVALID_PUBLIC_KEY',
});

const createPushError = (code, cause) => {
  const error = new Error(code, cause ? { cause } : undefined);
  error.code = code;
  return error;
};

// Helper to convert base64 public key to Uint8Array for the push manager
const urlBase64ToUint8Array = (base64String) => {
  if (!base64String || typeof base64String !== 'string') {
    throw createPushError(PUSH_NOTIFICATION_ERROR_CODES.INVALID_PUBLIC_KEY);
  }

  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const subscribeToPushNotifications = async () => {
  if (
    typeof window === 'undefined'
    || !('Notification' in window)
    || !('serviceWorker' in navigator)
    || !('PushManager' in window)
  ) {
    throw createPushError(PUSH_NOTIFICATION_ERROR_CODES.UNSUPPORTED);
  }

  // This function is called only from an explicit user action.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw createPushError(PUSH_NOTIFICATION_ERROR_CODES.PERMISSION_DENIED);
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const { data } = await api.get('/notifications/push/public-key');
  const applicationServerKey = urlBase64ToUint8Array(data?.data?.publicKey);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  await api.post('/notifications/push/subscribe', { subscription });
  return subscription;
};

export const unsubscribeFromPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
    await api.delete('/notifications/push/unsubscribe');
  }
};
