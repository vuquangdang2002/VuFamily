import { Hono } from 'hono';
import { getDb } from '../db/client';
import { chatRooms, chatMembers, chatMessages, users } from '../db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { Env } from '../index';
import { authenticate } from '../middleware/auth';
import { encryptText, decryptText } from '../utils/crypto';

export const chatRouter = new Hono<{ Bindings: Env }>();

// Helper for crypto logic
const tryEncrypt = (text: string, env: Env) => encryptText(text, env);
const tryDecrypt = (text: string, env: Env) => decryptText(text, env);

// GET /api/chats
chatRouter.get('/', authenticate, async (c) => {
  try {
    const currentUser = c.get('user');
    const db = getDb(c.env.DB);
    
    // Find all room IDs user is a member of
    const myMemberships = await db.select({ roomId: chatMembers.roomId })
      .from(chatMembers).where(eq(chatMembers.userId, currentUser.id));
    
    if (myMemberships.length === 0) return c.json({ success: true, data: [] });
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

    return c.json({ success: true, data: enrichedRooms });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/chats
chatRouter.post('/', authenticate, async (c) => {
  try {
    const currentUser = c.get('user');
    const { type, name, participantIds } = await c.req.json();

    if (!participantIds || participantIds.length === 0) {
      return c.json({ success: false, error: 'Phải chọn ít nhất 1 người để chat' }, 400);
    }

    const isGroup = type === 'group' || participantIds.length > 1;
    const actualType = isGroup ? 'group' : 'direct';
    const db = getDb(c.env.DB);

    if (actualType === 'direct') {
      const targetId = participantIds[0];
      // Check existing direct room
      const existingRooms = await db.select({ roomId: chatMembers.roomId })
        .from(chatMembers)
        .where(inArray(chatMembers.userId, [currentUser.id, targetId]))
        .groupBy(chatMembers.roomId)
        .having(sql`COUNT(DISTINCT ${chatMembers.userId}) = 2`);
      
      if (existingRooms.length > 0) {
        // Also check if type is actually direct
        for (const row of existingRooms) {
          const [room] = await db.select().from(chatRooms).where(and(eq(chatRooms.id, row.roomId), eq(chatRooms.type, 'direct')));
          if (room) {
            return c.json({ success: true, data: { id: room.id } });
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

    return c.json({ 
      success: true, 
      data: { 
        ...newRoom, 
        display_name, 
        inviteCode, 
        allowAdd 
      } 
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
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
      return c.json({ success: false, error: 'Bạn không có quyền xem nhóm chat này' }, 403);
    }

    // A limit, usually fetched in chunks
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
    .limit(50); // Hardcode for now, can implement 'since' later

    // Update lastRead
    await db.update(chatMembers).set({ lastReadAt: new Date().toISOString() }).where(and(eq(chatMembers.roomId, roomId), eq(chatMembers.userId, currentUser.id)));

    // Reverse to chronological order and decrypt
    const decryptedMessages = data.reverse().map(m => ({
      ...m,
      content: tryDecrypt(m.content, c.env)
    }));

    return c.json({ success: true, data: decryptedMessages });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/chats/:id/messages
chatRouter.post('/:id/messages', authenticate, async (c) => {
  try {
    const roomId = parseInt(c.req.param('id') as string);
    const currentUser = c.get('user');
    const { content } = await c.req.json();
    
    if (!content || !content.trim()) return c.json({ success: false, error: 'Tin nhắn rỗng' }, 400);

    const db = getDb(c.env.DB);
    const [membership] = await db.select().from(chatMembers).where(and(eq(chatMembers.roomId, roomId), eq(chatMembers.userId, currentUser.id)));
    if (!membership) return c.json({ success: false, error: 'Bạn không có quyền gửi tin' }, 403);

    const encrypted = tryEncrypt(content.trim(), c.env);
    
    const [newMessage] = await db.insert(chatMessages).values({
      roomId,
      senderId: currentUser.id,
      content: encrypted
    }).returning();

    await db.update(chatRooms).set({ updatedAt: new Date().toISOString() }).where(eq(chatRooms.id, roomId));

    return c.json({ success: true, data: {
      ...newMessage,
      content: content.trim(),
      displayName: currentUser.displayName,
      username: currentUser.username,
      avatar: currentUser.avatar
    } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export const callRouter = new Hono<{ Bindings: Env }>();
// We leave calls unimplemented for now until DO WebRTC implementation,
// or we can stub them out so that requests don't fail immediately.
callRouter.all('*', (c) => c.json({ success: false, error: 'WebRTC calls are temporarily unavailable during migration.' }, 503));
