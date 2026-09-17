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

for (const htmlFile of [join(root, 'index.html'), join(root, 'admin/index.html'), join(root, 'ops/index.html')]) {
  const html = readFileSync(htmlFile, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)=["']([^"'#?]+)(?:\?[^"']*)?["']/g)].map(match => match[1]);
  for (const ref of refs) {
    if (/^(?:https?:|mailto:|tel:|data:|\/\/)/.test(ref)) continue;
    const local = resolve(join(htmlFile, '..'), ref);
    if (!existsSync(local)) failures.push(`${htmlFile}: missing local asset ${ref}`);
  }
}

const ops = readFileSync(join(root, 'ops/index.html'), 'utf8');
for (const required of ['appNotice', 'refreshApp', 'lead-tools.js', 'manifest.webmanifest']) {
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

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Smoke checks passed: scripts parse, local assets resolve, Ops controls exist, and booking packages are wired.');
