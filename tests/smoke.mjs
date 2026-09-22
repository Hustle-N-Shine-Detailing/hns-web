import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const failures = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

for (const folder of ['assets', 'admin', 'ops']) {
  for (const file of walk(join(root, folder)).filter(path => extname(path) === '.js')) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) failures.push(`${file}: ${result.stderr.trim()}`);
  }
}

const migrationsDirectory = join(root, 'supabase/migrations');
const migrations = readdirSync(migrationsDirectory)
  .filter(file => file.endsWith('.sql'))
  .sort();

if (!migrations.length) failures.push('No Supabase migrations were found.');
if (new Set(migrations).size !== migrations.length) failures.push('Supabase migration names must be unique.');
for (const migration of migrations) {
  if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(migration)) {
    failures.push(`Invalid migration filename: ${migration}`);
  }
  const sql = readFileSync(join(migrationsDirectory, migration), 'utf8');
  if (!sql.trim()) failures.push(`${migration} is empty.`);
  if (/^(?:<{7}|={7}|>{7})/m.test(sql)) failures.push(`${migration} contains merge-conflict markers.`);
}

const edgeFunction = join(root, 'supabase/functions/booking-request/index.ts');
if (!existsSync(edgeFunction)) failures.push('The booking-request Edge Function is missing.');
else {
  const edgeSource = readFileSync(edgeFunction, 'utf8');
  for (const required of ['Deno.serve', 'allowedOrigins', 'accept_request_attempt', 'accept_site_event']) {
    if (!edgeSource.includes(required)) failures.push(`Edge Function is missing ${required}`);
  }
}

for (const htmlFile of [join(root, 'index.html'), join(root, 'admin/index.html'), join(root, 'ops/index.html'), join(root, 'trade-partners/index.html'), join(root, 'fleet-detailing/index.html'), join(root, 'dealer-detailing/index.html'), join(root, 'body-shop-detailing/index.html'), join(root, 'commercial-detailing/index.html')]) {
  const html = readFileSync(htmlFile, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)=["']([^"'#?]+)(?:\?[^"']*)?["']/g)].map(match => match[1]);
  for (const ref of refs) {
    if (/^(?:https?:|mailto:|tel:|sms:|data:|\/\/)/.test(ref)) continue;
    const local = resolve(join(htmlFile, '..'), ref);
    if (!existsSync(local)) failures.push(`${htmlFile}: missing local asset ${ref}`);
  }
}

const ops = readFileSync(join(root, 'ops/index.html'), 'utf8');
for (const required of ['appNotice', 'refreshApp', 'lead-tools.js', 'manifest.webmanifest', 'Trade Partners', 'trade-partner-tools.js', 'campaign-tools.js']) {
  if (!ops.includes(required)) failures.push(`ops/index.html is missing ${required}`);
}

const finder = readFileSync(join(root, 'ops/lead-finder-tools.js'), 'utf8');
for (const required of ['Find Jobs', 'lead_score', 'sales_track', 'Search Idaho bids', 'Search SAM.gov', 'Start with hottest lead']) {
  if (!finder.includes(required)) failures.push(`Job Finder is missing ${required}`);
}

const booking = readFileSync(join(root, 'assets/site.js'), 'utf8');
for (const required of ['Cars & Sedans', 'Trucks & SUVs', 'Ceramic Coating', 'Specialty Vehicle Detail']) {
  if (!booking.includes(required)) failures.push(`Booking flow is missing ${required}`);
}
for (const required of ["track('page_view')", "track('booking_open')", "track('contact_step_seen'", "track('form_validation_error'", "track('request_error'", "trackHandoff('payment_click')", 'Save request & continue']) {
  if (!booking.includes(required)) failures.push(`Traffic or abandoned-booking tracking is missing ${required}`);
}

const admin = readFileSync(join(root, 'admin/admin.js'), 'utf8');
for (const required of ['loadTraffic', 'site_events', 'payment_clicked_at', 'calendar_clicked_at']) {
  if (!admin.includes(required)) failures.push(`Admin analytics is missing ${required}`);
}

const tradePage = readFileSync(join(root, 'trade-partners/index.html'), 'utf8');
for (const required of ['Your brand.', 'Request wholesale rate card', 'Your customer stays yours', 'Set up a trial vehicle', 'index,follow']) {
  if (!tradePage.includes(required)) failures.push(`Trade Partner page is missing ${required}`);
}

for (const file of ['robots.txt', 'sitemap.xml', 'ops/campaign-tools.js', 'assets/local-landing.css']) {
  if (!existsSync(join(root, file))) failures.push(`Required growth file is missing: ${file}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Smoke checks passed: scripts parse, local assets resolve, booking instrumentation is wired, and commercial/Trade Partner pages are covered.');
