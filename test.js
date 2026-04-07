const bcrypt = require('bcryptjs');
const hash1 = "$2a$10$Wk9qgWNnap3v.nXvM8in6.LNLgzTGhejo7GdyUXbnnUVbI1z3Vpty";
console.log("Match:", bcrypt.compareSync("DangVQ@2002", hash1));

// Generate a valid Hash for DangVQ@2002
const hash_dangvq = bcrypt.hashSync("DangVQ@2002", 10);
const hash_admin = bcrypt.hashSync("Admin@1234", 10);
const hash_viewer = bcrypt.hashSync("Viewer@1234", 10);
console.log(JSON.stringify({ dangvq: hash_dangvq, admin: hash_admin, viewer: hash_viewer }));

// update supabase
require('dotenv').config();
const { supabase } = require('./database/supabase.js');
async function run() {
    await supabase.from('users').update({ password: hash_dangvq }).eq('username', 'dangvq');
    await supabase.from('users').update({ password: hash_admin }).eq('username', 'admin');
    await supabase.from('users').update({ password: hash_viewer }).eq('username', 'viewer');
    console.log('Update supabase done');
}
run();
