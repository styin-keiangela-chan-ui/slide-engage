-- Adds recoverable Q&A removal metadata for "Restore Last Question".
-- Run this in Supabase SQL Editor before using Q&A restore in production.

alter table public.qa_questions
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by text;

create index if not exists idx_qa_questions_deleted_at
on public.qa_questions(interaction_id, deleted_at desc)
where deleted_at is not null;
