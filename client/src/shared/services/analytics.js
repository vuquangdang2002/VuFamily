import { analytics as firebaseAnalytics } from '../../firebase';
import { myLog, myError } from '../utils/logger';
import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';

/**
 * AnalyticsService - Hệ thống tracking sự kiện tập trung.
 * Sử dụng Design Pattern: Facade & Observer
 * Giúp dễ dàng cắm (plug-in) các hệ thống tracking khác nhau (Firebase, Mixpanel, Custom Backend...)
 * mà không cần sửa code ở từng file component.
 */
class AnalyticsService {
    constructor() {
        this.providers = [];
        this.initDefaultProviders();
    }

    initDefaultProviders() {
        // 1. Provider: Console Logger (Dùng để debug trên môi trường Development)
        this.registerProvider({
            name: 'ConsoleLogger',
            track: (eventName, params) => {
                // Thường chỉ log ra console nếu ở môi trường dev
                myLog('ANALYTICS', `📊 [Analytics Track] Event: '${eventName}'`, params);
            },
            identify: (userId, props) => {
                myLog('ANALYTICS', `👤 [Analytics Identify] User: ${userId}`, props);
            }
        });

        // 2. Provider: Firebase Analytics
        if (firebaseAnalytics) {
            this.registerProvider({
                name: 'Firebase',
                track: (eventName, params) => {
                    try { 
                        logEvent(firebaseAnalytics, eventName, params); 
                    } catch(e) { 
                        myError('ANALYTICS', "Firebase Track Error:", e); 
                    }
                },
                identify: (userId, props) => {
                    try { 
                        if (userId) setUserId(firebaseAnalytics, String(userId));
                        if (props) setUserProperties(firebaseAnalytics, props);
                    } catch(e) { 
                        myError('ANALYTICS', "Firebase Identify Error:", e); 
                    }
                }
            });
        }
    }

    /**
     * Đăng ký thêm một hệ thống log mới (Ví dụ: sau này thêm Mixpanel)
     */
    registerProvider(provider) {
        if (provider && typeof provider.track === 'function') {
            this.providers.push(provider);
        }
    }

    /**
     * Ghi nhận một sự kiện (hành động của người dùng)
     * @param {string} eventName Tên sự kiện (VD: 'login_success', 'view_family_tree')
     * @param {object} params Các thông số chi tiết đi kèm
     */
    trackEvent(eventName, params = {}) {
        const timestamp = new Date().toISOString();
        const enrichedParams = { ...params, timestamp };
        
        this.providers.forEach(provider => {
            try {
                provider.track(eventName, enrichedParams);
            } catch (e) {
                myError('ANALYTICS', `[Analytics] Provider ${provider.name} failed to track ${eventName}`, e);
            }
        });
    }

    /**
     * Định danh người dùng hiện tại
     * @param {string|number} userId ID của người dùng
     * @param {object} props Các thuộc tính của người dùng (VD: { role: 'admin', display_name: 'Đáng' })
     */
    identifyUser(userId, props = {}) {
        this.providers.forEach(provider => {
            if (typeof provider.identify === 'function') {
                try {
                    provider.identify(userId, props);
                } catch (e) {
                    myError('ANALYTICS', `[Analytics] Provider ${provider.name} failed to identify user`, e);
                }
            }
        });
    }
}

// Export một instance duy nhất (Singleton Pattern)
export const Analytics = new AnalyticsService();
