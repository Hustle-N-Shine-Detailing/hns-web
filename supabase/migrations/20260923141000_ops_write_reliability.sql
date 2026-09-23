-- Make owner Ops writes explicit, tenant-safe, and easy to verify.

create or replace function public.create_customer(
  p_business_id uuid,
  p_first_name text,
  p_last_name text default '',
  p_phone text default '',
  p_email text default '',
  p_address text default '',
  p_notes text default ''
) returns uuid
language plpgsql
security invoker
set search_path = 'public'
as $$
declare
  v_customer_id uuid;
  v_first_name text := trim(coalesce(p_first_name, ''));
begin
  if auth.uid() is null then
    raise exception 'Sign in again before saving a customer.';
  end if;

  if p_business_id is null or not exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
  ) then
    raise exception 'You are not authorized to add customers for this business.';
  end if;

  if v_first_name = '' then
    raise exception 'First name is required.';
  end if;

  insert into public.customers (
    business_id, first_name, last_name, phone, email, address, notes
  ) values (
    p_business_id,
    v_first_name,
    trim(coalesce(p_last_name, '')),
    trim(coalesce(p_phone, '')),
    lower(trim(coalesce(p_email, ''))),
    trim(coalesce(p_address, '')),
    trim(coalesce(p_notes, ''))
  )
  returning id into v_customer_id;

  return v_customer_id;
end;
$$;

revoke all on function public.create_customer(uuid,text,text,text,text,text,text)
  from public, anon;
grant execute on function public.create_customer(uuid,text,text,text,text,text,text)
  to authenticated;

create or replace function public.create_invoice_for_job(
  p_job_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = 'public'
as $$
declare
  v_job public.jobs%rowtype;
  v_invoice_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in again before creating an invoice.';
  end if;

  select * into v_job
  from public.jobs
  where id = p_job_id;

  if v_job.id is null then
    raise exception 'Job not found or not authorized.';
  end if;

  select id into v_invoice_id
  from public.invoices
  where job_id = p_job_id;

  if v_invoice_id is not null then
    return v_invoice_id;
  end if;

  insert into public.invoices (
    business_id, job_id, status, amount_due, amount_paid
  ) values (
    v_job.business_id,
    v_job.id,
    'draft',
    coalesce(v_job.total, 0),
    0
  )
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;

revoke all on function public.create_invoice_for_job(uuid)
  from public, anon;
grant execute on function public.create_invoice_for_job(uuid)
  to authenticated;
