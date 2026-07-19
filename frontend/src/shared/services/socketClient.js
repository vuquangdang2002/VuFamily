import { myLog, myError } from '../utils/logger';

class SocketClient {
  constructor() {
    this.socket = null;
    this.token = null;
    this.userId = null;
    this.username = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000;
    this.listeners = new Set();
    this.pingIntervalId = null;
    this.isConnected = false;
  }

  connect() {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        return;
      }
    }

    const token = localStorage.getItem('vuFamilyToken');
    if (!token) return;

    this.token = token;
    
    // Parse user details from stored session
    try {
      const storedAuth = JSON.parse(localStorage.getItem('vuFamilyAuth'));
      if (storedAuth) {
        this.userId = storedAuth.id;
        this.username = storedAuth.username;
      }
    } catch (e) {
      myError('SOCKET', 'Error parsing vuFamilyAuth from localStorage:', e);
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // Points to Vite dev server (e.g. localhost:5173) which proxies to 8787
    const wsUrl = `${protocol}//${host}/api/ws`;

    myLog('SOCKET', `Connecting to WebSocket server: ${wsUrl}`);
    
    try {
      this.socket = new WebSocket(wsUrl);
      this.initEvents();
    } catch (e) {
      myError('SOCKET', 'WebSocket initialization failed:', e);
      this.scheduleReconnect();
    }
  }

  initEvents() {
    this.socket.onopen = () => {
      myLog('SOCKET', 'WebSocket connection established. Sending auth handshake...');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Send authentication handshake packet
      this.send({
        type: 'auth',
        token: this.token,
        userId: this.userId,
        username: this.username
      });

      // Start ping heartbeat to keep Cloudflare Worker connection alive
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle heartbeat response
        if (message.type === 'pong') {
          return;
        }

        // Handle auth success status
        if (message.type === 'auth_success') {
          this.isConnected = true;
          this.listeners.forEach(cb => cb({ type: 'connection_status', connected: true }));
          return;
        }

        // Notify subscribers
        this.listeners.forEach(cb => cb(message));
      } catch (e) {
        myError('SOCKET', 'Error parsing incoming socket message:', e);
      }
    };

    this.socket.onclose = (event) => {
      this.isConnected = false;
      this.listeners.forEach(cb => cb({ type: 'connection_status', connected: false }));
      myLog('SOCKET', `WebSocket connection closed (code: ${event.code}). Reason: ${event.reason || 'None'}`);
      this.stopHeartbeat();
      this.scheduleReconnect();
    };

    this.socket.onerror = (error) => {
      myError('SOCKET', 'WebSocket error encountered:', error);
      this.socket.close();
    };
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingIntervalId = setInterval(() => {
      this.send({ type: 'ping' });
    }, 25000); // 25s ping interval
  }

  stopHeartbeat() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  scheduleReconnect() {
    const delay = Math.min(
      Math.pow(2, this.reconnectAttempts) * 1000 + Math.random() * 1000,
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;
    myLog('SOCKET', `Scheduling reconnect in ${Math.round(delay)}ms (Attempt #${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    // Connect immediately if not already connected
    this.connect();
    
    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0 && this.socket) {
        this.socket.close();
        this.socket = null;
      }
    };
  }

  disconnect() {
    this.listeners.clear();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.stopHeartbeat();
  }
}

export const socketClient = new SocketClient();
