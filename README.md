# Hustle & Shine Detailing

Production website and owner operations app for Hustle & Shine Detailing in the Boise/Treasure Valley area.

- Website: https://hustlenshine.pro/
- Owner console: https://hustlenshine.pro/ops/
- Booking inbox: https://hustlenshine.pro/admin/
- Hosting: GitHub Pages from the `main` branch
- Backend: Supabase project `hustle-shine-bookings`

## What is in this repository

- `index.html` and `assets/`: public marketing and booking experience
- `admin/`: owner booking and traffic dashboard
- `ops/`: customer, prospect, estimate, job, invoice, expense, and follow-up tools
- `supabase/functions/booking-request/`: public booking and privacy-safe analytics Edge Function
- `supabase/migrations/`: ordered database changes
- `supabase/schema.sql`: deployed-schema reference; do not run it as a migration
- `tests/smoke.mjs`: static application, Ops, analytics, Edge Function, and migration checks

## Local setup

Requirements: Node.js 22 and npm.

```bash
npm ci
npm test
npm run check:edge
```

To rebuild the browser Supabase client after changing `src/supabase-client.js`:

```bash
npm run build:admin
```

Commit the regenerated `assets/supabase-client.js` with the source change.

## Configuration and secrets

The public Supabase publishable key identifies the project and may be present in browser code. Never commit owner passwords, service-role keys, Supabase access tokens, Stripe secrets, or private invitation links.

Production dependencies:

- Supabase: authentication, database, storage, and the booking Edge Function
- Stripe: payment handoff links
- Calendly: scheduling handoff links
- GitHub Pages and DNS: static-site delivery for `hustlenshine.pro`

The public booking function is deployed with `verify_jwt=false` because the website uses a publishable key. It performs its own API-key, origin, validation, honeypot, body-size, and rate-limit checks. See `ADMIN-SETUP.md` for operational details.

## Deployment

1. Open a pull request into `main`.
2. Require the `Project checks` workflow to pass.
3. Review public booking, call/text links, `/admin/`, and `/ops/` on mobile and desktop.
4. Merge the pull request. GitHub Pages publishes the committed static files from `main`.
5. If an Edge Function changed, deploy `supabase/functions/booking-request/index.ts` separately to Supabase with `verify_jwt=false`.
6. If a migration changed, apply the ordered file through the normal Supabase migration process before relying on the matching UI.

## Rollback

- Website/Ops regression: revert the merge commit on `main`; GitHub Pages will republish the previous static version.
- Edge Function regression: redeploy the previously known-good function source.
- Database regression: prefer a new forward migration. Do not edit or rerun an already-applied production migration.
- Before a risky database change, confirm a current Supabase backup and document the recovery plan in the pull request.

## Security and maintenance

- Keep the owner console private through Supabase Row Level Security; browser UI controls are not authorization.
- Run Supabase security and performance advisors after database changes.
- Enable leaked-password protection under Supabase **Authentication → Providers → Email** when the project is on a plan that supports it.
- Keep dependencies pinned through `package-lock.json` and review `npm audit --omit=dev` findings.
- Track remaining work as GitHub issues rather than leaving it only in chat or commit messages.

Additional setup notes are in `ADMIN-SETUP.md` and `GITHUB-PAGES-SETUP.md`.


## Backups

Supabase Free does not provide the same automatic backup retention as paid plans. This repository includes a daily encrypted logical-backup workflow at `.github/workflows/supabase-backup.yml`.

See `BACKUP-AND-RECOVERY.md` for the required GitHub Actions secrets, verification procedure, and restore runbook. Never commit production dumps or unencrypted customer data to this public repository.
