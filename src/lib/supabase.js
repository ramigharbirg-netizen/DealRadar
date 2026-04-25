import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vwvliyxrlzxkmdbrmtns.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dmxpeXhybHp4a21kYnJtdG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDI4MjMsImV4cCI6MjA5MjE3ODgyM30.Ze_XgTiWTGzaVAgKDZZmftrCdBg4BXTiWC7vY-2l9G8';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});