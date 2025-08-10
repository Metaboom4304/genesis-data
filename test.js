import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://your-project-id.supabase.co', 'your-service-role-key');

console.log('✅ Supabase SDK работает!');
