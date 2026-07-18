const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'members',
  'achievements',
  'users',
  'posts',
  'comments',
  'reactions',
  'chat_rooms',
  'chat_members',
  'chat_messages',
  'funds_transactions',
  'funds_audit_logs',
  'update_requests'
];

async function backup() {
  console.log('Starting Supabase Database Backup...');
  const backupData = {};
  
  for (const table of tables) {
    console.log(`Fetching table: ${table}...`);
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`Error fetching table ${table}:`, error.message);
        continue;
      }
      backupData[table] = data || [];
      console.log(`Fetched ${backupData[table].length} records from ${table}.`);
    } catch (err) {
      console.error(`Exception fetching table ${table}:`, err.message);
    }
  }

  const backupDir = path.resolve(__dirname, '../database/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `supabase_backup_${timestamp}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`Backup completed successfully! Saved to ${backupFilePath}`);
}

backup();
