const fs = require('fs');
const path = require('path');

function generateSeed() {
  console.log('Generating SQLite D1 SQL Seed file...');
  
  const sqlLines = [];

  // Enable foreign keys (though D1 disables them during migrations/executions sometimes, it's good to have)
  sqlLines.push('PRAGMA foreign_keys = OFF;');

  // Table creation schemas (SQLite compatible)
  const schemas = [
    `DROP TABLE IF EXISTS family_meta;
    CREATE TABLE family_meta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_name TEXT DEFAULT 'Vũ',
      description TEXT DEFAULT '',
      origin_place TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `DROP TABLE IF EXISTS members;
    CREATE TABLE members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender INTEGER CHECK(gender IN (0, 1)) DEFAULT 1,
      birth_date TEXT,
      birth_time TEXT,
      death_date TEXT,
      death_date_lunar TEXT,
      birth_place TEXT DEFAULT '',
      death_place TEXT DEFAULT '',
      occupation TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      note TEXT DEFAULT '',
      photo TEXT DEFAULT '',
      birth_order INTEGER,
      child_type TEXT CHECK(child_type IN ('biological', 'adopted')) DEFAULT 'biological',
      parent_id INTEGER,
      spouse_id INTEGER,
      generation INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `DROP TABLE IF EXISTS achievements;
    CREATE TABLE achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      category TEXT CHECK(category IN ('education', 'work', 'social', 'award', 'other')) DEFAULT 'other',
      title TEXT NOT NULL,
      organization TEXT DEFAULT '',
      start_year INTEGER,
      end_year INTEGER,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `DROP TABLE IF EXISTS events;
    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      event_type TEXT DEFAULT 'other',
      event_date TEXT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `DROP TABLE IF EXISTS users;
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      role TEXT CHECK(role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
      status TEXT CHECK(status IN ('active', 'banned')) DEFAULT 'active',
      last_active DATETIME,
      is_online BOOLEAN DEFAULT false,
      email_verified BOOLEAN DEFAULT false,
      verification_token TEXT,
      token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `DROP TABLE IF EXISTS update_requests;
    CREATE TABLE update_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      changes TEXT NOT NULL,
      note TEXT DEFAULT '',
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      reject_reason TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `DROP TABLE IF EXISTS posts;
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `DROP TABLE IF EXISTS comments;
    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `DROP TABLE IF EXISTS reactions;
    CREATE TABLE reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, user_id, emoji)
    );`,

    `DROP TABLE IF EXISTS chat_rooms;
    CREATE TABLE chat_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT '',
      type TEXT CHECK(type IN ('direct', 'group')) DEFAULT 'direct',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `DROP TABLE IF EXISTS chat_members;
    CREATE TABLE chat_members (
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT CHECK(role IN ('admin', 'member')) DEFAULT 'member',
      last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(room_id, user_id)
    );`,

    `DROP TABLE IF EXISTS chat_messages;
    CREATE TABLE chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `DROP TABLE IF EXISTS calls;
    CREATE TABLE calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER,
      caller_id INTEGER,
      status TEXT CHECK(status IN ('calling', 'ongoing', 'ended', 'rejected', 'missed')) DEFAULT 'calling',
      offer TEXT,
      answer TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME
    );`,

    `DROP TABLE IF EXISTS call_ice_candidates;
    CREATE TABLE call_ice_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      call_id INTEGER,
      sender_id INTEGER,
      to_user_id INTEGER,
      candidate TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `DROP TABLE IF EXISTS call_signals;
    CREATE TABLE call_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      call_id INTEGER,
      from_user_id INTEGER,
      to_user_id INTEGER,
      type TEXT CHECK(type IN ('offer', 'answer')),
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivered BOOLEAN DEFAULT 0
    );`,

    `DROP TABLE IF EXISTS funds_transactions;
    CREATE TABLE funds_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
      amount_encrypted TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT CHECK(category IN ('education', 'death_anniversary', 'travel', 'construction', 'award', 'other')) DEFAULT 'other',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `DROP TABLE IF EXISTS funds_audit_logs;
    CREATE TABLE funds_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      action TEXT CHECK(action IN ('CREATED', 'UPDATED', 'DELETED')) NOT NULL,
      old_amount_encrypted TEXT,
      new_amount_encrypted TEXT,
      modified_by INTEGER,
      modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  schemas.forEach(s => sqlLines.push(s.trim()));

  // Load latest backup file
  const backupDir = path.resolve(__dirname, '../database/backups');
  if (!fs.existsSync(backupDir)) {
    console.error('❌ No backup directory found!');
    process.exit(1);
  }

  const files = fs.readdirSync(backupDir).filter(f => f.startsWith('supabase_backup_') && f.endsWith('.json'));
  if (files.length === 0) {
    console.error('❌ No JSON backup file found!');
    process.exit(1);
  }

  files.sort();
  const latestBackupFile = files[files.length - 1];
  const latestBackupPath = path.join(backupDir, latestBackupFile);
  console.log(`Loading backup data from: ${latestBackupFile}`);

  const backupData = JSON.parse(fs.readFileSync(latestBackupPath, 'utf8'));

  // Generate insert statements
  for (const table of Object.keys(backupData)) {
    const records = backupData[table];
    if (records.length === 0) continue;

    const keys = Object.keys(records[0]);
    sqlLines.push(`\n-- Seeding table: ${table}`);

    for (const record of records) {
      const values = keys.map(k => {
        const val = record[k];
        if (val === null) return 'NULL';
        if (typeof val === 'boolean') return val ? '1' : '0';
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        return val;
      });
      sqlLines.push(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.join(', ')});`);
    }
  }

  sqlLines.push('\nPRAGMA foreign_keys = ON;');

  const seedFilePath = path.resolve(__dirname, '../database/seed_d1.sql');
  fs.writeFileSync(seedFilePath, sqlLines.join('\n'), 'utf8');
  console.log(`\n🎉 Seed SQL file successfully generated at: ${seedFilePath}`);
}

generateSeed();
