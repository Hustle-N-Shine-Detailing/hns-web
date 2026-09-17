alter table public.booking_requests
  add column if not exists converted_customer_id uuid references public.customers(id) on delete set null,
  add column if not exists converted_at timestamptz;

create index if not exists booking_requests_converted_customer_idx
  on public.booking_requests(converted_customer_id)
  where converted_customer_id is not null;

grant update(converted_customer_id, converted_at) on public.booking_requests to authenticated;

create or replace function public.convert_booking_request_to_customer(p_booking_request_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
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

  select business_id into member_business_id
  from public.business_members
  where user_id = (select auth.uid())
  order by created_at
  limit 1;

  if member_business_id is null then
    raise exception 'Business membership is required';
  end if;

  clean_name := regexp_replace(trim(request_row.customer_name), '\s+', ' ', 'g');
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
    concat_ws(E'\n',
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
  where id = request_row.id;

  return new_customer_id;
end;
$$;

revoke all on function public.convert_booking_request_to_customer(uuid) from public, anon;
grant execute on function public.convert_booking_request_to_customer(uuid) to authenticated, service_role;
