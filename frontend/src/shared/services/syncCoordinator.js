import { myLog, myError } from '../utils/logger';
import { socketClient } from './socketClient';

class SyncCoordinator {
  constructor() {
    this.listeners = {
      calls: new Set(),
      rooms: new Set(),
      messages: new Set()
    };
    this.intervalId = null;
    this.isTabActive = true;
    this.isUserActive = true;
    this.lastActivityTime = Date.now();
    this.activeRoomId = null;
    this.tickCount = 0;
    this.inFlightFetches = new Set();
    this.idleTimeoutMs = 3 * 60 * 1000; // 3 minutes idle time
    this.latestMsgTimeMap = new Map();
    this.authInvalid = false; // Flag to stop all polling when token is invalid

    if (typeof window !== 'undefined') {
      this.initActivityTrackers();
      this.initSocketSubscriber();
    }
  }

  initSocketSubscriber() {
    socketClient.subscribe((msg) => {
      if (msg.type === 'connection_status') {
        myLog('SYNC', `WebSocket status update: ${msg.connected ? 'Connected' : 'Disconnected'}`);
        this.adjustSyncCycle();
      }

      if (msg.type === 'chat_message') {
        const { roomId } = msg;
        if (String(this.activeRoomId) === String(roomId)) {
          myLog('SYNC', `Received instant WS message for active room ${roomId}. Refreshing.`);
          this.triggerImmediateSync('messages');
        }
        this.triggerImmediateSync('rooms');
      }

      if (msg.type === 'calls_updated' || msg.type === 'call_signaling') {
        myLog('SYNC', 'Received instant WS call update. Refreshing.');
        this.triggerImmediateSync('calls');
      }
    });
  }

  setLatestMsgTime(roomId, time) {
    if (!roomId) return;
    this.latestMsgTimeMap.set(roomId, time);
  }

  initActivityTrackers() {
    // Keep connection based on tab visibility
    document.addEventListener('visibilitychange', () => {
      this.isTabActive = !document.hidden;
      myLog('SYNC', `Tab visibility changed: ${this.isTabActive ? 'Active' : 'Hidden'}`);
      this.adjustSyncCycle();
    });

    // Detect user interactions to mark activity state
    const resetActivity = () => {
      const now = Date.now();
      if (!this.isUserActive) {
        this.isUserActive = true;
        myLog('SYNC', 'User returned from idle state. Resuming synchronization.');
        this.adjustSyncCycle();
      }
      this.lastActivityTime = now;
    };

    window.addEventListener('mousemove', resetActivity, { passive: true });
    window.addEventListener('keydown', resetActivity, { passive: true });
    window.addEventListener('click', resetActivity, { passive: true });
    window.addEventListener('scroll', resetActivity, { passive: true });

    // Idle checking cycle
    setInterval(() => {
      if (this.isUserActive && Date.now() - this.lastActivityTime > this.idleTimeoutMs) {
        this.isUserActive = false;
        myLog('SYNC', 'User is idle. Slowing down synchronization cycles.');
        this.adjustSyncCycle();
      }
    }, 15000);
  }

  setActiveRoomId(roomId) {
    this.activeRoomId = roomId;
    // Trigger immediate fetch for messages when switching rooms
    if (roomId) {
      this.triggerImmediateSync('messages');
    }
  }

  subscribe(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].add(callback);
    }
    // Start interval if it's not running
    this.startSyncLoop();

    return () => {
      if (this.listeners[event]) {
        this.listeners[event].delete(callback);
      }
      // Stop loop if no listeners
      if (this.getTotalListeners() === 0) {
        this.stopSyncLoop();
      }
    };
  }

  getTotalListeners() {
    return (
      this.listeners.calls.size +
      this.listeners.rooms.size +
      this.listeners.messages.size
    );
  }

  startSyncLoop() {
    if (this.intervalId) return;
    myLog('SYNC', 'Initializing unified synchronization loop.');
    this.adjustSyncCycle();
  }

  stopSyncLoop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      myLog('SYNC', 'Stopped synchronization loop (no active listeners).');
    }
  }

  adjustSyncCycle() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Determine polling cycle based on activity status
    let baseInterval = 600; // Fast sync in millisecond steps

    if (socketClient.isConnected) {
      baseInterval = 3000; // If WebSocket is connected, poll at a relaxed 3s rate as a safe fallback
    } else if (!this.isTabActive) {
      baseInterval = 10000; // Slow down to 10s if tab is backgrounded
    } else if (!this.isUserActive) {
      baseInterval = 5000;  // Slow down to 5s if user is idle
    }

    myLog('SYNC', `Set unified sync interval to ${baseInterval}ms (WebSocket: ${socketClient.isConnected ? 'Active' : 'Offline'})`);
    this.intervalId = setInterval(() => this.tick(), baseInterval);
    // Execute immediate tick to be highly responsive
    this.tick();
  }

  async tick() {
    this.tickCount++;

    // Auto-connect socket if offline but we have a token
    if (typeof window !== 'undefined' && !socketClient.isConnected) {
      const token = localStorage.getItem('vuFamilyToken');
      if (token) {
        socketClient.connect();
      }
    }

    // 1. calls: fetch call signaling status every tick (~600ms - 800ms)
    if (this.authInvalid) return; // Stop all fetches if token is invalid

    if (this.listeners.calls.size > 0 && this.shouldFetch('calls', 1)) {
      this.fetchCalls();
    }

    // 2. messages: fetch active room incremental updates every tick (~600ms)
    if (this.listeners.messages.size > 0 && this.activeRoomId && this.shouldFetch('messages', 1)) {
      this.fetchMessages();
    }

    // 3. rooms: fetch room list updates every 5 ticks (~3000ms)
    if (this.listeners.rooms.size > 0 && this.shouldFetch('rooms', 5)) {
      this.fetchRooms();
    }
  }

  shouldFetch(type, frequencyTicks) {
    if (this.inFlightFetches.has(type)) return false; // rate limiting / duplicate protection (Chia)
    return this.tickCount % frequencyTicks === 0;
  }

  triggerImmediateSync(type) {
    if (type === 'messages' && this.activeRoomId) {
      this.fetchMessages();
    } else if (type === 'rooms') {
      this.fetchRooms();
    } else if (type === 'calls') {
      this.fetchCalls();
    }
  }

  async fetchCalls() {
    this.inFlightFetches.add('calls');
    try {
      const token = localStorage.getItem('vuFamilyToken');
      if (!token) return;

      const res = await fetch('/api/calls/active', {
        headers: { 'x-auth-token': token }
      });
      if (res.status === 401 || res.status === 403) {
        this.handleUnauthorized();
        return;
      }
      const json = await res.json();
      if (json.success) {
        this.listeners.calls.forEach(cb => cb(json.data));
      }
    } catch (e) {
      myError('SYNC', 'Error fetching active calls:', e);
    } finally {
      this.inFlightFetches.delete('calls');
    }
  }

  async fetchRooms() {
    this.inFlightFetches.add('rooms');
    try {
      const token = localStorage.getItem('vuFamilyToken');
      if (!token) return;

      const res = await fetch('/api/chats', {
        headers: { 'x-auth-token': token }
      });
      if (res.status === 401 || res.status === 403) {
        this.handleUnauthorized();
        return;
      }
      const json = await res.json();
      if (json.success) {
        this.listeners.rooms.forEach(cb => cb(json.data));
      }
    } catch (e) {
      myError('SYNC', 'Error fetching chat rooms:', e);
    } finally {
      this.inFlightFetches.delete('rooms');
    }
  }

  async fetchMessages() {
    const roomId = this.activeRoomId;
    if (!roomId) return;

    this.inFlightFetches.add('messages');
    try {
      const token = localStorage.getItem('vuFamilyToken');
      if (!token) return;

      const since = this.latestMsgTimeMap.get(roomId) || '';
      const url = since 
        ? `/api/chats/${roomId}/messages?since=${encodeURIComponent(since)}`
        : `/api/chats/${roomId}/messages`;

      const res = await fetch(url, {
        headers: { 'x-auth-token': token }
      });
      if (res.status === 401 || res.status === 403) {
        this.handleUnauthorized();
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        this.listeners.messages.forEach(cb => cb(roomId, json.data));
      }
    } catch (e) {
      myError('SYNC', `Error fetching messages for room ${roomId}:`, e);
    } finally {
      this.inFlightFetches.delete('messages');
    }
  }

  handleUnauthorized() {
    if (this.authInvalid) return; // Already handled
    this.authInvalid = true;
    myError('SYNC', 'Token invalid (401). Stopping all sync polling and clearing session.');
    this.stop();
    socketClient.disconnect();
    localStorage.removeItem('vuFamilyToken');
    localStorage.removeItem('vuFamilyAuth');
    // Reload page to force re-login
    window.location.reload();
  }
}

export const syncCoordinator = new SyncCoordinator();
