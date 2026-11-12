// Apply migration 011 directly using database URL
require('dotenv').config({ path: '.env.local' });

// Parse Supabase URL to get connection details
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

// Extract project ref from URL (e.g., "kgnzhfueafnuzjqpcldj" from "https://kgnzhfueafnuzjqpcldj.supabase.co")
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
console.log('Project ref:', projectRef);

// Use Supabase Management API to run the query
async function runMigration() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('Missing SUPABASE_ACCESS_TOKEN in .env.local');
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
    console.log(`
-- Migration 011: V2 name_mapping columns
ALTER TABLE books ADD COLUMN IF NOT EXISTS name_mapping JSONB DEFAULT '{}';
ALTER TABLE books ADD COLUMN IF NOT EXISTS personalized_pages JSONB DEFAULT '[]';
ALTER TABLE books ADD COLUMN IF NOT EXISTS blueprint_format TEXT DEFAULT 'v1';
    `);
    return;
  }

  console.log('Running migration 011 via Supabase Management API...\n');

  const sql = `
    ALTER TABLE books ADD COLUMN IF NOT EXISTS name_mapping JSONB DEFAULT '{}';
    ALTER TABLE books ADD COLUMN IF NOT EXISTS personalized_pages JSONB DEFAULT '[]';
    ALTER TABLE books ADD COLUMN IF NOT EXISTS blueprint_format TEXT DEFAULT 'v1';
  `;

  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('API Error:', response.status, error);
      console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
      console.log(sql);
      return;
    }

    const result = await response.json();
    console.log('Migration applied successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
    console.log(sql);
  }
}

runMigration();
