// Database initialization script
// Run with: npm run db:init
// Tạo 2 database riêng biệt: family.db (gia phả) và accounts.db (tài khoản)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const familyDbPath = path.resolve(process.env.DB_PATH || './database/family.db');
const accountsDbPath = path.resolve(path.dirname(familyDbPath), 'accounts.db');

async function init() {
  console.log('🔧 Đang khởi tạo database...');

  const SQL = await initSqlJs();

  // ═══════════════════════════════════════════
  // 1. FAMILY DATABASE (family.db) - Gia phả
  // ═══════════════════════════════════════════
  let familyDb;
  if (fs.existsSync(familyDbPath)) {
    familyDb = new SQL.Database(fs.readFileSync(familyDbPath));
    console.log('📦 Family DB: đã tồn tại');
  } else {
    familyDb = new SQL.Database();
    console.log('📦 Family DB: tạo mới');
  }

  familyDb.run('PRAGMA journal_mode=WAL');
  familyDb.run('PRAGMA foreign_keys=ON');

  // Metadata
  familyDb.run(`
    CREATE TABLE IF NOT EXISTS family_meta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_name TEXT DEFAULT 'Vũ',
      description TEXT DEFAULT '',
      origin_place TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Members
  familyDb.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender INTEGER CHECK(gender IN (0, 1)) DEFAULT 1,
      birth_date TEXT,
      birth_time TEXT,
      death_date TEXT,
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
    )
  `);

  // Achievements
  familyDb.run(`
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
    )
  `);

  // Events
  familyDb.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      event_type TEXT DEFAULT 'other',
      event_date TEXT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Family DB indexes
  familyDb.run(`CREATE INDEX IF NOT EXISTS idx_members_parent ON members(parent_id)`);
  familyDb.run(`CREATE INDEX IF NOT EXISTS idx_members_spouse ON members(spouse_id)`);
  familyDb.run(`CREATE INDEX IF NOT EXISTS idx_members_name ON members(name)`);
  familyDb.run(`CREATE INDEX IF NOT EXISTS idx_members_generation ON members(generation)`);
  familyDb.run(`CREATE INDEX IF NOT EXISTS idx_achievements_member ON achievements(member_id)`);
  familyDb.run(`CREATE INDEX IF NOT EXISTS idx_events_member ON events(member_id)`);

  // Default metadata
  const metaCount = familyDb.exec('SELECT COUNT(*) as count FROM family_meta');
  if (metaCount[0].values[0][0] === 0) {
    familyDb.run(`INSERT INTO family_meta (family_name, description, origin_place) VALUES (?, ?, ?)`,
      ['Vũ', 'Gia phả dòng họ Vũ', 'Hà Nam']);
    console.log('✅ Đã tạo metadata mặc định');
  }

  // Sample members
  const memberCount = familyDb.exec('SELECT COUNT(*) as count FROM members');
  if (memberCount[0].values[0][0] === 0) {
    const members = [
      [1, 'Vũ Văn Tổ', 1, '1900-01-15', null, '1975-08-20', 'Hà Nam', 'Hà Nam', 'Nông dân', '', '', '', 'Cụ Tổ - Thế hệ thứ nhất', '', null, 'biological', null, 2, 1],
      [2, 'Nguyễn Thị Tổ', 0, '1905-03-10', null, '1980-12-05', 'Hà Nam', 'Hà Nam', '', '', '', '', 'Cụ Bà', '', null, 'biological', null, 1, 1],
      [3, 'Vũ Văn An', 1, '1930-05-20', '06:30', '2005-11-15', 'Hà Nam', 'Hà Nội', 'Giáo viên', '', '', '', 'Con trưởng', '', 1, 'biological', 1, 4, 2],
      [4, 'Trần Thị Bình', 0, '1934-09-08', null, '2010-03-22', 'Nam Định', 'Hà Nội', '', '', '', '', '', '', null, 'biological', null, 3, 2],
      [5, 'Vũ Văn Bảo', 1, '1935-07-12', '08:00', '2015-06-18', 'Hà Nam', 'Hà Nội', 'Bộ đội', '', '', '', 'Con thứ hai', '', 2, 'biological', 1, 6, 2],
      [6, 'Lê Thị Cúc', 0, '1938-11-25', null, null, 'Hà Nội', '', '', '', '', 'Hà Nội', '', '', null, 'biological', null, 5, 2],
      [7, 'Vũ Thị Chi', 0, '1940-04-03', null, null, 'Hà Nam', '', 'Y tá', '', '', '', 'Con gái út', '', 3, 'biological', 1, null, 2],
      [8, 'Vũ Đăng Dũng', 1, '1958-02-14', '05:15', null, 'Hà Nội', '', 'Kỹ sư', '0912345678', '', 'Hà Nội', '', '', 1, 'biological', 3, 9, 3],
      [9, 'Phạm Thị Hoa', 0, '1960-08-30', null, null, 'Hải Phòng', '', 'Kế toán', '', '', 'Hà Nội', '', '', null, 'biological', null, 8, 3],
      [10, 'Vũ Văn Em', 1, '1962-12-01', '07:45', null, 'Hà Nội', '', 'Bác sĩ', '', '', 'Hà Nội', '', '', 2, 'biological', 3, 11, 3],
      [11, 'Đỗ Thị Giang', 0, '1965-06-18', null, null, 'Hà Nội', '', 'Giáo viên', '', '', 'Hà Nội', '', '', null, 'biological', null, 10, 3],
      [12, 'Vũ Minh Hoàng', 1, '1960-10-05', '14:30', null, 'Hà Nội', '', 'Doanh nhân', '', '', 'TP.HCM', '', '', 1, 'biological', 5, 13, 3],
      [13, 'Ngô Thị Lan', 0, '1963-03-22', null, null, 'Bắc Ninh', '', '', '', '', 'TP.HCM', '', '', null, 'biological', null, 12, 3],
      [14, 'Vũ Đăng Khoa', 1, '1985-09-15', '10:20', null, 'Hà Nội', '', 'Lập trình viên', '0987654321', 'khoa@email.com', 'Hà Nội', '', '', 1, 'biological', 8, 15, 4],
      [15, 'Hoàng Thị Mai', 0, '1988-01-28', null, null, 'Hà Nội', '', 'Thiết kế', '', '', 'Hà Nội', '', '', null, 'biological', null, 14, 4],
      [16, 'Vũ Thị Ngọc', 0, '1988-07-07', '16:00', null, 'Hà Nội', '', 'Dược sĩ', '', '', 'Hà Nội', '', '', 2, 'biological', 8, null, 4],
      [17, 'Vũ Minh Phúc', 1, '1990-04-12', null, null, 'Hà Nội', '', 'Kiến trúc sư', '', '', 'Đà Nẵng', '', '', 1, 'biological', 10, null, 4],
      [18, 'Vũ Hoàng Quân', 1, '1988-11-20', null, null, 'Hà Nội', '', 'Luật sư', '', '', 'TP.HCM', '', '', 1, 'biological', 12, null, 4],
      [19, 'Vũ Gia Bảo', 1, '2015-06-01', '09:30', null, 'Hà Nội', '', 'Học sinh', '', '', 'Hà Nội', '', '', 1, 'biological', 14, null, 5],
    ];

    const stmt = `INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    members.forEach(m => familyDb.run(stmt, m));
    console.log(`✅ Đã thêm ${members.length} thành viên mẫu`);
  }

  // Sample achievements
  const achCount = familyDb.exec('SELECT COUNT(*) as count FROM achievements');
  if (achCount[0].values[0][0] === 0) {
    const achievements = [
      [3, 'education', 'Tốt nghiệp Đại học Sư phạm', 'Đại học Sư phạm Hà Nội', 1948, 1952, 'Bằng giỏi'],
      [5, 'work', 'Phục vụ trong quân đội', 'QĐND Việt Nam', 1955, 1975, 'Đại úy'],
      [5, 'award', 'Huân chương chiến sĩ vẻ vang', 'Nhà nước', 1975, null, 'Hạng Nhất'],
      [8, 'education', 'Tốt nghiệp Kỹ sư Xây dựng', 'ĐH Xây dựng HN', 1976, 1981, ''],
      [8, 'work', 'Kỹ sư trưởng', 'Công ty XD Số 1', 1981, 2018, ''],
      [8, 'social', 'Bí thư chi bộ', 'Đảng CSVN', 1990, 2010, ''],
      [10, 'education', 'Tiến sĩ Y khoa', 'ĐH Y Hà Nội', 1980, 1992, 'Chuyên khoa Ngoại'],
      [14, 'education', 'Cử nhân CNTT', 'ĐH Bách Khoa HN', 2003, 2008, 'Bằng giỏi'],
      [14, 'work', 'Tech Lead', 'Startup ABC', 2015, null, 'Đồng sáng lập'],
      [14, 'social', 'Bí thư chi đoàn', 'Đoàn TNCS HCM', 2003, 2008, 'Đoàn viên ưu tú'],
    ];

    const achStmt = `INSERT INTO achievements (member_id, category, title, organization, start_year, end_year, description) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    achievements.forEach(a => familyDb.run(achStmt, a));
    console.log(`✅ Đã thêm ${achievements.length} thành tích mẫu`);
  }

  // Save family.db
  const familyDir = path.dirname(familyDbPath);
  if (!fs.existsSync(familyDir)) fs.mkdirSync(familyDir, { recursive: true });
  fs.writeFileSync(familyDbPath, Buffer.from(familyDb.export()));
  familyDb.close();
  console.log(`📁 Family DB tại: ${familyDbPath}`);

  // ═══════════════════════════════════════════
  // 2. ACCOUNTS DATABASE (accounts.db) - Tài khoản
  // ═══════════════════════════════════════════
  let accountsDb;
  if (fs.existsSync(accountsDbPath)) {
    accountsDb = new SQL.Database(fs.readFileSync(accountsDbPath));
    console.log('🔐 Accounts DB: đã tồn tại');
  } else {
    accountsDb = new SQL.Database();
    console.log('🔐 Accounts DB: tạo mới');
  }

  accountsDb.run('PRAGMA journal_mode=WAL');
  accountsDb.run('PRAGMA foreign_keys=ON');

  // Users table
  accountsDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT DEFAULT '',
      role TEXT CHECK(role IN ('admin', 'viewer')) DEFAULT 'viewer',
      token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Update requests table
  accountsDb.run(`
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
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    )
  `);

  // Indexes
  accountsDb.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  accountsDb.run(`CREATE INDEX IF NOT EXISTS idx_update_requests_status ON update_requests(status)`);

  // Default accounts
  const bcrypt = require('bcryptjs');
  const userCount = accountsDb.exec('SELECT COUNT(*) as count FROM users');
  if (userCount[0].values[0][0] === 0) {
    // Admin chính
    const dangvqHash = bcrypt.hashSync('test123', 10);
    accountsDb.run('INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)',
      ['dangvq', dangvqHash, 'Vũ Quang Đáng', 'admin']);
    // Admin phụ
    const adminHash = bcrypt.hashSync('admin123', 10);
    accountsDb.run('INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)',
      ['admin', adminHash, 'Quản trị viên', 'admin']);
    // Viewer
    const viewerHash = bcrypt.hashSync('viewer123', 10);
    accountsDb.run('INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)',
      ['viewer', viewerHash, 'Khách xem', 'viewer']);
    console.log('✅ Đã tạo tài khoản: dangvq/test123 (admin), admin/admin123, viewer/viewer123');
  }

  // Save accounts.db
  fs.writeFileSync(accountsDbPath, Buffer.from(accountsDb.export()));
  accountsDb.close();
  console.log(`📁 Accounts DB tại: ${accountsDbPath}`);

  console.log('\n✅ Khởi tạo hoàn tất!');
}

init().catch(err => {
  console.error('❌ Lỗi khởi tạo:', err);
  process.exit(1);
});
