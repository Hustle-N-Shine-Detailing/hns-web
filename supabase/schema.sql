create table public.admin_members (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admin_members enable row level security;
revoke all on public.admin_members from anon, authenticated;
grant select on public.admin_members to authenticated;
create policy "Read own membership" on public.admin_members for select to authenticated using (user_id=(select auth.uid()));

create table public.booking_requests (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 customer_name text not null check(char_length(customer_name) between 2 and 100),
 phone text not null check(char_length(phone) between 7 and 30),
 email text not null default '' check(char_length(email)<=254),
 city text not null default '' check(char_length(city)<=100),
 vehicle text not null check(char_length(vehicle)<=80),
 service text not null check(char_length(service)<=100),
 customer_notes text not null default '' check(char_length(customer_notes)<=2000),
 status text not null default 'new' check(status in ('new','contacted','scheduled','completed','closed')),
 admin_notes text not null default '' check(char_length(admin_notes)<=5000),
 tracking_token uuid not null default gen_random_uuid(),
 calendar_clicked_at timestamptz,
 payment_clicked_at timestamptz
);
alter table public.booking_requests enable row level security;
revoke all on public.booking_requests from anon, authenticated;
grant select on public.booking_requests to authenticated;
grant update(status,admin_notes) on public.booking_requests to authenticated;
create policy "Admins read requests" on public.booking_requests for select to authenticated using (exists(select 1 from public.admin_members where user_id=(select auth.uid())));
create policy "Admins update requests" on public.booking_requests for update to authenticated using (exists(select 1 from public.admin_members where user_id=(select auth.uid()))) with check (exists(select 1 from public.admin_members where user_id=(select auth.uid())));
create index booking_requests_created on public.booking_requests(created_at desc);
create index booking_requests_payment_click_idx on public.booking_requests(payment_clicked_at desc) where payment_clicked_at is not null;
create index booking_requests_calendar_click_idx on public.booking_requests(calendar_clicked_at desc) where calendar_clicked_at is not null;

create table public.request_limits (
 key text primary key,
 window_start timestamptz not null,
 hits int not null
);
alter table public.request_limits enable row level security;
revoke all on public.request_limits from public,anon,authenticated;
grant all on public.request_limits to service_role;
create function public.accept_request_attempt(rate_key text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 insert into public.request_limits(key,window_start,hits) values(rate_key,now(),1)
 on conflict(key) do update set
 hits=case when public.request_limits.window_start < now()-interval '1 hour' then 1 else public.request_limits.hits+1 end,
 window_start=case when public.request_limits.window_start < now()-interval '1 hour' then now() else public.request_limits.window_start end
 returning hits into n;
 delete from public.request_limits where window_start < now()-interval '48 hours';
 return n<=5;
end $$;
revoke all on function public.accept_request_attempt(text) from public,anon,authenticated;
grant execute on function public.accept_request_attempt(text) to service_role;
grant all on public.booking_requests to service_role;

create policy "Service manages rate limits" on public.request_limits for all to service_role using (true) with check (true);

-- Booking requests can be promoted into the private customer book from Ops.
-- The deployed migration is tracked in supabase/migrations/20260917100000_convert_booking_leads.sql.

-- Anonymous, cookie-free traffic analytics are stored without raw IP addresses.
-- Deployed migrations are tracked in the 20260919051020 and 20260919051131 files.
create table public.site_events (
 id bigint generated always as identity primary key,
 business_id uuid not null references public.businesses(id) on delete cascade,
 occurred_at timestamptz not null default now(),
 event_name text not null check(event_name in ('page_view','booking_open','calendar_click','payment_click','call_click','text_click')),
 path text not null default '/' check(char_length(path) between 1 and 300),
 visitor_hash text not null check(char_length(visitor_hash)=64),
 referrer_host text not null default '' check(char_length(referrer_host)<=253),
 device_type text not null default 'unknown' check(device_type in ('mobile','tablet','desktop','unknown')),
 country_code text not null default '' check(char_length(country_code)<=2),
 utm_source text not null default '' check(char_length(utm_source)<=100),
 utm_medium text not null default '' check(char_length(utm_medium)<=100),
 utm_campaign text not null default '' check(char_length(utm_campaign)<=150)
);
alter table public.site_events enable row level security;
revoke all on public.site_events from public,anon,authenticated;
grant select on public.site_events to authenticated;
grant select,insert,delete on public.site_events to service_role;
create policy "Members read website analytics" on public.site_events for select to authenticated using ((select private.is_business_member(site_events.business_id)));
create index site_events_business_time_idx on public.site_events(business_id,occurred_at desc);
create index site_events_business_visitor_idx on public.site_events(business_id,visitor_hash,occurred_at desc);

create table public.site_event_limits (
 key text primary key,
 window_start timestamptz not null,
 hits integer not null
);
alter table public.site_event_limits enable row level security;
revoke all on public.site_event_limits from public,anon,authenticated;
grant all on public.site_event_limits to service_role;
create policy "Service manages website analytics rate limits" on public.site_event_limits for all to service_role using (true) with check (true);
create function public.accept_site_event(rate_key text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 insert into public.site_event_limits(key,window_start,hits) values(rate_key,now(),1)
 on conflict(key) do update set
 hits=case when public.site_event_limits.window_start < now()-interval '1 hour' then 1 else public.site_event_limits.hits+1 end,
 window_start=case when public.site_event_limits.window_start < now()-interval '1 hour' then now() else public.site_event_limits.window_start end
 returning hits into n;
 delete from public.site_event_limits where window_start < now()-interval '48 hours';
 return n<=120;
end $$;
revoke all on function public.accept_site_event(text) from public,anon,authenticated;
grant execute on function public.accept_site_event(text) to service_role;
