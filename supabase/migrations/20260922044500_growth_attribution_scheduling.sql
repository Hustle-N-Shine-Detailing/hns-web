-- Growth attribution, response-time metrics, estimate follow-up automation,
-- and safer scheduling for Hustle & Shine.

alter table public.booking_requests
  add column if not exists first_contacted_at timestamptz,
  add column if not exists referrer_host text not null default '' check (char_length(referrer_host) <= 253),
  add column if not exists utm_source text not null default '' check (char_length(utm_source) <= 100),
  add column if not exists utm_medium text not null default '' check (char_length(utm_medium) <= 100),
  add column if not exists utm_campaign text not null default '' check (char_length(utm_campaign) <= 150);

create or replace function public.set_booking_first_contacted_at()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  if new.first_contacted_at is null
     and old.first_contacted_at is null
     and old.status = 'new'
     and new.status in ('contacted','scheduled','completed','closed') then
    new.first_contacted_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists booking_requests_first_contacted_at on public.booking_requests;
create trigger booking_requests_first_contacted_at
before update of status on public.booking_requests
for each row execute function public.set_booking_first_contacted_at();

alter table public.site_events
drop constraint if exists site_events_event_name_check;

alter table public.site_events
add constraint site_events_event_name_check
check (event_name in (
  'page_view',
  'booking_open',
  'vehicle_selected',
  'service_selected',
  'contact_step_seen',
  'form_validation_error',
  'request_submit',
  'request_saved',
  'request_error',
  'booking_close',
  'calendar_click',
  'payment_click',
  'call_click',
  'text_click'
));

alter table public.followups
  add column if not exists estimate_id uuid references public.estimates(id) on delete cascade;

create index if not exists followups_estimate_idx
  on public.followups(estimate_id)
  where estimate_id is not null;

create or replace function public.queue_sent_estimate_followup()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  if new.status = 'sent' and old.status is distinct from 'sent' then
    if not exists (
      select 1 from public.followups
      where estimate_id = new.id and status = 'open'
    ) then
      insert into public.followups (
        business_id, customer_id, estimate_id, kind, status, due_at, note
      ) values (
        new.business_id,
        new.customer_id,
        new.id,
        'sales',
        'open',
        now() + interval '2 days',
        'Follow up on the sent estimate if the customer has not responded.'
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists estimates_queue_sent_followup on public.estimates;
create trigger estimates_queue_sent_followup
after update of status on public.estimates
for each row execute function public.queue_sent_estimate_followup();

create or replace function public.create_job_with_service(
  p_customer_id uuid,
  p_vehicle_id uuid,
  p_service_id uuid,
  p_scheduled_start timestamptz,
  p_status text default 'scheduled',
  p_address text default '',
  p_internal_notes text default ''
)
returns uuid
language plpgsql
set search_path = 'public'
as $$
declare
  c public.customers%rowtype;
  v public.vehicles%rowtype;
  s public.services%rowtype;
  price_to_use numeric;
  new_job_id uuid;
  end_at timestamptz;
  local_start timestamp;
  local_end timestamp;
begin
  select * into c from public.customers where id = p_customer_id;
  if c.id is null then raise exception 'Customer not found'; end if;

  if p_vehicle_id is not null then
    select * into v
    from public.vehicles
    where id = p_vehicle_id
      and customer_id = p_customer_id
      and business_id = c.business_id;
    if v.id is null then raise exception 'Vehicle not found for this customer'; end if;
  end if;

  select * into s
  from public.services
  where id = p_service_id
    and business_id = c.business_id
    and active = true;
  if s.id is null then raise exception 'Service not found'; end if;

  if p_vehicle_id is not null and v.price_tier is not null then
    select spt.price into price_to_use
    from public.service_price_tiers spt
    where spt.business_id = c.business_id
      and spt.service_id = s.id
      and spt.vehicle_tier = v.price_tier
    limit 1;
  end if;

  price_to_use := coalesce(price_to_use, s.base_price, 0);
  if p_status not in ('scheduled','confirmed','in_progress','completed') then
    raise exception 'Invalid job status';
  end if;

  end_at := p_scheduled_start + make_interval(mins => greatest(coalesce(s.duration_minutes, 60), 30));
  local_start := p_scheduled_start at time zone 'America/Denver';
  local_end := end_at at time zone 'America/Denver';

  if local_start::time < time '08:00' or local_end::time > time '18:00' then
    raise exception 'Job must fit inside the 8 AM–6 PM business window.';
  end if;

  if exists (
    select 1
    from public.jobs j
    where j.business_id = c.business_id
      and j.scheduled_start is not null
      and j.status not in ('completed','cancelled','no_show')
      and tstzrange(
        j.scheduled_start - interval '30 minutes',
        coalesce(j.scheduled_end, j.scheduled_start + interval '2 hours') + interval '30 minutes',
        '[)'
      ) && tstzrange(p_scheduled_start, end_at, '[)')
  ) then
    raise exception 'That time conflicts with another job or the 30-minute travel buffer.';
  end if;

  insert into public.jobs (
    business_id, customer_id, vehicle_id, scheduled_start, scheduled_end, status,
    address, internal_notes, subtotal, tax, total
  ) values (
    c.business_id, c.id, p_vehicle_id, p_scheduled_start, end_at, p_status,
    coalesce(p_address,''), coalesce(p_internal_notes,''), price_to_use, 0, price_to_use
  ) returning id into new_job_id;

  insert into public.job_services (job_id, service_id, name, quantity, unit_price)
  values (new_job_id, s.id, s.name, 1, price_to_use);

  return new_job_id;
end;
$$;

create or replace function public.convert_estimate_to_job(
  p_estimate_id uuid,
  p_scheduled_start timestamptz,
  p_address text default ''
)
returns uuid
language plpgsql
set search_path = 'public'
as $$
declare
  e public.estimates%rowtype;
  new_job_id uuid;
  duration_minutes integer;
  end_at timestamptz;
  local_start timestamp;
  local_end timestamp;
begin
  select * into e
  from public.estimates
  where id = p_estimate_id
    and converted_job_id is null
    and status in ('draft','sent','approved');

  if e.id is null then
    raise exception 'Estimate is unavailable or already converted';
  end if;

  select coalesce(sum(coalesce(s.duration_minutes, 60) * greatest(ei.quantity::integer, 1)), 120)::integer
  into duration_minutes
  from public.estimate_items ei
  left join public.services s on s.id = ei.service_id
  where ei.estimate_id = e.id;

  end_at := p_scheduled_start + make_interval(mins => greatest(duration_minutes, 30));
  local_start := p_scheduled_start at time zone 'America/Denver';
  local_end := end_at at time zone 'America/Denver';

  if local_start::time < time '08:00' or local_end::time > time '18:00' then
    raise exception 'Job must fit inside the 8 AM–6 PM business window.';
  end if;

  if exists (
    select 1
    from public.jobs j
    where j.business_id = e.business_id
      and j.scheduled_start is not null
      and j.status not in ('completed','cancelled','no_show')
      and tstzrange(
        j.scheduled_start - interval '30 minutes',
        coalesce(j.scheduled_end, j.scheduled_start + interval '2 hours') + interval '30 minutes',
        '[)'
      ) && tstzrange(p_scheduled_start, end_at, '[)')
  ) then
    raise exception 'That time conflicts with another job or the 30-minute travel buffer.';
  end if;

  insert into public.jobs (
    business_id, customer_id, vehicle_id, scheduled_start, scheduled_end, status,
    address, subtotal, tax, total, customer_notes
  ) values (
    e.business_id, e.customer_id, e.vehicle_id, p_scheduled_start, end_at, 'scheduled',
    coalesce(p_address,''), e.subtotal, e.tax, e.total, e.notes
  ) returning id into new_job_id;

  insert into public.job_services (job_id, service_id, name, quantity, unit_price)
  select new_job_id, service_id, name, quantity, unit_price
  from public.estimate_items
  where estimate_id = e.id;

  update public.estimates
  set status = 'converted', converted_job_id = new_job_id, updated_at = now()
  where id = e.id;

  return new_job_id;
end;
$$;
