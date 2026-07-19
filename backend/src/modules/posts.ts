import { Hono } from 'hono';
import { getDb } from '../db/client';
import { posts, comments, reactions, users } from '../db/schema';
import { eq, inArray, and, desc } from 'drizzle-orm';
import { Env } from '../index';
import { authenticate, requireAdmin } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

export const postRouter = new Hono<{ Bindings: Env }>();

// GET /api/posts
postRouter.get('/', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const postsData = await db.select({
      id: posts.id,
      content: posts.content,
      userId: posts.userId,
      createdAt: posts.createdAt,
      authorName: users.displayName,
      authorRole: users.role,
      authorAvatar: users.avatar
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .orderBy(desc(posts.createdAt));

    if (postsData.length === 0) {
      return successResponse(c, []);
    }

    const postIds = postsData.map(p => p.id);
    const reactionsData = await db.select().from(reactions).where(inArray(reactions.postId, postIds));
    const commentsData = await db.select({ postId: comments.postId }).from(comments).where(inArray(comments.postId, postIds));

    const reactionsByPost: Record<number, any[]> = {};
    reactionsData.forEach(r => {
      if (!reactionsByPost[r.postId]) reactionsByPost[r.postId] = [];
      reactionsByPost[r.postId].push(r);
    });

    const commentCountByPost: Record<number, number> = {};
    commentsData.forEach(cm => {
      commentCountByPost[cm.postId] = (commentCountByPost[cm.postId] || 0) + 1;
    });

    const enriched = postsData.map(post => {
      const postReactions = reactionsByPost[post.id] || [];
      const reactionSummary: Record<string, { count: number, users: number[] }> = {};
      
      postReactions.forEach(r => {
        if (!reactionSummary[r.emoji]) reactionSummary[r.emoji] = { count: 0, users: [] };
        reactionSummary[r.emoji].count++;
        reactionSummary[r.emoji].users.push(r.userId);
      });

      return {
        ...post,
        reactions: reactionSummary,
        comment_count: commentCountByPost[post.id] || 0
      };
    });

    return successResponse(c, enriched);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/posts
postRouter.post('/', authenticate, async (c) => {
  try {
    const { content } = await c.req.json();
    if (!content || !content.trim()) return errorResponse(c, 'Nội dung không được trống', 400);

    const currentUser = c.get('user');
    const db = getDb(c.env.DB);
    const [newPost] = await db.insert(posts).values({
      content: content.trim(),
      userId: currentUser.id,
    }).returning();

    const postWithAuthor = {
      ...newPost,
      authorName: currentUser.displayName || currentUser.username,
      authorRole: currentUser.role,
      authorAvatar: currentUser.avatar,
      reactions: {},
      comment_count: 0
    };

    return successResponse(c, postWithAuthor, 'Đã đăng bài viết', 201);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// DELETE /api/posts/:id
postRouter.delete('/:id', authenticate, requireAdmin, async (c) => {
  try {
    const postId = parseInt(c.req.param('id') as string);
    const db = getDb(c.env.DB);
    await db.delete(posts).where(eq(posts.id, postId));
    return successResponse(c, null, 'Đã xóa bài đăng');
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// GET /api/posts/:id/comments
postRouter.get('/:id/comments', async (c) => {
  try {
    const postId = parseInt(c.req.param('id') as string);
    const db = getDb(c.env.DB);
    
    const data = await db.select({
      id: comments.id,
      content: comments.content,
      postId: comments.postId,
      userId: comments.userId,
      createdAt: comments.createdAt,
      authorName: users.displayName,
      authorRole: users.role,
      authorAvatar: users.avatar
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(comments.createdAt);

    return successResponse(c, data);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/posts/:id/comments
postRouter.post('/:id/comments', authenticate, async (c) => {
  try {
    const postId = parseInt(c.req.param('id') as string);
    const { content } = await c.req.json();
    if (!content || !content.trim()) return errorResponse(c, 'Nội dung không được trống', 400);

    const currentUser = c.get('user');
    const db = getDb(c.env.DB);
    
    const [newComment] = await db.insert(comments).values({
      postId,
      content: content.trim(),
      userId: currentUser.id,
    }).returning();

    const commentWithAuthor = {
      ...newComment,
      authorName: currentUser.displayName || currentUser.username,
      authorRole: currentUser.role,
      authorAvatar: currentUser.avatar
    };

    return successResponse(c, commentWithAuthor, 'Đã thêm bình luận', 201);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/posts/:id/reactions
postRouter.post('/:id/reactions', authenticate, async (c) => {
  try {
    const postId = parseInt(c.req.param('id') as string);
    const { emoji } = await c.req.json();
    const currentUser = c.get('user');
    const db = getDb(c.env.DB);

    const [existing] = await db.select().from(reactions).where(
      and(eq(reactions.postId, postId), eq(reactions.userId, currentUser.id), eq(reactions.emoji, emoji))
    );

    if (existing) {
      await db.delete(reactions).where(eq(reactions.id, existing.id));
    } else {
      await db.insert(reactions).values({
        postId,
        userId: currentUser.id,
        emoji,
      });
    }

    const allReactions = await db.select().from(reactions).where(eq(reactions.postId, postId));
    const reactionSummary: Record<string, { count: number, users: number[] }> = {};
    
    allReactions.forEach(r => {
      if (!reactionSummary[r.emoji]) reactionSummary[r.emoji] = { count: 0, users: [] };
      reactionSummary[r.emoji].count++;
      reactionSummary[r.emoji].users.push(r.userId);
    });

    return successResponse(c, reactionSummary);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

export const commentRouter = new Hono<{ Bindings: Env }>();

commentRouter.delete('/:id', authenticate, requireAdmin, async (c) => {
  try {
    const commentId = parseInt(c.req.param('id') as string);
    const db = getDb(c.env.DB);
    await db.delete(comments).where(eq(comments.id, commentId));
    return successResponse(c, null, 'Đã xóa bình luận');
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});
