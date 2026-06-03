// offlineCache.js - Lightweight IndexedDB Cache Service for VuFamily
// Implements asynchronous storage for encrypted data and raw recent caches.

const DB_NAME = 'vu_family_offline_db';
const DB_VERSION = 1;

/**
 * Open connections to local browser IndexedDB
 * @returns {Promise<IDBDatabase>} Opened database instance
 */
function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Object store for encrypted family tree data
            if (!db.objectStoreNames.contains('family_tree')) {
                db.createObjectStore('family_tree');
            }
            // Object store for recent newsfeed posts
            if (!db.objectStoreNames.contains('posts_cache')) {
                db.createObjectStore('posts_cache');
            }
            // Object store for recent chat messages by room
            if (!db.objectStoreNames.contains('chat_cache')) {
                db.createObjectStore('chat_cache');
            }
        };
        
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export const offlineCache = {
    /**
     * Saves the encrypted family tree buffer to IndexedDB
     * @param {ArrayBuffer} encryptedBuffer - Secured family tree bytes
     */
    saveFamilyTree: async (encryptedBuffer) => {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('family_tree', 'readwrite');
            const store = tx.objectStore('family_tree');
            const request = store.put(encryptedBuffer, 'master_tree');
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Retrieves the encrypted family tree buffer from IndexedDB
     * @returns {Promise<ArrayBuffer|null>} Secured family tree bytes or null
     */
    getFamilyTree: async () => {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('family_tree', 'readonly');
            const store = tx.objectStore('family_tree');
            const request = store.get('master_tree');
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Cache recent newsfeed posts (maximum 20 entries)
     * @param {Array} posts - Array of recent post objects
     */
    saveRecentPosts: async (posts) => {
        const db = await openDb();
        const limitedPosts = posts.slice(0, 20); // Keep only 20 most recent posts
        return new Promise((resolve, reject) => {
            const tx = db.transaction('posts_cache', 'readwrite');
            const store = tx.objectStore('posts_cache');
            const request = store.put(limitedPosts, 'recent_posts');
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Retrieve cached newsfeed posts
     * @returns {Promise<Array>} Cached post objects
     */
    getRecentPosts: async () => {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('posts_cache', 'readonly');
            const store = tx.objectStore('posts_cache');
            const request = store.get('recent_posts');
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Cache recent chat messages for a specific room (maximum 20 messages)
     * @param {string|number} roomId - Target chat room ID
     * @param {Array} messages - Array of recent message objects
     */
    saveRecentMessages: async (roomId, messages) => {
        const db = await openDb();
        const limitedMessages = messages.slice(-20); // Keep only 20 most recent messages
        return new Promise((resolve, reject) => {
            const tx = db.transaction('chat_cache', 'readwrite');
            const store = tx.objectStore('chat_cache');
            const request = store.put(limitedMessages, String(roomId));
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Retrieve cached chat messages for a specific room
     * @param {string|number} roomId - Target chat room ID
     * @returns {Promise<Array>} Cached message objects
     */
    getRecentMessages: async (roomId) => {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('chat_cache', 'readonly');
            const store = tx.objectStore('chat_cache');
            const request = store.get(String(roomId));
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },
    
    /**
     * Wipe all cached offline databases
     */
    clearAll: async () => {
        const db = await openDb();
        const stores = ['family_tree', 'posts_cache', 'chat_cache'];
        const tx = db.transaction(stores, 'readwrite');
        stores.forEach(s => tx.objectStore(s).clear());
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve(true);
        });
    }
};
