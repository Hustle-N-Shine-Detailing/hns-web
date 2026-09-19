alter table public.booking_requests
  add column if not exists tracking_token uuid not null default gen_random_uuid(),
  add column if not exists calendar_clicked_at timestamptz,
  add column if not exists payment_clicked_at timestamptz;

create index if not exists booking_requests_payment_click_idx
  on public.booking_requests(payment_clicked_at desc)
  where payment_clicked_at is not null;

create index if not exists booking_requests_calendar_click_idx
  on public.booking_requests(calendar_clicked_at desc)
  where calendar_clicked_at is not null;
