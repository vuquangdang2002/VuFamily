const { supabase } = require('../server/config/supabase');

async function run() {
  console.log('Testing compatibility layer...');
  
  // 1. Test members select
  const { data: members, error: err1 } = await supabase.from('members').select('*');
  if (err1) {
    console.error('Error fetching members:', err1);
  } else {
    console.log(`Fetched ${members.length} members. First member:`, members[0]?.name);
  }
  
  // 2. Test users select
  const { data: users, error: err2 } = await supabase.from('users').select('id, username, display_name');
  if (err2) {
    console.error('Error fetching users:', err2);
  } else {
    console.log(`Fetched ${users.length} users. First user:`, users[0]?.username);
  }
  
  // 3. Test single select
  const { data: admin, error: err3 } = await supabase.from('users').select('*').eq('username', 'dangvq').single();
  if (err3) {
    console.error('Error fetching single admin:', err3);
  } else {
    console.log('Fetched single admin:', admin?.display_name);
  }
}

run();
