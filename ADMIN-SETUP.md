# Hustle & Shine booking inbox

- Public site: https://hustlenshine.pro/
- Owner dashboard: https://hustlenshine.pro/admin/
- Supabase project: `eratuoffduqjywqlljwc` (`hustle-shine-bookings`)
- Plan quoted at creation: $0/month. Usage and future plan changes remain subject to Supabase billing.

## Owner access

The owner account and its private business membership are provisioned. The Ops console has no public registration. Do not put owner passwords, invitation links, service keys, or access tokens in this repository.

The admin site has no public registration. Authentication alone grants no access to requests; the database checks `admin_members` on every read/update. Sign-in sessions use sessionStorage. Customer fields are immutable from the admin interface; only status and private notes can be updated.

The full owner console is at `https://hustlenshine.pro/ops/`. It turns booking requests into customer records, manages estimates and jobs, records inspections and job photos, tracks invoices and expenses, schedules follow-ups and maintenance plans, and runs the commercial prospect pipeline.

## Behavior and limits

The website request form saves submitted names, contact information, vehicle/service choices and optional notes before showing Calendly and Stripe handoff buttons. A submitted request is not a confirmed appointment. The dashboard records when a saved request opens Calendly or Stripe, but it does not claim that an appointment or payment completed; confirm those separately. The dashboard lists 50 booking records at a time with a Load older requests button. Search and booking counts apply to loaded records.

The site also records privacy-friendly traffic events: page views, booking opens, calendar clicks, Stripe clicks, call clicks and text clicks. It stores the page path, referral host, device category, country code when supplied by the edge network, and UTM campaign fields. It never stores raw visitor IP addresses. An approximate visitor hash is created server-side from the network address and user agent and rotates monthly. No analytics cookie is used. The owner dashboard shows a rolling seven-day summary.

The public Edge Function validates input and consent, rejects a honeypot field, limits body size, and rate-limits booking requests to five per IP hash per hour. Analytics events have a separate 120-per-hour rate limit. Rate-limit records older than 48 hours are cleaned during requests. This is basic spam protection, not a CAPTCHA. Failed booking requests show a call/text fallback. Public API keys identify the project; they do not authorize access to customer data.

## Maintenance

`supabase/schema.sql` records the deployed schema. It is a schema reference, not an idempotent migration runner. The Edge Function source is in `supabase/functions/booking-request/index.ts`; deploy it with custom API-key validation and `verify_jwt=false` for the publishable key. No secret values are in source. The function uses the provider's server-side secret environment.

The locally bundled Supabase client uses pinned packages in package-lock.json. Rebuild with `npm ci` then `npm run build:admin`; commit the updated assets/supabase-client.js. GitHub Pages serves the committed static assets and requires no Node server.

Verified: all 10 package flows; four responsive widths; successful synthetic request stored and removed; anonymous reads/direct writes denied; authenticated non-admin reads return no rows; authorized membership allows status/notes updates; security advisor clean; admin UI filters, edits, and sign-out checked with synthetic data. The owner's real sign-in remains unverified until activation.
