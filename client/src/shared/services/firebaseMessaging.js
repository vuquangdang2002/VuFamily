import { messaging } from '../../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { Analytics } from './analytics';

export const requestNotificationPermission = async () => {
    try {
        if (!('Notification' in window)) {
            console.warn('Trình duyệt không hỗ trợ notification.');
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            // VAPID KEY can be generated from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
            // For now, we fetch without VAPID key which relies on FCM default or we can provide it later.
            const currentToken = await getToken(messaging, {
                // vapidKey: 'YOUR_PUBLIC_VAPID_KEY_HERE'
            });

            if (currentToken) {
                console.log('Firebase Cloud Messaging Token:', currentToken);
                Analytics.trackEvent('fcm_token_granted');
                // You would typically send this token to your backend here
                return currentToken;
            } else {
                console.warn('No registration token available. Request permission to generate one.');
                return null;
            }
        } else {
            console.warn('Notification permission not granted.');
            Analytics.trackEvent('fcm_token_denied');
            return null;
        }
    } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
        return null;
    }
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            console.log('Payload received: ', payload);
            Analytics.trackEvent('notification_received');
            resolve(payload);
        });
    });
