const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function restore() {
  console.log('🔧 Starting local database restore...');
  const SQL = await initSqlJs();
  const dbPath = path.resolve(__dirname, '../database/family_all.db');
  
  // Create clean database in-memory
  const db = new SQL.Database();
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys=ON;');

  // Create tables schema (SQLite compatible)
  console.log('Creating schemas...');

  db.run(`
    CREATE TABLE IF NOT EXISTS family_meta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_name TEXT DEFAULT 'Vũ',
      description TEXT DEFAULT '',
      origin_place TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS members (
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES members(id) ON DELETE SET NULL,
      FOREIGN KEY (spouse_id) REFERENCES members(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      category TEXT CHECK(category IN ('education', 'work', 'social', 'award', 'other')) DEFAULT 'other',
      title TEXT NOT NULL,
      organization TEXT DEFAULT '',
      start_year INTEGER,
      end_year INTEGER,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      event_type TEXT DEFAULT 'other',
      event_date TEXT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
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
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS update_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      changes TEXT NOT NULL,
      note TEXT DEFAULT '',
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      reject_reason TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id, emoji)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT '',
      type TEXT CHECK(type IN ('direct', 'group')) DEFAULT 'direct',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_members (
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT CHECK(role IN ('admin', 'member')) DEFAULT 'member',
      last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER,
      caller_id INTEGER,
      status TEXT CHECK(status IN ('calling', 'ongoing', 'ended', 'rejected', 'missed')) DEFAULT 'calling',
      offer TEXT,
      answer TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS call_ice_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      call_id INTEGER,
      sender_id INTEGER,
      to_user_id INTEGER,
      candidate TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS call_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      call_id INTEGER,
      from_user_id INTEGER,
      to_user_id INTEGER,
      type TEXT CHECK(type IN ('offer', 'answer')),
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivered BOOLEAN DEFAULT 0,
      FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS funds_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
      amount_encrypted TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT CHECK(category IN ('education', 'death_anniversary', 'travel', 'construction', 'award', 'other')) DEFAULT 'other',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS funds_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      action TEXT CHECK(action IN ('CREATED', 'UPDATED', 'DELETED')) NOT NULL,
      old_amount_encrypted TEXT,
      new_amount_encrypted TEXT,
      modified_by INTEGER,
      modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES funds_transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Locate the latest backup file
  const backupDir = path.resolve(__dirname, '../database/backups');
  if (!fs.existsSync(backupDir)) {
    console.error('❌ No backup directory found!');
    process.exit(1);
  }

  const files = fs.readdirSync(backupDir).filter(f => f.startsWith('supabase_backup_') && f.endsWith('.json'));
  if (files.length === 0) {
    console.error('❌ No JSON backup file found in database/backups!');
    process.exit(1);
  }

  files.sort(); // Last one will be at the end
  const latestBackupFile = files[files.length - 1];
  const latestBackupPath = path.join(backupDir, latestBackupFile);
  console.log(`Loading backup data from: ${latestBackupFile}`);

  const backupData = JSON.parse(fs.readFileSync(latestBackupPath, 'utf8'));

  // Disable FK constraints temporarily to prevent ordering issues during insertion
  db.run('PRAGMA foreign_keys=OFF;');

  for (const table of Object.keys(backupData)) {
    const records = backupData[table];
    if (records.length === 0) continue;

    console.log(`Restoring ${records.length} records into table "${table}"...`);
    const keys = Object.keys(records[0]);
    const insertStmt = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
    
    const stmt = db.prepare(insertStmt);
    for (const record of records) {
      const values = keys.map(k => {
        // Convert boolean/objects to formats SQLite likes
        const val = record[k];
        if (typeof val === 'boolean') return val ? 1 : 0;
        if (typeof val === 'object' && val !== null) return JSON.stringify(val);
        return val;
      });
      stmt.run(values);
    }
    stmt.free();
  }

  // Re-enable FK constraints
  db.run('PRAGMA foreign_keys=ON;');

  // Save database file
  const data = db.export();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();

  console.log(`\n🎉 Database restored successfully to: ${dbPath}`);
}

restore().catch(err => {
  console.error('❌ Restore failed:', err);
  process.exit(1);
});
