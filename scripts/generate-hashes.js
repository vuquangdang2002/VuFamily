// Generate bcrypt password hashes for Supabase seed data
// Run: node scripts/generate-hashes.js
const bcrypt = require('bcryptjs');

const accounts = [
    { username: 'dangvq', password: 'test123' },
    { username: 'admin', password: 'admin123' },
    { username: 'viewer', password: 'viewer123' },
];

(async () => {
    console.log('═══ Bcrypt Hashes cho Supabase ═══\n');
    for (const acc of accounts) {
        const hash = await bcrypt.hash(acc.password, 10);
        console.log(`${acc.username} (${acc.password}):`);
        console.log(`  ${hash}\n`);
    }
    console.log('Copy các hash trên vào file supabase-schema.sql');
})();
