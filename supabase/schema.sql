create table public.admin_members (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admin_members enable row level security;
revoke all on public.admin_members from anon, authenticated;
grant select on public.admin_members to authenticated;
create policy "Read own membership" on public.admin_members for select to authenticated using (user_id=(select auth.uid()));

create table public.booking_requests (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
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
 payment_clicked_at timestamptz,
 first_contacted_at timestamptz,
 referrer_host text not null default '' check(char_length(referrer_host)<=253),
 utm_source text not null default '' check(char_length(utm_source)<=100),
 utm_medium text not null default '' check(char_length(utm_medium)<=100),
 utm_campaign text not null default '' check(char_length(utm_campaign)<=150)
);
alter table public.booking_requests enable row level security;
revoke all on public.booking_requests from anon, authenticated;
grant select on public.booking_requests to authenticated;
grant update(status,admin_notes) on public.booking_requests to authenticated;
create policy "Members read business booking requests" on public.booking_requests for select to authenticated using ((select private.is_business_member(booking_requests.business_id)));
create policy "Members update business booking requests" on public.booking_requests for update to authenticated using ((select private.is_business_member(booking_requests.business_id))) with check ((select private.is_business_member(booking_requests.business_id)));
create index booking_requests_created on public.booking_requests(created_at desc);
create index booking_requests_business_created_idx on public.booking_requests(business_id,created_at desc);
create index booking_requests_payment_click_idx on public.booking_requests(payment_clicked_at desc) where payment_clicked_at is not null;
create index booking_requests_calendar_click_idx on public.booking_requests(calendar_clicked_at desc) where calendar_clicked_at is not null;


-- SaaS tenant routing and subscription metadata.
alter table public.businesses
 add column if not exists timezone text not null default 'America/Denver',
 add column if not exists currency text not null default 'USD',
 add column if not exists onboarding_state text not null default 'setup';

create table public.business_domains (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 origin text not null unique check(char_length(origin) between 8 and 300 and origin ~ '^https?://[^/]+
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
 event_name text not null check(event_name in ('page_view','booking_open','vehicle_selected','service_selected','contact_step_seen','form_validation_error','request_submit','request_saved','request_error','booking_close','calendar_click','payment_click','call_click','text_click')),
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
),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.business_domains enable row level security;
revoke all on public.business_domains from public,anon,authenticated;
grant select,insert,update,delete on public.business_domains to authenticated;
grant all on public.business_domains to service_role;
create policy "Members read business domains" on public.business_domains for select to authenticated using ((select private.is_business_member(business_domains.business_id)));

create table public.business_subscriptions (
 business_id uuid primary key references public.businesses(id) on delete cascade,
 plan text not null default 'trial',
 status text not null default 'trialing' check(status in ('trialing','active','past_due','paused','canceled')),
 trial_ends_at timestamptz,
 provider_customer_id text unique,
 provider_subscription_id text unique,
 current_period_end timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.business_subscriptions enable row level security;
revoke all on public.business_subscriptions from public,anon,authenticated;
grant select on public.business_subscriptions to authenticated;
grant all on public.business_subscriptions to service_role;
create policy "Members read business subscription" on public.business_subscriptions for select to authenticated using ((select private.is_business_member(business_subscriptions.business_id)));

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
 event_name text not null check(event_name in ('page_view','booking_open','vehicle_selected','service_selected','contact_step_seen','form_validation_error','request_submit','request_saved','request_error','booking_close','calendar_click','payment_click','call_click','text_click')),
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
