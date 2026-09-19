create policy "Service manages website analytics rate limits"
on public.site_event_limits for all to service_role
using (true)
with check (true);
