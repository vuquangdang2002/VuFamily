import { Hono } from 'hono';
import { getDb } from '../db/client';
import { chatRooms, chatMembers, chatMessages, users } from '../db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { Env } from '../index';
import { authenticate } from '../middleware/auth';
import { encryptText, decryptText } from '../utils/crypto';
import { successResponse, errorResponse } from '../utils/response';
import { broadcast } from './ws';

export const chatRouter = new Hono<{ Bindings: Env }>();

const tryEncrypt = (text: string, env: Env) => encryptText(text, env);
const tryDecrypt = (text: string, env: Env) => decryptText(text, env);

// GET /api/chats
chatRouter.get('/', authenticate, async (c) => {
  try {
    const currentUser = c.get('user');
    const db = getDb(c.env.DB);
    
    const myMemberships = await db.select({ roomId: chatMembers.roomId })
      .from(chatMembers).where(eq(chatMembers.userId, currentUser.id));
    
    if (myMemberships.length === 0) return successResponse(c, []);
    const roomIds = myMemberships.map(m => m.roomId);

    const rooms = await db.select().from(chatRooms).where(inArray(chatRooms.id, roomIds)).orderBy(desc(chatRooms.updatedAt));
    const allMembers = await db.select({
      roomId: chatMembers.roomId,
      userId: chatMembers.userId,
      role: chatMembers.role,
      joinedAt: chatMembers.joinedAt,
      displayName: users.displayName,
      username: users.username,
      avatar: users.avatar,
      isOnline: users.isOnline,
      lastActive: users.lastActive
    })
    .from(chatMembers)
    .leftJoin(users, eq(chatMembers.userId, users.id))
    .where(inArray(chatMembers.roomId, roomIds));

    const enrichedRooms = rooms.map(room => {
      const rMembers = allMembers.filter(m => m.roomId === room.id);
      let displayName = room.name;
      let avatar = null;
      let isOnline = false;
      let inviteCode = '';
      let allowAdd = false;

      if (room.type === 'direct') {
        const other = rMembers.find(m => m.userId !== currentUser.id);
        if (other) {
          displayName = other.displayName || other.username;
          avatar = other.avatar;
          isOnline = !!other.isOnline && !!other.lastActive && (new Date().getTime() - new Date(other.lastActive).getTime()) < 5 * 60000;
        }
      } else if (room.type === 'group' && room.name && room.name.startsWith('{') && room.name.endsWith('}')) {
        try {
          const parsed = JSON.parse(room.name);
          displayName = parsed.n || 'Nhóm';
          inviteCode = parsed.ic || '';
          allowAdd = !!parsed.aa;
        } catch (e) {}
      }

      return {
        ...room,
        display_name: displayName,
        avatar,
        is_online: isOnline,
        inviteCode,
        allowAdd,
        members: rMembers
      };
    });

    return successResponse(c, enrichedRooms);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/chats
chatRouter.post('/', authenticate, async (c) => {
  try {
    const currentUser = c.get('user');
    const { type, name, participantIds } = await c.req.json();

    if (!participantIds || participantIds.length === 0) {
      return errorResponse(c, 'Phải chọn ít nhất 1 người để chat', 400);
    }

    const isGroup = type === 'group' || participantIds.length > 1;
    const actualType = isGroup ? 'group' : 'direct';
    const db = getDb(c.env.DB);

    if (actualType === 'direct') {
      const targetId = participantIds[0];
      const existingRooms = await db.select({ roomId: chatMembers.roomId })
        .from(chatMembers)
        .where(inArray(chatMembers.userId, [currentUser.id, targetId]))
        .groupBy(chatMembers.roomId)
        .having(sql`COUNT(DISTINCT ${chatMembers.userId}) = 2`);
      
      if (existingRooms.length > 0) {
        for (const row of existingRooms) {
          const [room] = await db.select().from(chatRooms).where(and(eq(chatRooms.id, row.roomId), eq(chatRooms.type, 'direct')));
          if (room) {
            return successResponse(c, { id: room.id });
          }
        }
      }
    }

    let finalName = name;
    if (isGroup) {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      if (!finalName || !finalName.trim()) {
        const allMemberIds = [currentUser.id, ...participantIds];
        const usersInfo = await db.select().from(users).where(inArray(users.id, allMemberIds));
        const names = usersInfo.map(u => u.displayName || u.username);
        const generatedTitle = `Nhóm ${names.join(', ')}`.substring(0, 80);
        finalName = JSON.stringify({ n: generatedTitle, ic: inviteCode, aa: false });
      } else {
        finalName = JSON.stringify({ n: finalName.trim(), ic: inviteCode, aa: false });
      }
    }

    const [newRoom] = await db.insert(chatRooms).values({
      type: actualType,
      name: finalName
    }).returning();

    const allMemberIds = [currentUser.id, ...participantIds];
    const memberData = allMemberIds.map(id => ({
      roomId: newRoom.id,
      userId: id,
      role: id === currentUser.id && isGroup ? 'admin' : 'member'
    }));

    await db.insert(chatMembers).values(memberData);

    let display_name = newRoom.name;
    let inviteCode = '';
    let allowAdd = false;

    if (newRoom.type === 'group' && newRoom.name && newRoom.name.startsWith('{') && newRoom.name.endsWith('}')) {
      try {
        const parsed = JSON.parse(newRoom.name);
        display_name = parsed.n || 'Nhóm';
        inviteCode = parsed.ic || '';
        allowAdd = !!parsed.aa;
      } catch (e) {}
    }

    return successResponse(c, {
      ...newRoom,
      display_name,
      inviteCode,
      allowAdd
    });
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// GET /api/chats/:id/messages
chatRouter.get('/:id/messages', authenticate, async (c) => {
  try {
    const roomId = parseInt(c.req.param('id') as string);
    const currentUser = c.get('user');
    const db = getDb(c.env.DB);

    const [membership] = await db.select().from(chatMembers).where(and(eq(chatMembers.roomId, roomId), eq(chatMembers.userId, currentUser.id)));
    if (!membership) {
      return errorResponse(c, 'Bạn không có quyền xem nhóm chat này', 403);
    }

    const data = await db.select({
      id: chatMessages.id,
      roomId: chatMessages.roomId,
      userId: chatMessages.senderId,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
      displayName: users.displayName,
      username: users.username,
      avatar: users.avatar
    })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.senderId, users.id))
    .where(eq(chatMessages.roomId, roomId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(50);

    await db.update(chatMembers).set({ lastReadAt: new Date().toISOString() }).where(and(eq(chatMembers.roomId, roomId), eq(chatMembers.userId, currentUser.id)));

    const decryptedMessages = data.reverse().map(m => ({
      id: m.id,
      room_id: m.roomId,
      sender_id: m.userId,
      content: tryDecrypt(m.content, c.env),
      created_at: m.createdAt,
      users: {
        display_name: m.displayName,
        username: m.username,
        avatar: m.avatar
      }
    }));

    return successResponse(c, decryptedMessages);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/chats/:id/messages
chatRouter.post('/:id/messages', authenticate, async (c) => {
  try {
    const roomId = parseInt(c.req.param('id') as string);
    const currentUser = c.get('user');
    const { content } = await c.req.json();
    
    if (!content || !content.trim()) return errorResponse(c, 'Tin nhắn rỗng', 400);

    const db = getDb(c.env.DB);
    const [membership] = await db.select().from(chatMembers).where(and(eq(chatMembers.roomId, roomId), eq(chatMembers.userId, currentUser.id)));
    if (!membership) return errorResponse(c, 'Bạn không có quyền gửi tin', 403);

    const encrypted = tryEncrypt(content.trim(), c.env);
    
    const [newMessage] = await db.insert(chatMessages).values({
      roomId,
      senderId: currentUser.id,
      content: encrypted
    }).returning();

    await db.update(chatRooms).set({ updatedAt: new Date().toISOString() }).where(eq(chatRooms.id, roomId));

    const msgData = {
      id: newMessage.id,
      room_id: newMessage.roomId,
      sender_id: newMessage.senderId,
      content: content.trim(),
      created_at: newMessage.createdAt,
      users: {
        display_name: currentUser.displayName,
        username: currentUser.username,
        avatar: currentUser.avatar
      }
    };

    broadcast({
      type: 'chat_message',
      roomId,
      message: msgData
    });

    return successResponse(c, msgData);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

interface CallSession {
  callId: string;
  roomId: number;
  callerId: number;
  callerName: string;
  callerAvatar: string | null;
  requestVideo: boolean;
  targetUserIds: number[];
  status: 'ringing' | 'accepted' | 'rejected' | 'ended';
  startedAt: number;
  signals: { caller: any[]; receiver: any[] };
}

const activeCallsMap = new Map<string, CallSession>();

export const callRouter = new Hono<{ Bindings: Env }>();

const cleanupCalls = () => {
  const now = Date.now();
  for (const [id, session] of activeCallsMap.entries()) {
    if (now - session.startedAt > 60000 || session.status === 'ended') {
      activeCallsMap.delete(id);
    }
  }
};

// POST /api/calls/start
callRouter.post('/start', authenticate, async (c) => {
  try {
    cleanupCalls();
    const currentUser = c.get('user');
    const { roomId, requestVideo } = await c.req.json();
    const db = getDb(c.env.DB);

    const members = await db.select({ userId: chatMembers.userId })
      .from(chatMembers)
      .where(eq(chatMembers.roomId, roomId));

    const targetUserIds = members.map(m => m.userId).filter(id => id !== currentUser.id);

    const callId = `call_${roomId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const session: CallSession = {
      callId,
      roomId,
      callerId: currentUser.id,
      callerName: currentUser.displayName || currentUser.username,
      callerAvatar: currentUser.avatar || null,
      requestVideo: !!requestVideo,
      targetUserIds,
      status: 'ringing',
      startedAt: Date.now(),
      signals: { caller: [], receiver: [] }
    };

    activeCallsMap.set(callId, session);
    broadcast({ type: 'calls_updated', session });

    return successResponse(c, session);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// GET /api/calls/active
callRouter.get('/active', authenticate, async (c) => {
  try {
    cleanupCalls();
    const currentUser = c.get('user');
    const now = Date.now();

    for (const session of activeCallsMap.values()) {
      if (session.status === 'ended') continue;
      const isCaller = session.callerId === currentUser.id;
      const isTarget = session.targetUserIds.includes(currentUser.id);

      if ((isCaller || isTarget) && (now - session.startedAt < 60000)) {
        return successResponse(c, session);
      }
    }

    return successResponse(c, null);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/calls/respond
callRouter.post('/respond', authenticate, async (c) => {
  try {
    cleanupCalls();
    const currentUser = c.get('user');
    const { callId, action } = await c.req.json();

    const session = activeCallsMap.get(callId);
    if (!session) {
      return errorResponse(c, 'Cuộc gọi đã kết thúc hoặc không tồn tại.', 404);
    }

    if (action === 'accept') {
      session.status = 'accepted';
    } else if (action === 'reject') {
      session.status = 'rejected';
    }

    broadcast({ type: 'calls_updated', session });

    return successResponse(c, session);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/calls/end
callRouter.post('/end', authenticate, async (c) => {
  try {
    const { callId } = await c.req.json();
    if (callId && activeCallsMap.has(callId)) {
      const session = activeCallsMap.get(callId);
      if (session) {
        session.status = 'ended';
        broadcast({ type: 'calls_updated', session });
      }
      activeCallsMap.delete(callId);
    }
    return successResponse(c, null, 'Cuộc gọi đã kết thúc');
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});
