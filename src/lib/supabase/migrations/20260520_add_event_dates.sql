alter table public.events
add column if not exists start_date date,
add column if not exists end_date date;
