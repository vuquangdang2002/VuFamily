/**
 * SignalBus — In-memory pub/sub for WebRTC signaling via Server-Sent Events (SSE).
 *
 * Architecture:
 *  - Each connected client holds an open SSE connection (res object).
 *  - When a signal arrives for a user, it is pushed directly to their SSE stream.
 *  - No database polling for real-time delivery → sub-millisecond latency.
 *  - Signals are ALSO persisted to Supabase as a fallback for reconnect scenarios.
 *
 * Key features:
 *  - Zero polling, pure push model.
 *  - Heartbeat to prevent proxy timeouts.
 *  - Auto-cleanup on client disconnect.
 */

class SignalBus {
    constructor() {
        // Map<userId, Set<SSEConnection>>  — one user can have multiple tabs
        this._clients = new Map();
        // Heartbeat every 25 seconds to keep proxies alive
        this._heartbeatInterval = setInterval(() => this._heartbeat(), 25000);
    }

    /** Register an SSE response stream for a user. Returns unsubscribe fn. */
    subscribe(userId, res) {
        if (!this._clients.has(userId)) {
            this._clients.set(userId, new Set());
        }
        this._clients.get(userId).add(res);

        return () => {
            const set = this._clients.get(userId);
            if (set) {
                set.delete(res);
                if (set.size === 0) this._clients.delete(userId);
            }
        };
    }

    /** Push a JSON event to all SSE streams for a given userId. */
    publish(userId, event, data) {
        const set = this._clients.get(String(userId));
        if (!set || set.size === 0) return false; // user not online via SSE

        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        for (const res of set) {
            try { res.write(payload); } catch { /* client disconnected */ }
        }
        return true;
    }

    /** Returns whether the user has an active SSE connection. */
    isOnline(userId) {
        const set = this._clients.get(String(userId));
        return !!(set && set.size > 0);
    }

    _heartbeat() {
        const ping = ': ping\n\n';
        for (const [, set] of this._clients) {
            for (const res of set) {
                try { res.write(ping); } catch { /* skip dead streams */ }
            }
        }
    }

    destroy() {
        clearInterval(this._heartbeatInterval);
        this._clients.clear();
    }
}

// Singleton — shared across the whole Node.js process
module.exports = new SignalBus();
