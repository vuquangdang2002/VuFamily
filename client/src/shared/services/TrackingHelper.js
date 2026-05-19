import { TrackingFirebaseHelper } from './TrackingFirebaseHelper';
import { myLog } from '../utils/logger';

// Class/Object tổng hợp các hàm Tracking, được định nghĩa rõ ràng (Explicit semantic functions)
// Để sau này mở rộng thêm các hệ thống khác thì chỉ cần sửa ở đây, không sửa ở từng giao diện.
export const TrackingHelper = {
    _log: (eventName, params) => {
        myLog('ANALYTICS', `📊 [Analytics Track] Event: '${eventName}'`, params);
    },

    /**
     * Hàm lõi (Core function) để đẩy dữ liệu đi các hệ thống khác nhau.
     * Mọi function bên dưới ĐỀU PHẢI GỌI qua hàm này.
     */
    TrackingEvent: (eventName, params = {}) => {
        const finalParams = { ...params, timestamp: new Date().toISOString() };
        TrackingHelper._log(eventName, finalParams);

        // 🔌 Cắm các provider vào đây:
        TrackingFirebaseHelper.trackEvent(eventName, finalParams);
        // Tương lai: TrackingServerBucketHelper.trackEvent(eventName, finalParams);
        // Tương lai: TrackingMixpanelHelper.trackEvent(eventName, finalParams);
    },

    identifyUser: (userId, props = {}) => {
        myLog('ANALYTICS', `👤 [Analytics Identify] User: ${userId}`, props);
        TrackingFirebaseHelper.identifyUser(userId, props);
        // Tương lai: TrackingServerBucketHelper.identifyUser(userId, props);
    },

    // ==========================================
    // 1. CORE EVENTS
    // ==========================================
    trackAppOpen: (platform = 'web') => {
        TrackingHelper.TrackingEvent('app_open', { platform });
    },

    trackLoginSuccess: (method = 'token') => {
        TrackingHelper.TrackingEvent('login_success', { method });
    },

    trackLogout: () => {
        TrackingHelper.TrackingEvent('logout');
    },

    // ==========================================
    // 2. ENGAGEMENT EVENTS
    // ==========================================
    trackViewFamilyTree: (totalNodes) => {
        TrackingHelper.TrackingEvent('view_family_tree', { total_nodes: totalNodes });
    },

    trackAddTreeMember: (relationship) => {
        TrackingHelper.TrackingEvent('add_tree_member', { relationship });
    },

    trackSendChatMessage: (roomType) => {
        TrackingHelper.TrackingEvent('send_chat_message', { room_type: roomType });
    },

    trackStartVoiceCall: (callType) => {
        TrackingHelper.TrackingEvent('start_voice_call', { call_type: callType });
    },

    trackEndVoiceCall: (durationSeconds) => {
        TrackingHelper.TrackingEvent('end_voice_call', { duration_seconds: durationSeconds });
    },

    // ==========================================
    // 3. NEWSFEED & CALENDAR EVENTS
    // ==========================================
    trackCreatePost: (hasImage) => {
        TrackingHelper.TrackingEvent('create_post', { has_image: hasImage });
    },

    trackReactPost: (reactionType) => {
        TrackingHelper.TrackingEvent('react_post', { reaction_type: reactionType });
    },

    trackViewCalendar: () => {
        TrackingHelper.TrackingEvent('view_calendar');
    },

    // ==========================================
    // 4. ADMIN EVENTS
    // ==========================================
    trackCreateAccount: (targetRole) => {
        TrackingHelper.TrackingEvent('create_account', { target_role: targetRole });
    },

    trackBanAccount: (targetUserId) => {
        TrackingHelper.TrackingEvent('ban_account', { target_user_id: targetUserId });
    }
};
