-- =============================================
-- SlideEngage Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- ─── DROP EXISTING TABLES (clean reset) ─────
drop table if exists public.qa_upvotes cascade;
drop table if exists public.qa_questions cascade;
drop table if exists public.responses cascade;
drop table if exists public.interaction_options cascade;
drop table if exists public.interactions cascade;
drop table if exists public.participants cascade;
drop table if exists public.events cascade;
drop table if exists public.lecturers cascade;

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── LECTURERS ───────────────────────────────
create table public.lecturers (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  password_hash text not null,
  created_at timestamptz default now()
);

-- ─── EVENTS ──────────────────────────────────
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  lecturer_id uuid references public.lecturers(id) on delete cascade not null,
  event_code text unique not null,
  event_name text not null,
  status text default 'closed' check (status in ('live', 'closed', 'archived')),
  allow_anonymous boolean default true,
  show_results text default 'after_voting' check (show_results in ('after_voting', 'after_close', 'never')),
  start_date date,
  end_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── PARTICIPANTS ────────────────────────────
create table public.participants (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade not null,
  session_token text unique not null,
  display_name text default 'Anonymous',
  joined_at timestamptz default now()
);

-- ─── INTERACTIONS ────────────────────────────
create table public.interactions (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade not null,
  type text not null check (type in ('poll', 'quiz', 'qa', 'word_cloud', 'feedback')),
  title text not null,
  status text default 'draft' check (status in ('draft', 'live', 'closed', 'archived')),
  config jsonb default '{}',
  position int default 0,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── EVENT COLLABORATORS ─────────────────────
create table public.event_collaborators (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.lecturers(id) on delete cascade not null,
  role text default 'guest' not null,
  can_manage_interactions boolean default false,
  can_view_results boolean default true,
  created_at timestamptz default now(),
  unique (event_id, user_id)
);

-- ─── INTERACTION OPTIONS ─────────────────────
create table public.interaction_options (
  id uuid primary key default uuid_generate_v4(),
  interaction_id uuid references public.interactions(id) on delete cascade not null,
  option_text text not null,
  option_letter text not null,
  is_correct boolean default false,
  position int default 0
);

-- ─── RESPONSES ───────────────────────────────
create table public.responses (
  id uuid primary key default uuid_generate_v4(),
  interaction_id uuid references public.interactions(id) on delete cascade not null,
  participant_id uuid references public.participants(id) on delete cascade not null,
  option_id uuid references public.interaction_options(id) on delete set null,
  text_value text,
  rating_value int,
  submitted_at timestamptz default now()
);

-- One vote per participant per interaction (for polls)
create unique index unique_poll_response
  on public.responses (interaction_id, participant_id)
  where option_id is not null;

-- ─── Q&A QUESTIONS ───────────────────────────
create table public.qa_questions (
  id uuid primary key default uuid_generate_v4(),
  interaction_id uuid references public.interactions(id) on delete cascade not null,
  participant_id uuid references public.participants(id) on delete cascade not null,
  question_text text not null,
  is_pinned boolean default false,
  is_hidden boolean default false,
  deleted_at timestamptz,
  deleted_by text,
  ai_answer text,
  created_at timestamptz default now()
);

-- ─── Q&A UPVOTES ─────────────────────────────
create table public.qa_upvotes (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid references public.qa_questions(id) on delete cascade not null,
  participant_id uuid references public.participants(id) on delete cascade not null,
  unique (question_id, participant_id)
);

-- ─── INDEXES ─────────────────────────────────
create index idx_events_code on public.events(event_code);
create index idx_events_lecturer on public.events(lecturer_id);
create index idx_interactions_event on public.interactions(event_id);
create index idx_interactions_archived_at on public.interactions(archived_at);
create index idx_interactions_deleted_at on public.interactions(deleted_at);
create index idx_participants_event on public.participants(event_id);
create index idx_event_collaborators_event on public.event_collaborators(event_id);
create index idx_event_collaborators_user on public.event_collaborators(user_id);
create index idx_responses_interaction on public.responses(interaction_id);
create index idx_qa_questions_interaction on public.qa_questions(interaction_id);
create index idx_qa_questions_deleted_at on public.qa_questions(interaction_id, deleted_at desc) where deleted_at is not null;
create index idx_qa_upvotes_question on public.qa_upvotes(question_id);

-- ─── ENABLE REALTIME ─────────────────────────
alter publication supabase_realtime add table public.responses;
alter publication supabase_realtime add table public.qa_questions;
alter publication supabase_realtime add table public.qa_upvotes;
alter publication supabase_realtime add table public.interactions;
alter publication supabase_realtime add table public.participants;

-- ─── ROW LEVEL SECURITY ─────────────────────
alter table public.lecturers enable row level security;
alter table public.events enable row level security;
alter table public.participants enable row level security;
alter table public.interactions enable row level security;
alter table public.interaction_options enable row level security;
alter table public.event_collaborators enable row level security;
alter table public.responses enable row level security;
alter table public.qa_questions enable row level security;
alter table public.qa_upvotes enable row level security;

-- Allow public read for events (students need to look up by code)
create policy "Events are publicly readable" on public.events for select using (true);
create policy "Interactions are publicly readable" on public.interactions for select using (true);
create policy "Options are publicly readable" on public.interaction_options for select using (true);
create policy "Responses are publicly readable" on public.responses for select using (true);
create policy "QA questions are publicly readable" on public.qa_questions for select using (true);
create policy "QA upvotes are publicly readable" on public.qa_upvotes for select using (true);
create policy "Participants are publicly readable" on public.participants for select using (true);
create policy "Lecturers are publicly readable" on public.lecturers for select using (true);
create policy "Event collaborators are publicly readable" on public.event_collaborators for select using (true);

-- Allow public inserts (anonymous participation)
create policy "Anyone can join as participant" on public.participants for insert with check (true);
create policy "Anyone can submit responses" on public.responses for insert with check (true);
create policy "Anyone can submit qa questions" on public.qa_questions for insert with check (true);
create policy "Anyone can upvote" on public.qa_upvotes for insert with check (true);

-- Allow public inserts for lecturer-created data (managed via API auth)
create policy "Allow insert lecturers" on public.lecturers for insert with check (true);
create policy "Allow insert events" on public.events for insert with check (true);
create policy "Allow insert interactions" on public.interactions for insert with check (true);
create policy "Allow insert options" on public.interaction_options for insert with check (true);
create policy "Allow insert event collaborators" on public.event_collaborators for insert with check (true);

-- Allow updates (managed via API auth)
create policy "Allow update events" on public.events for update using (true);
create policy "Allow update interactions" on public.interactions for update using (true);
create policy "Allow update qa_questions" on public.qa_questions for update using (true);
create policy "Allow update event collaborators" on public.event_collaborators for update using (true);

-- Allow deletes (managed via API auth)
create policy "Allow delete interactions" on public.interactions for delete using (true);
create policy "Allow delete options" on public.interaction_options for delete using (true);
create policy "Allow delete event collaborators" on public.event_collaborators for delete using (true);
create policy "Allow delete responses" on public.responses for delete using (true);
create policy "Allow delete qa_upvotes" on public.qa_upvotes for delete using (true);
