-- Phase 1 SaaS tenant foundation.
-- Keeps Hustle & Shine as the first tenant while making public bookings,
-- domains, billing state, and booking conversion tenant-aware.

alter table public.businesses
  add column if not exists timezone text not null default 'America/Denver',
  add column if not exists currency text not null default 'USD',
  add column if not exists onboarding_state text not null default 'setup';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.businesses'::regclass
      and conname = 'businesses_currency_check'
  ) then
    alter table public.businesses
      add constraint businesses_currency_check
      check (currency ~ '^[A-Z]{3}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.businesses'::regclass
      and conname = 'businesses_onboarding_state_check'
  ) then
    alter table public.businesses
      add constraint businesses_onboarding_state_check
      check (onboarding_state in ('setup','active','suspended'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.businesses'::regclass
      and conname = 'businesses_timezone_check'
  ) then
    alter table public.businesses
      add constraint businesses_timezone_check
      check (char_length(timezone) between 1 and 64);
  end if;
end $$;

update public.businesses
set timezone = 'America/Denver',
    currency = 'USD',
    onboarding_state = 'active'
where slug = 'hustle-shine-detailing';

create table if not exists public.business_domains (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  origin text not null unique
    check (char_length(origin) between 8 and 300 and origin ~ '^https?://[^/]+$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists business_domains_business_idx
  on public.business_domains(business_id, active);

alter table public.business_domains enable row level security;
revoke all on public.business_domains from public, anon, authenticated;
grant select, insert, update, delete on public.business_domains to authenticated;
grant all on public.business_domains to service_role;

drop policy if exists "Members read business domains" on public.business_domains;
create policy "Members read business domains"
on public.business_domains for select to authenticated
using ((select private.is_business_member(business_domains.business_id)));

drop policy if exists "Managers insert business domains" on public.business_domains;
create policy "Managers insert business domains"
on public.business_domains for insert to authenticated
with check (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_domains.business_id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','manager')
  )
);

drop policy if exists "Managers update business domains" on public.business_domains;
create policy "Managers update business domains"
on public.business_domains for update to authenticated
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_domains.business_id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','manager')
  )
)
with check (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_domains.business_id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','manager')
  )
);

drop policy if exists "Managers delete business domains" on public.business_domains;
create policy "Managers delete business domains"
on public.business_domains for delete to authenticated
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_domains.business_id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','manager')
  )
);

insert into public.business_domains (business_id, origin, active)
select id, 'https://hustlenshine.pro', true
from public.businesses
where slug = 'hustle-shine-detailing'
on conflict (origin) do update
set business_id = excluded.business_id, active = true;

insert into public.business_domains (business_id, origin, active)
select id, 'https://www.hustlenshine.pro', true
from public.businesses
where slug = 'hustle-shine-detailing'
on conflict (origin) do update
set business_id = excluded.business_id, active = true;

create table if not exists public.business_subscriptions (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  plan text not null default 'trial' check (char_length(plan) between 1 and 50),
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','paused','canceled')),
  trial_ends_at timestamptz,
  provider_customer_id text unique,
  provider_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_subscriptions enable row level security;
revoke all on public.business_subscriptions from public, anon, authenticated;
grant select on public.business_subscriptions to authenticated;
grant all on public.business_subscriptions to service_role;

drop policy if exists "Members read business subscription" on public.business_subscriptions;
create policy "Members read business subscription"
on public.business_subscriptions for select to authenticated
using ((select private.is_business_member(business_subscriptions.business_id)));

insert into public.business_subscriptions (
  business_id, plan, status, trial_ends_at, updated_at
)
select id, 'founder', 'active', null, now()
from public.businesses
where slug = 'hustle-shine-detailing'
on conflict (business_id) do update
set plan = excluded.plan,
    status = excluded.status,
    trial_ends_at = excluded.trial_ends_at,
    updated_at = now();

alter table public.booking_requests
  add column if not exists business_id uuid;

update public.booking_requests br
set business_id = b.id
from public.businesses b
where br.business_id is null
  and b.slug = 'hustle-shine-detailing';

do $$
begin
  if exists (select 1 from public.booking_requests where business_id is null) then
    raise exception 'Cannot tenant-scope booking_requests: rows exist without a business';
  end if;
end $$;

alter table public.booking_requests
  alter column business_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.booking_requests'::regclass
      and conname = 'booking_requests_business_id_fkey'
  ) then
    alter table public.booking_requests
      add constraint booking_requests_business_id_fkey
      foreign key (business_id) references public.businesses(id) on delete cascade;
  end if;
end $$;

create index if not exists booking_requests_business_created_idx
  on public.booking_requests(business_id, created_at desc);

drop policy if exists "Admins read requests" on public.booking_requests;
drop policy if exists "Admins update requests" on public.booking_requests;
drop policy if exists "Members read business booking requests" on public.booking_requests;
drop policy if exists "Members update business booking requests" on public.booking_requests;

create policy "Members read business booking requests"
on public.booking_requests for select to authenticated
using ((select private.is_business_member(booking_requests.business_id)));

create policy "Members update business booking requests"
on public.booking_requests for update to authenticated
using ((select private.is_business_member(booking_requests.business_id)))
with check ((select private.is_business_member(booking_requests.business_id)));

create or replace function public.convert_booking_request_to_customer(
  p_booking_request_id uuid
) returns uuid
language plpgsql
set search_path = 'public'
as $$
declare
  request_row public.booking_requests%rowtype;
  member_business_id uuid;
  new_customer_id uuid;
  clean_name text;
  first_name_value text;
  last_name_value text;
begin
  select * into request_row
  from public.booking_requests
  where id = p_booking_request_id;

  if request_row.id is null then
    raise exception 'Booking request not found or not authorized';
  end if;

  if request_row.converted_customer_id is not null then
    return request_row.converted_customer_id;
  end if;

  member_business_id := request_row.business_id;

  if member_business_id is null
     or not (select private.is_business_member(member_business_id)) then
    raise exception 'Business membership is required';
  end if;

  clean_name := regexp_replace(trim(request_row.customer_name), '\\s+', ' ', 'g');
  first_name_value := split_part(clean_name, ' ', 1);
  last_name_value := nullif(trim(substr(clean_name, length(first_name_value) + 1)), '');

  insert into public.customers (
    business_id, first_name, last_name, phone, email, address, notes
  ) values (
    member_business_id,
    first_name_value,
    coalesce(last_name_value, ''),
    request_row.phone,
    request_row.email,
    request_row.city,
    concat_ws(E'\\n',
      'Website booking request',
      case when request_row.vehicle <> '' then 'Vehicle tier: ' || request_row.vehicle end,
      case when request_row.service <> '' then 'Requested service: ' || request_row.service end,
      nullif(request_row.customer_notes, '')
    )
  ) returning id into new_customer_id;

  update public.booking_requests
  set converted_customer_id = new_customer_id,
      converted_at = now(),
      status = case when status = 'new' then 'contacted' else status end
  where id = request_row.id
    and business_id = member_business_id;

  return new_customer_id;
end;
$$;
