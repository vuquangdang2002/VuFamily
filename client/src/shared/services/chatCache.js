/**
 * ChatCache — Messenger-style IndexedDB cache for chat history
 * 
 * Stores rooms and messages locally for instant load + offline access.
 * Caches the 10 most recent conversations and their messages.
 */

const DB_NAME = 'vuFamilyChatDB';
const DB_VERSION = 1;
const MAX_CACHED_ROOMS = 10;
const MESSAGES_PER_ROOM = 50;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Store: rooms — cached chat rooms
            if (!db.objectStoreNames.contains('rooms')) {
                const roomStore = db.createObjectStore('rooms', { keyPath: 'id' });
                roomStore.createIndex('updated_at', 'updated_at', { unique: false });
            }

            // Store: messages — cached messages
            if (!db.objectStoreNames.contains('messages')) {
                const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
                msgStore.createIndex('room_id', 'room_id', { unique: false });
                msgStore.createIndex('created_at', 'created_at', { unique: false });
                msgStore.createIndex('room_created', ['room_id', 'created_at'], { unique: false });
            }

            // Store: meta — sync timestamps, etc.
            if (!db.objectStoreNames.contains('meta')) {
                db.createObjectStore('meta', { keyPath: 'key' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ──────────────── ROOMS ────────────────

/**
 * Save rooms to cache. Keeps only the latest MAX_CACHED_ROOMS.
 */
export async function cacheRooms(rooms) {
    try {
        const db = await openDB();
        const tx = db.transaction('rooms', 'readwrite');
        const store = tx.objectStore('rooms');

        // Write all incoming rooms
        for (const room of rooms) {
            await new Promise((resolve, reject) => {
                const req = store.put({
                    ...room,
                    _cachedAt: Date.now()
                });
                req.onsuccess = resolve;
                req.onerror = () => reject(req.error);
            });
        }

        // Prune: keep only MAX_CACHED_ROOMS newest
        const allRooms = await new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (allRooms.length > MAX_CACHED_ROOMS) {
            // Sort by updated_at descending
            allRooms.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            const toRemove = allRooms.slice(MAX_CACHED_ROOMS);
            for (const room of toRemove) {
                store.delete(room.id);
                // Also clear messages for pruned rooms
                await clearMessagesForRoom(db, room.id);
            }
        }

        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });

        db.close();
    } catch (e) {
        console.warn('[ChatCache] cacheRooms error:', e);
    }
}

/**
 * Get cached rooms, sorted by updated_at descending.
 */
export async function getCachedRooms() {
    try {
        const db = await openDB();
        const tx = db.transaction('rooms', 'readonly');
        const store = tx.objectStore('rooms');

        const rooms = await new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        db.close();

        // Sort by updated_at descending (newest first)
        rooms.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        return rooms;
    } catch (e) {
        console.warn('[ChatCache] getCachedRooms error:', e);
        return [];
    }
}

// ──────────────── MESSAGES ────────────────

/**
 * Cache messages for a specific room.
 * Merges with existing cache, keeps latest MESSAGES_PER_ROOM per room.
 */
export async function cacheMessages(roomId, messages) {
    try {
        const db = await openDB();
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');

        // Write all messages
        for (const msg of messages) {
            await new Promise((resolve, reject) => {
                const req = store.put({
                    ...msg,
                    room_id: roomId,
                    _cachedAt: Date.now()
                });
                req.onsuccess = resolve;
                req.onerror = () => reject(req.error);
            });
        }

        // Prune: keep only MESSAGES_PER_ROOM newest per room
        const index = store.index('room_id');
        const roomMessages = await new Promise((resolve, reject) => {
            const req = index.getAll(roomId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (roomMessages.length > MESSAGES_PER_ROOM) {
            roomMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const toRemove = roomMessages.slice(MESSAGES_PER_ROOM);
            for (const msg of toRemove) {
                store.delete(msg.id);
            }
        }

        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });

        db.close();
    } catch (e) {
        console.warn('[ChatCache] cacheMessages error:', e);
    }
}

/**
 * Get cached messages for a room, sorted by created_at ascending.
 */
export async function getCachedMessages(roomId) {
    try {
        const db = await openDB();
        const tx = db.transaction('messages', 'readonly');
        const store = tx.objectStore('messages');
        const index = store.index('room_id');

        const messages = await new Promise((resolve, reject) => {
            const req = index.getAll(roomId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        db.close();

        // Sort ascending (oldest first) for display
        messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        return messages;
    } catch (e) {
        console.warn('[ChatCache] getCachedMessages error:', e);
        return [];
    }
}

/**
 * Get the latest message timestamp for a room (for incremental fetch).
 */
export async function getLatestMessageTime(roomId) {
    try {
        const messages = await getCachedMessages(roomId);
        if (messages.length === 0) return null;
        return messages[messages.length - 1].created_at;
    } catch (e) {
        return null;
    }
}

/**
 * Add a single message to cache (optimistic send).
 */
export async function cacheSingleMessage(roomId, message) {
    try {
        const db = await openDB();
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');

        await new Promise((resolve, reject) => {
            const req = store.put({
                ...message,
                room_id: roomId,
                _cachedAt: Date.now()
            });
            req.onsuccess = resolve;
            req.onerror = () => reject(req.error);
        });

        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });

        db.close();
    } catch (e) {
        console.warn('[ChatCache] cacheSingleMessage error:', e);
    }
}

// ──────────────── META ────────────────

/**
 * Save a sync timestamp for rooms list.
 */
export async function setLastRoomsSync(timestamp) {
    try {
        const db = await openDB();
        const tx = db.transaction('meta', 'readwrite');
        const store = tx.objectStore('meta');
        store.put({ key: 'lastRoomsSync', value: timestamp });
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    } catch (e) {
        console.warn('[ChatCache] setLastRoomsSync error:', e);
    }
}

export async function getLastRoomsSync() {
    try {
        const db = await openDB();
        const tx = db.transaction('meta', 'readonly');
        const store = tx.objectStore('meta');
        const result = await new Promise((resolve, reject) => {
            const req = store.get('lastRoomsSync');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        db.close();
        return result?.value || null;
    } catch (e) {
        return null;
    }
}

// ──────────────── CLEANUP ────────────────

/**
 * Clear all messages for a specific room.
 */
async function clearMessagesForRoom(db, roomId) {
    try {
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');
        const index = store.index('room_id');

        const messages = await new Promise((resolve, reject) => {
            const req = index.getAll(roomId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        for (const msg of messages) {
            store.delete(msg.id);
        }

        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.warn('[ChatCache] clearMessagesForRoom error:', e);
    }
}

/**
 * Clear entire cache (for logout).
 */
export async function clearAllCache() {
    try {
        const db = await openDB();
        const tx = db.transaction(['rooms', 'messages', 'meta'], 'readwrite');
        tx.objectStore('rooms').clear();
        tx.objectStore('messages').clear();
        tx.objectStore('meta').clear();
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    } catch (e) {
        console.warn('[ChatCache] clearAllCache error:', e);
    }
}
