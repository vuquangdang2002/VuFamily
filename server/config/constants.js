// Centralized Global Configuration Constants
module.exports = {
    // Feature Flags (High-Availability & Scale Toggles)
    FEATURES: {
        ENABLE_CALL_SYSTEM: true,
        ENABLE_CHAT_HISTORY_ARCHIVE: true,
        ENABLE_ADVANCED_LOGGING: false
    },

    // Roles
    ROLES: {
        ADMIN: 'admin',
        EDITOR: 'editor',
        VIEWER: 'viewer'
    },
    
    // Auth configuration
    AUTH: {
        TOKEN_EXPIRATION: '24h',
        BCRYPT_SALT_ROUNDS: 10
    },

    // Default avatars
    DEFAULT_AVATAR: null
};
