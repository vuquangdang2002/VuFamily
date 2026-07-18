import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// 1. FAMILY METADATA
export const familyMeta = sqliteTable('family_meta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyName: text('family_name').default('Vũ'),
  description: text('description').default(''),
  originPlace: text('origin_place').default(''),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 2. MEMBERS
export const members = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  gender: integer('gender').default(1), // 0: female, 1: male
  birthDate: text('birth_date'),
  birthTime: text('birth_time'),
  deathDate: text('death_date'),
  deathDateLunar: text('death_date_lunar'),
  birthPlace: text('birth_place').default(''),
  deathPlace: text('death_place').default(''),
  occupation: text('occupation').default(''),
  phone: text('phone').default(''),
  email: text('email').default(''),
  address: text('address').default(''),
  note: text('note').default(''),
  photo: text('photo').default(''),
  birthOrder: integer('birth_order'),
  childType: text('child_type').default('biological'), // 'biological' | 'adopted'
  parentId: integer('parent_id'),
  spouseId: integer('spouse_id'),
  weddingDate: text('wedding_date'),
  generation: integer('generation').default(1),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// 3. ACHIEVEMENTS
export const achievements = sqliteTable('achievements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').notNull(),
  category: text('category').default('other'), // 'education', 'work', 'social', 'award', 'other'
  title: text('title').notNull(),
  organization: text('organization').default(''),
  startYear: integer('start_year'),
  endYear: integer('end_year'),
  description: text('description').default(''),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 4. EVENTS
export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id'),
  eventType: text('event_type').default('other'),
  eventDate: text('event_date'),
  title: text('title').notNull(),
  description: text('description').default(''),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 5. USERS (accounts)
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  displayName: text('display_name').default(''),
  email: text('email').default(''),
  phone: text('phone').default(''),
  avatar: text('avatar').default(''),
  role: text('role').default('viewer'), // 'admin' | 'editor' | 'viewer'
  status: text('status').default('active'), // 'active' | 'banned'
  lastActive: text('last_active'),
  isOnline: integer('is_online', { mode: 'boolean' }).default(false),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  verificationToken: text('verification_token'),
  token: text('token'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// 6. UPDATE REQUESTS
export const updateRequests = sqliteTable('update_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  memberId: integer('member_id').notNull(),
  changes: text('changes').notNull(),
  note: text('note').default(''),
  status: text('status').default('pending'), // 'pending' | 'approved' | 'rejected'
  reviewedBy: integer('reviewed_by'),
  reviewedAt: text('reviewed_at'),
  rejectReason: text('reject_reason').default(''),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 7. POSTS
export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  userId: integer('user_id').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 8. COMMENTS
export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull(),
  content: text('content').notNull(),
  userId: integer('user_id').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 9. REACTIONS
export const reactions = sqliteTable('reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull(),
  userId: integer('user_id').notNull(),
  emoji: text('emoji').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 10. CHAT ROOMS
export const chatRooms = sqliteTable('chat_rooms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').default(''),
  type: text('type').default('direct'), // 'direct' | 'group'
  createdBy: integer('created_by'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// 11. CHAT MEMBERS
export const chatMembers = sqliteTable('chat_members', {
  roomId: integer('room_id').notNull(),
  userId: integer('user_id').notNull(),
  role: text('role').default('member'), // 'admin' | 'member'
  lastReadAt: text('last_read_at').default(sql`CURRENT_TIMESTAMP`),
  joinedAt: text('joined_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.roomId, table.userId] }),
  };
});

// 12. CHAT MESSAGES
export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: integer('room_id').notNull(),
  senderId: integer('sender_id').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 13. CALLS
export const calls = sqliteTable('calls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: integer('room_id'),
  callerId: integer('caller_id'),
  status: text('status').default('calling'), // 'calling' | 'ongoing' | 'ended' | 'rejected' | 'missed'
  offer: text('offer'),
  answer: text('answer'),
  startedAt: text('started_at').default(sql`CURRENT_TIMESTAMP`),
  endedAt: text('ended_at'),
});

// 14. CALL ICE CANDIDATES
export const callIceCandidates = sqliteTable('call_ice_candidates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  callId: integer('call_id'),
  senderId: integer('sender_id'),
  toUserId: integer('to_user_id'),
  candidate: text('candidate').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 15. CALL SIGNALS
export const callSignals = sqliteTable('call_signals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  callId: integer('call_id'),
  fromUserId: integer('from_user_id'),
  toUserId: integer('to_user_id'),
  type: text('type'), // 'offer' | 'answer'
  payload: text('payload'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 16. FINANCE TRANSACTIONS
export const fundsTransactions = sqliteTable('funds_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // 'INCOME' | 'EXPENSE'
  amountEncrypted: text('amount_encrypted').notNull(),
  description: text('description').notNull(),
  category: text('category').default('other'), // 'education' | 'death_anniversary' | 'travel' | 'construction' | 'award' | 'other'
  createdBy: integer('created_by'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// 17. FINANCE AUDIT LOGS
export const fundsAuditLogs = sqliteTable('funds_audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  transactionId: integer('transaction_id'),
  action: text('action').notNull(), // 'CREATED' | 'UPDATED' | 'DELETED'
  oldAmountEncrypted: text('old_amount_encrypted'),
  newAmountEncrypted: text('new_amount_encrypted'),
  modifiedBy: integer('modified_by'),
  modifiedAt: text('modified_at').default(sql`CURRENT_TIMESTAMP`),
});
