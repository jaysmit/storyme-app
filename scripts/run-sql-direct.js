/**
 * Run SQL directly against Supabase using the REST API
 * Usage: node scripts/run-sql-direct.js <sql-file>
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function runSQL(sqlFile) {
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', sqlFile);

  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');
  console.log(`Running SQL from: ${sqlFile}`);
  console.log('---');

  // Use Supabase PostgREST endpoint with RPC
  // We need to call a custom RPC function or use the SQL endpoint
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ sql_query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.log('RPC endpoint not available:', error);
    console.log('');
    console.log('Please run this SQL manually in the Supabase SQL Editor:');
    console.log('Go to: https://supabase.com/dashboard/project/kgnzhfueafnuzjqpcldj/sql/new');
    console.log('');
    console.log('=== SQL TO RUN ===');
    console.log(sql);
    console.log('==================');
    return;
  }

  const data = await response.json();
  console.log('SQL executed successfully!');
  console.log(data);
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.log('Usage: node scripts/run-sql-direct.js <sql-file>');
  console.log('Example: node scripts/run-sql-direct.js 015_incomplete_status.sql');
  process.exit(1);
}

runSQL(sqlFile);
