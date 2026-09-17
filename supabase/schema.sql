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
 admin_notes text not null default '' check(char_length(admin_notes)<=5000)
);
alter table public.booking_requests enable row level security;
revoke all on public.booking_requests from anon, authenticated;
grant select on public.booking_requests to authenticated;
grant update(status,admin_notes) on public.booking_requests to authenticated;
create policy "Admins read requests" on public.booking_requests for select to authenticated using (exists(select 1 from public.admin_members where user_id=(select auth.uid())));
create policy "Admins update requests" on public.booking_requests for update to authenticated using (exists(select 1 from public.admin_members where user_id=(select auth.uid()))) with check (exists(select 1 from public.admin_members where user_id=(select auth.uid())));
create index booking_requests_created on public.booking_requests(created_at desc);

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
