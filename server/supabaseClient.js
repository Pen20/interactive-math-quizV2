import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Ensure env vars are loaded when this module is imported (index may import routers before calling dotenv)
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Supabase: SUPABASE_URL and/or SUPABASE_KEY not set. Database writes will fail.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
