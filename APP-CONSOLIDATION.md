# Hustle & Shine — One Operating System

Verified against connected project data on 2026-10-23. This document is a non-destructive migration inventory and operating policy; it is not evidence that historical external apps are synchronized in real time.

## Production source of truth

- **One owner workspace:** https://hustlenshine.pro/ops/
- **Public marketing and booking:** https://hustlenshine.pro/
- **Booking and first-party website analytics:** https://hustlenshine.pro/admin/
- **Code:** `Hustle-N-Shine-Detailing/hns-web` (GitHub Pages, `main`)
- **Primary database/auth:** Supabase `hustle-shine-bookings` (`eratuoffduqjywqlljwc`)
- **No competing customer master:** Do not create new customers, jobs, estimates, invoices, prospect statuses, or appointments in separate Base44/Floot databases. Use Ops and the active external booking provider. Calendar booking links are not guaranteed to sync back automatically.

The Ops app already contains sales, leads, local lead research, customer/vehicle CRM, estimates, jobs, invoices, payment tracking, photos, expenses, follow-ups, outreach tools, campaign tracking, and trade partners. The unified-shell script groups these into Today / Win Customers / Deliver & Collect and adds shortcuts on the dashboard. It does not grant access without owner sign-in or claim third-party integrations.

## Reconciliation completed (2026-10-23)

| Legacy source | Data found | Disposition |
|---|---|---|
| Floot Growth Hub | 35 sales leads | 31 matched existing Supabase prospects/lead candidates by normalized name or phone; three unmatched, research-only dealership prospects were imported to `lead_candidates`, with origin `floot_growth_hub_20261023`, status `new`, low lead score 35, and **no verified buying interest**; one SYSTEM TEST record excluded |
| Floot Hustle & Shine OS | 16 lead candidates; zero customers, jobs, invoices, estimates, follow-ups | All 16 matched Supabase by normalized name or phone; no extra import |
| Floot FIELD PRO | Zero field customers/jobs/leads/quotes/booking requests/photos | Preserve project as an unused prototype, not a production source |
| Base44 Hustle & Shine Pro | Zero lead, job, customer, quote, opportunity, follow-up and fleet-account records in checked models | No records to migrate from those models |
| Base44 Hustle & Shine Hub | Zero clients and jobs; 10 service records | **Price review pending.** Do not overwrite the five configured Supabase services or activate historical prices without owner review |
| Base44 FleetLeads Pro | 5 fleet accounts; demo leads and cancelled demo jobs; no secured detailing clients/jobs | Fleet accounts are represented in previously reconciled research lead sources; do not import demo records |
| Vercel / Railway | No active matching Hustle & Shine deployment found through connected accounts | Neither should be made a second customer master |

Matching is a practical duplicate check, not identity verification; some records can still have different spelling. Neither an imported research lead nor a published app implies an actual paying customer.

## Safe transition checklist

1. Use the **one production Ops URL** for all new business work.
2. Verify owner sign-in, booking lead creation, estimate-to-job flow, and invoices on the new navigation before considering the UI transition complete.
3. Reconcile the 10 historical Base44 service offerings/prices manually with live packages; never blindly replace prices.
4. Confirm any additional external media or historical source records exist in Ops before retiring the old project.
5. Keep legacy projects available but **do not enter new business data** there. Only unpublish, disconnect billing or delete after verified exports/backup and explicit retirement approval.
6. After the Railway security notice, rotate any potentially exposed keys before connecting another runtime; never copy legacy passwords or server secrets into frontend code.
7. Track Supabase leaked-password protection warning in GitHub issue #7; it remains outstanding pending a billing/security choice.

## Troubleshooting

If a view fails to load, refresh Ops and check the browser console; no legacy projects are invoked by the unified navigation. Sales and website traffic are different sources: app records remain in Supabase; Google Analytics/Search Console/Google Business Profile remain read-only connected reporting sources unless explicitly integrated.
