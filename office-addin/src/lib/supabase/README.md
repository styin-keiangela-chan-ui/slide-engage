Supabase browser/server clients are shared from `src/lib/supabase`.
-- Required for Archive bin support.
-- Run this in Supabase Dashboard > SQL Editor if archiving shows:
-- "violates check constraint events_status_check".

update public.events
set status = 'closed'
where status = 'draft';

alter table public.events
alter column status set default 'closed';

alter table public.events
drop constraint if exists events_status_check;

alter table public.events
add constraint events_status_check
check (status in ('live', 'closed', 'archived'));