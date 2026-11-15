import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://orhidqfceoyfevdqkdch.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yaGlkcWZjZW95ZmV2ZHFrZGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3NzIzMDYsImV4cCI6MjExMDM0ODMwNn0.mOFgC-KNeHzGBvx03Wtairq6WprvCJG1hKLAEwt9om0";

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
