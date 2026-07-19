import { Hono } from 'hono';
import { AccessToken } from 'livekit-server-sdk';
import { Env } from '../index';
import { authenticate } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

export const livekitRouter = new Hono<{ Bindings: Env }>();

livekitRouter.post('/token', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const roomName = body.roomName || `vufamily-room-${Date.now()}`;

    if (!c.env.LIVEKIT_API_KEY || !c.env.LIVEKIT_API_SECRET) {
      return errorResponse(c, 'Chưa cấu hình API Key cho LiveKit trên Server.', 500);
    }

    const participantName = user.displayName || user.username || `Thành viên ${user.id}`;

    // Create an access token for the user
    const at = new AccessToken(c.env.LIVEKIT_API_KEY, c.env.LIVEKIT_API_SECRET, {
      identity: user.id.toString(),
      name: participantName,
    });

    // Add permissions to join the specific room
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    // The token is valid for 2 hours
    const token = await at.toJwt();

    return successResponse(c, { token, url: c.env.LIVEKIT_URL });
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});
