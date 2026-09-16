# Hustle & Shine booking inbox

- Public site: https://hustlenshine.pro/
- Owner dashboard: https://hustlenshine.pro/admin/
- Supabase project: `eratuoffduqjywqlljwc` (`hustle-shine-bookings`)
- Plan quoted at creation: $0/month. Usage and future plan changes remain subject to Supabase billing.

## Owner activation (pending owner's chosen email)

Do not infer the owner's login email or give every authenticated user access.
Create/invite the owner's account through Supabase Authentication using the email the owner chooses. Complete the provider's email verification and password setup. Add only that verified user's UUID to `public.admin_members` through the trusted Supabase dashboard or a privileged migration. Do not put owner passwords, invitation links, service keys, or access tokens in this repository.

The admin site has no public registration. Authentication alone grants no access to requests; the database checks `admin_members` on every read/update. Sign-in sessions use sessionStorage. Customer fields are immutable from the admin interface; only status and private notes can be updated.

## Behavior and limits

The website request form saves submitted names, contact information, vehicle/service choices and optional notes. A submitted request is not a confirmed appointment. Calendly appointments and Stripe payments are NOT automatically synchronized. Direct calendar visitors and abandoned forms are not identified. The dashboard lists 50 records at a time with a Load older requests button. Search and counts apply to loaded records.

The public Edge Function validates input and consent, rejects a honeypot field, limits body size, and rate-limits requests to five per IP hash per hour. Rate-limit records older than 48 hours are cleaned during requests. This is basic spam protection, not a CAPTCHA. Failed requests show a call/text fallback. Public API keys identify the project; they do not authorize access to customer data.

## Maintenance

`supabase/schema.sql` records the deployed schema. It is a schema reference, not an idempotent migration runner. The Edge Function source is in `supabase/functions/booking-request/index.ts`; deploy it with custom API-key validation and `verify_jwt=false` for the publishable key. No secret values are in source. The function uses the provider's server-side secret environment.

The locally bundled Supabase client uses pinned packages in package-lock.json. Rebuild with `npm ci` then `npm run build:admin`; commit the updated assets/supabase-client.js. GitHub Pages serves the committed static assets and requires no Node server.

Verified: all 10 package flows; four responsive widths; successful synthetic request stored and removed; anonymous reads/direct writes denied; authenticated non-admin reads return no rows; authorized membership allows status/notes updates; security advisor clean; admin UI filters, edits, and sign-out checked with synthetic data. The owner's real sign-in remains unverified until activation.
