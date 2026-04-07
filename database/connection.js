// Database connection using sql.js (pure JavaScript SQLite)
// Tách riêng: family.db (gia phả) và accounts.db (tài khoản)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('../server/config');

const familyDbPath = path.resolve(config.dbPath);
const accountsDbPath = path.resolve(path.dirname(config.dbPath), 'accounts.db');

let familyDb = null;
let accountsDb = null;
let SQL = null;

async function initSQL() {
    if (!SQL) {
        SQL = await initSqlJs();
    }
    return SQL;
}

function loadOrCreateDb(dbPath) {
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        return new SQL.Database(buffer);
    }
    return new SQL.Database();
}

// === Family Database (gia phả) ===
async function getDb() {
    if (familyDb) return familyDb;
    await initSQL();
    familyDb = loadOrCreateDb(familyDbPath);
    console.log(`📦 Kết nối family DB: ${familyDbPath}`);
    return familyDb;
}

function saveDb() {
    if (!familyDb) return;
    const dir = path.dirname(familyDbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data = familyDb.export();
    fs.writeFileSync(familyDbPath, Buffer.from(data));
}

function closeDb() {
    if (familyDb) {
        saveDb();
        familyDb.close();
        familyDb = null;
        console.log('📦 Đã đóng family DB');
    }
}

// === Accounts Database (tài khoản) ===
async function getAccountsDb() {
    if (accountsDb) return accountsDb;
    await initSQL();
    accountsDb = loadOrCreateDb(accountsDbPath);
    console.log(`🔐 Kết nối accounts DB: ${accountsDbPath}`);
    return accountsDb;
}

function saveAccountsDb() {
    if (!accountsDb) return;
    const dir = path.dirname(accountsDbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data = accountsDb.export();
    fs.writeFileSync(accountsDbPath, Buffer.from(data));
}

function closeAccountsDb() {
    if (accountsDb) {
        saveAccountsDb();
        accountsDb.close();
        accountsDb = null;
        console.log('🔐 Đã đóng accounts DB');
    }
}

// Close both databases
function closeAll() {
    closeDb();
    closeAccountsDb();
}

module.exports = {
    // Family DB
    getDb, saveDb, closeDb,
    // Accounts DB
    getAccountsDb, saveAccountsDb, closeAccountsDb,
    // Utility
    closeAll,
    // Paths
    familyDbPath, accountsDbPath,
};
