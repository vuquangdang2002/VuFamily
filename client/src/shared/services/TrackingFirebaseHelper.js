import { analytics as firebaseAnalytics } from '../../firebase';
import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { myLog, myError } from '../utils/logger';

export const TrackingFirebaseHelper = {
    trackEvent: (eventName, params) => {
        if (!firebaseAnalytics) return;
        try {
            logEvent(firebaseAnalytics, eventName, params);
        } catch (e) {
            myError('ANALYTICS', "Firebase Track Error:", e);
        }
    },
    
    identifyUser: (userId, props) => {
        if (!firebaseAnalytics) return;
        try {
            if (userId) setUserId(firebaseAnalytics, String(userId));
            if (props) setUserProperties(firebaseAnalytics, props);
        } catch (e) {
            myError('ANALYTICS', "Firebase Identify Error:", e);
        }
    }
};
