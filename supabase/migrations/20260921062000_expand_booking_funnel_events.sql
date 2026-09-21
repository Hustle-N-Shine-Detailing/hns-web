alter table public.site_events
drop constraint if exists site_events_event_name_check;

alter table public.site_events
add constraint site_events_event_name_check
check (event_name in (
  'page_view',
  'booking_open',
  'vehicle_selected',
  'service_selected',
  'request_submit',
  'request_saved',
  'calendar_click',
  'payment_click',
  'call_click',
  'text_click'
));