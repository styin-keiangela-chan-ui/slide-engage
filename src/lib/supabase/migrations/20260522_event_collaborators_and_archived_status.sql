alter table public.events
drop constraint if exists events_status_check;

alter table public.events
add constraint events_status_check
check (status in ('draft', 'live', 'closed', 'archived'));

create table if not exists public.event_collaborators (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.lecturers(id) on delete cascade not null,
  role text default 'guest' not null,
  can_manage_interactions boolean default false,
  can_view_results boolean default true,
  created_at timestamptz default now(),
  unique (event_id, user_id)
);

create index if not exists idx_event_collaborators_event on public.event_collaborators(event_id);
create index if not exists idx_event_collaborators_user on public.event_collaborators(user_id);

alter table public.event_collaborators enable row level security;

drop policy if exists "Event collaborators are publicly readable" on public.event_collaborators;
drop policy if exists "Allow insert event collaborators" on public.event_collaborators;
drop policy if exists "Allow update event collaborators" on public.event_collaborators;
drop policy if exists "Allow delete event collaborators" on public.event_collaborators;

create policy "Event collaborators are publicly readable"
on public.event_collaborators for select using (true);

create policy "Allow insert event collaborators"
on public.event_collaborators for insert with check (true);

create policy "Allow update event collaborators"
on public.event_collaborators for update using (true);

create policy "Allow delete event collaborators"
on public.event_collaborators for delete using (true);
