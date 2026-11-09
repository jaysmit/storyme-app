// Apply identity profile migration via Supabase REST API
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing environment variables');
  process.exit(1);
}

async function applyMigration() {
  console.log('Attempting to apply migration via Supabase Management API...\n');

  // First, let's try using the query endpoint
  const projectRef = url.split('//')[1].split('.')[0];
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const sql = `
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS identity_profile JSONB;

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS identity_confirmed BOOLEAN DEFAULT false;

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS identity_version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_characters_identity_pending
ON characters (user_id)
WHERE identity_confirmed = false AND generation_status = 'pending';
`;

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (accessToken) {
    try {
      const res = await fetch(mgmtUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Migration applied successfully!');
        console.log('Result:', JSON.stringify(data, null, 2));
        return;
      } else {
        const text = await res.text();
        console.log('Management API response:', res.status);
        if (text) console.log(text);
      }
    } catch (e) {
      console.log('Management API error:', e.message);
    }
  }

  console.log('\n=====================================');
  console.log('Please run this SQL in Supabase Dashboard SQL Editor:');
  console.log('=====================================\n');
  console.log(sql);
  console.log('\n=====================================');
  console.log('Dashboard URL: https://supabase.com/dashboard/project/' + projectRef + '/sql');
  console.log('=====================================');
}

applyMigration().catch(console.error);
