// Backfill null usernames in submissions table
import { supabase } from '../supabaseClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const USERS_FILE = path.join(ROOT, 'server', 'users.json');

function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    console.error('Error reading users.json:', e);
    return [];
  }
}

async function backfillUsernames() {
  console.log('Starting username backfill...');
  
  // Get all submissions with null username but valid user_id
  const { data: submissions, error: fetchError } = await supabase
    .from('submissions')
    .select('id, user_id, username, email')
    .is('username', null)
    .not('user_id', 'is', null);

  if (fetchError) {
    console.error('Error fetching submissions:', fetchError);
    return;
  }

  if (!submissions || submissions.length === 0) {
    console.log('No submissions found with null usernames.');
    return;
  }

  console.log(`Found ${submissions.length} submissions with null usernames.`);

  const users = readUsers();
  const userMap = new Map(users.map(u => [u.id, u.name]));

  let updateCount = 0;
  for (const submission of submissions) {
    const username = userMap.get(submission.user_id);
    if (username) {
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ username })
        .eq('id', submission.id);

      if (updateError) {
        console.error(`Error updating submission ${submission.id}:`, updateError);
      } else {
        updateCount++;
        console.log(`✓ Updated submission ${submission.id}: username = "${username}"`);
      }
    } else {
      console.log(`✗ No user found for user_id: ${submission.user_id}`);
    }
  }

  console.log(`\nBackfill complete: ${updateCount}/${submissions.length} submissions updated.`);
}

backfillUsernames()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
