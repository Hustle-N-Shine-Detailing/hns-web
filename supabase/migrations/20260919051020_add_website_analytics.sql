create table public.site_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  event_name text not null check (event_name in ('page_view','booking_open','calendar_click','payment_click','call_click','text_click')),
  path text not null default '/' check (char_length(path) between 1 and 300),
  visitor_hash text not null check (char_length(visitor_hash) = 64),
  referrer_host text not null default '' check (char_length(referrer_host) <= 253),
  device_type text not null default 'unknown' check (device_type in ('mobile','tablet','desktop','unknown')),
  country_code text not null default '' check (char_length(country_code) <= 2),
  utm_source text not null default '' check (char_length(utm_source) <= 100),
  utm_medium text not null default '' check (char_length(utm_medium) <= 100),
  utm_campaign text not null default '' check (char_length(utm_campaign) <= 150)
);

alter table public.site_events enable row level security;
revoke all on public.site_events from public, anon, authenticated;
grant select on public.site_events to authenticated;
grant select, insert, delete on public.site_events to service_role;

create policy "Members read website analytics"
on public.site_events for select to authenticated
using ((select private.is_business_member(site_events.business_id)));

create index site_events_business_time_idx on public.site_events (business_id, occurred_at desc);
create index site_events_business_visitor_idx on public.site_events (business_id, visitor_hash, occurred_at desc);

create table public.site_event_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);

alter table public.site_event_limits enable row level security;
revoke all on public.site_event_limits from public, anon, authenticated;
grant all on public.site_event_limits to service_role;

create or replace function public.accept_site_event(rate_key text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare request_count integer;
begin
  insert into public.site_event_limits(key, window_start, hits) values(rate_key, now(), 1)
  on conflict(key) do update set
    hits = case when public.site_event_limits.window_start < now() - interval '1 hour' then 1 else public.site_event_limits.hits + 1 end,
    window_start = case when public.site_event_limits.window_start < now() - interval '1 hour' then now() else public.site_event_limits.window_start end
  returning hits into request_count;
  delete from public.site_event_limits where window_start < now() - interval '48 hours';
  return request_count <= 120;
end;
$$;

revoke all on function public.accept_site_event(text) from public, anon, authenticated;
grant execute on function public.accept_site_event(text) to service_role;
