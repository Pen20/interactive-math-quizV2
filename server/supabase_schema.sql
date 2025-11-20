-- Supabase SQL: create table for quiz submissions

create table if not exists public.submissions (
  id uuid default gen_random_uuid() primary key,
  question text,
  course text,
  question_id text,
  time_open timestamptz,
  time_submitted timestamptz,
  duration_ms bigint,
  user_answer text,
  reasoning_steps text,
  ai_feedback jsonb,
  correctness text,
  username text,
  email text,
  user_id text,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_submissions_user_id on public.submissions (user_id);
create index if not exists idx_submissions_course on public.submissions (course);
create index if not exists idx_submissions_created_at on public.submissions (created_at desc);
