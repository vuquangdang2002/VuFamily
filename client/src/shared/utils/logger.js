/**
 * Logger Utility
 * Global toggle and module-specific toggles.
 */

// Global toggle for all logs
export const ENABLE_MYLOG = true;

// Specific module toggles
export const LOG_FLAGS = {
    CHAT: true,
    CALL: true,
    WEBRTC: false,
    CACHE: false,
    HUB: true,
    NEWSFEED: true,
    REQUEST: true,
    HISTORY: true,
    CALENDAR: true,
    ACCOUNTS: true,
    APP: true,
    FIREBASE: true,
    ANALYTICS: true
};

export function myLog(flag, ...args) {
    if (!ENABLE_MYLOG) return;
    
    // If flag is true, or if flag doesn't exist but we want to log it anyway
    if (LOG_FLAGS[flag] !== false) {
        console.log(`[${flag}]`, ...args);
    }
}

export function myWarning(flag, ...args) {
    // Luôn luôn log warning
    console.warn(`[${flag}]`, ...args);
}

export function myError(flag, ...args) {
    // Luôn luôn log error
    console.error(`[${flag}]`, ...args);
}
