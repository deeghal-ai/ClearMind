import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Replace these with your actual Supabase project details from https://supabase.com/dashboard
const supabaseUrl = 'https://hzzhwhpvpysfzfkyxtbv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6emh3aHB2cHlzZnpma3l4dGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTcyOTUsImV4cCI6MjA2OTQ3MzI5NX0.3cwnm5I_Q12GME02K9_-SZYq5gQqTOLWBuY95GgBOgo';

export const supabase = createClient(supabaseUrl, supabaseKey);