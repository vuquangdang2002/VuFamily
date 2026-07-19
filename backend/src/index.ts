import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { D1Database } from '@cloudflare/workers-types';
import { authRouter } from './modules/auth';
import { userRouter } from './modules/users';
import { memberRouter, statsRouter, achievementRouter } from './modules/members';
import { postRouter, commentRouter } from './modules/posts';
import { eventRouter } from './modules/events';
import { financeRouter } from './modules/finance';
import { chatRouter, callRouter } from './modules/chat';
import { requestRouter } from './modules/requests';

export type Env = {
  DB: D1Database;
  CHAT_ENCRYPTION_KEY?: string;
};

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', cors({
  origin: '*',
  credentials: true,
}));
app.use('*', logger());

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'vufamily-hono-api',
    ts: new Date().toISOString()
  });
});

app.route('/api/auth', authRouter);
app.route('/api/users', userRouter);
app.route('/api/members', memberRouter);
app.route('/api/stats', statsRouter);
app.route('/api/achievements', achievementRouter);
app.route('/api/posts', postRouter);
app.route('/api/comments', commentRouter);
app.route('/api/events', eventRouter);
app.route('/api/finance', financeRouter);
app.route('/api/chats', chatRouter);
app.route('/api/calls', callRouter);
app.route('/api/requests', requestRouter);

export default app;
