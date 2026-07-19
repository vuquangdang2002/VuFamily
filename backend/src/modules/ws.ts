import type { Context } from 'hono';

interface AuthenticatedSocket {
  socket: WebSocket;
  userId?: number;
  username?: string;
}

export const activeSockets = new Set<AuthenticatedSocket>();

export function broadcast(data: any, excludeSocket?: WebSocket) {
  const payload = JSON.stringify(data);
  for (const client of activeSockets) {
    if (client.socket === excludeSocket) continue;
    try {
      client.socket.send(payload);
    } catch (e) {
      console.error('WS Broadcast failed for socket, removing client:', e);
      activeSockets.delete(client);
    }
  }
}

export function sendToUser(userId: number, data: any) {
  const payload = JSON.stringify(data);
  for (const client of activeSockets) {
    if (client.userId === userId) {
      try {
        client.socket.send(payload);
      } catch (e) {
        console.error(`WS Send failed for user ${userId}, removing client:`, e);
        activeSockets.delete(client);
      }
    }
  }
}

export async function handleWebSocketUpgrade(c: Context) {
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return c.text('Expected Upgrade: websocket', { status: 426 });
  }

  // @ts-ignore
  const [client, server] = new WebSocketPair();
  
  // Accept the connection on the server side
  server.accept();

  const authSocket: AuthenticatedSocket = { socket: server };
  activeSockets.add(authSocket);

  server.addEventListener('message', async (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data.toString());
      
      // Handshake / Authentication
      if (data.type === 'auth') {
        const token = data.token;
        if (token) {
          // Verify token against database or environment (simplified mock check for demo)
          authSocket.userId = Number(data.userId) || 1;
          authSocket.username = data.username || 'user';
          // Confirm connection
          server.send(JSON.stringify({ type: 'auth_success' }));
        }
      }
      
      // Heartbeat ping
      if (data.type === 'ping') {
        server.send(JSON.stringify({ type: 'pong' }));
      }

      // Chat Message Forwarding
      if (data.type === 'chat_message') {
        broadcast({
          type: 'chat_message',
          roomId: data.roomId,
          message: data.message
        }, server);
      }

      // WebRTC Signaling Forwarding (Targeted)
      if (['webrtc_offer', 'webrtc_answer', 'webrtc_ice_candidate'].includes(data.type)) {
        if (data.targetUserId) {
          // Attach senderId so the receiver knows who sent the signal
          data.senderId = authSocket.userId;
          sendToUser(Number(data.targetUserId), data);
        }
      }
    } catch (e) {
      console.error('WS message processing error:', e);
    }
  });

  server.addEventListener('close', () => {
    activeSockets.delete(authSocket);
  });

  server.addEventListener('error', () => {
    activeSockets.delete(authSocket);
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  } as any);
}
