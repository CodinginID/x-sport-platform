import { createClient } from '@supabase/supabase-js';

// Hardcoded — ganti dengan value dari Supabase Dashboard
const SUPABASE_URL = 'https://cjiopascmwicdibaqeve.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqaW9wYXNjbXdpY2RpYmFxZXZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3Mzk5OTYsImV4cCI6MjA5NDMxNTk5Nn0.1znD-fuILxrkFMGkDGaO6vGvujFlt6h84rKcFsLKcg8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const BACKUP_BUCKET = 'backups';
