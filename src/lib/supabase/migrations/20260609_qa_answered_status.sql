-- Required for persistent Q&A "Mark as answered" and restore support.
-- Run this in Supabase SQL Editor if answered questions return after refresh.

alter table public.qa_questions
add column if not exists status text default 'active',
add column if not exists answered_at timestamptz;

update public.qa_questions
set status = 'answered',
    answered_at = coalesce(answered_at, deleted_at, now())
where is_hidden = true
  and coalesce(deleted_by, '') = 'answered';

update public.qa_questions
set status = coalesce(status, 'active')
where status is null;

alter table public.qa_questions
drop constraint if exists qa_questions_status_check;

alter table public.qa_questions
add constraint qa_questions_status_check
check (status in ('active', 'answered'));

create index if not exists idx_qa_questions_answered_at
on public.qa_questions(interaction_id, answered_at desc)
where answered_at is not null;
