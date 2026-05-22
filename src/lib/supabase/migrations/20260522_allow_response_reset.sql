drop policy if exists "Allow delete responses" on public.responses;

create policy "Allow delete responses"
on public.responses
for delete
using (true);
