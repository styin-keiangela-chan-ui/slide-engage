-- Required for interaction Archive Bin support.
-- Run this in Supabase Dashboard > SQL Editor before using Delete Interaction.

alter table public.interactions
add column if not exists archived_at timestamptz,
add column if not exists deleted_at timestamptz;

alter table public.interactions
drop constraint if exists interactions_status_check;

alter table public.interactions
add constraint interactions_status_check
check (status in ('draft', 'live', 'closed', 'archived'));

create index if not exists idx_interactions_archived_at on public.interactions(archived_at);
create index if not exists idx_interactions_deleted_at on public.interactions(deleted_at);
