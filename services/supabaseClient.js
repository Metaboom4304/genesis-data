/services/supabaseClient.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ✅ Безопасно храним ключи в переменных
const SUPABASE_URL = 'https://nysjreargnvyjmcirinp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55c2pyZWFyZ252eWptY2lyaW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDgxNDIsImV4cCI6MjA3MDM4NDE0Mn0.UZpiU_nM_ACF8bILAGF4oa-WSHaU38KX6Dtz_srZK9Q'; // ← вставь свой anon ключ

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
