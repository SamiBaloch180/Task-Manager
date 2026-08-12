import { createClient } from '@supabase/supabase-js';

// Fallback to hardcoded values if env vars are not available at build time
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://nzbndejhzcctvqxnozeq.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56Ym5kZWpoemNjdHZxeG5vemVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NzU0NzYsImV4cCI6MjEwMTM1MTQ3Nn0.57R1cpni1cgMd7icmUiN89G8vGDn--rgyiaS22-JGYQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
