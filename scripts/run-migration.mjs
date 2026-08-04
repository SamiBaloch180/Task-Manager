/**
 * Applies the Supabase schema using the Management API.
 * Requires SUPABASE_PROJECT_REF and SUPABASE_SERVICE_ROLE_KEY env vars.
 * 
 * The Management API endpoint: POST https://api.supabase.com/v1/projects/{ref}/database/query
 * requires a Supabase personal access token, NOT the service role key.
 * 
 * Alternative: execute SQL via the pg REST proxy at /rest/v1/sql (service role key works here).
 * Supabase exposes: POST {SUPABASE_URL}/rest/v1/rpc with service role for custom RPCs.
 * 
 * We use the undocumented but working /pg endpoint:
 * POST {SUPABASE_URL}/rest/v1/  with service role and raw SQL via pg proxy isn't public.
 * 
 * SIMPLEST APPROACH: Use supabase-js admin client. We create a small bootstrap function.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

// Extract project ref from URL: https://<ref>.supabase.co
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

const sqlFile = readFileSync(join(__dirname, '../supabase/schema.sql'), 'utf8');

// Use the Supabase Management API SQL endpoint
// This requires a Supabase personal access token (PAT), not service role key.
// Instead, we'll use the pg REST API that Supabase exposes for service role clients.
// Supabase exposes: POST /rest/v1/ with Authorization: service_role for raw SQL via their internal pg proxy.
// Actually the correct endpoint is the database REST proxy at /pg/query:

const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'apikey': SUPABASE_SERVICE_KEY,
  },
  body: JSON.stringify({ sql_query: sqlFile }),
});

if (!response.ok) {
  const err = await response.text();
  console.log('RPC method not available (expected for fresh DB). Error:', err.slice(0, 200));
  console.log('\n=== MANUAL STEPS NEEDED ===');
  console.log('Please run the SQL in supabase/schema.sql in your Supabase SQL Editor:');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql');
  console.log('2. Paste the contents of supabase/schema.sql');
  console.log('3. Click Run');
} else {
  console.log('Schema applied via RPC!');
}
