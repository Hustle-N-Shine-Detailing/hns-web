import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures = [];
const budget = (condition, message) => { if (!condition) failures.push(message); };

const files = {
  html: resolve(root, 'index.html'),
  siteCss: resolve(root, 'assets/site.css'),
  refinementCss: resolve(root, 'assets/refinement.css'),
  siteJs: resolve(root, 'assets/site.js')
};

budget(statSync(files.html).size <= 30_000, `Homepage HTML is ${statSync(files.html).size} bytes (budget 30 KB).`);
budget(statSync(files.siteJs).size <= 20_000, `Public site JS is ${statSync(files.siteJs).size} bytes (budget 20 KB).`);
const cssBytes = statSync(files.siteCss).size + statSync(files.refinementCss).size;
budget(cssBytes <= 35_000, `Public CSS is ${cssBytes} bytes (budget 35 KB).`);

const html = readFileSync(files.html, 'utf8');
const refs = [...html.matchAll(/(?:src|href)=["']([^"'?#]+)(?:\?[^"']*)?["']/g)].map(match => match[1]);
const localAssets = [...new Set(refs.filter(ref => !/^(?:https?:|mailto:|tel:|sms:|data:|\/\/|#)/.test(ref)))];
let localBytes = 0;
for (const ref of localAssets) {
  const file = resolve(dirname(files.html), ref);
  if (!existsSync(file) || statSync(file).isDirectory()) continue;
  const size = statSync(file).size;
  localBytes += size;
  if (/\.(?:jpe?g|png|webp|gif)$/i.test(file)) {
    budget(size <= 500_000, `${ref} is ${size} bytes; keep public local images under 500 KB.`);
  }
}
budget(localBytes <= 2_000_000, `Homepage first-party referenced assets total ${localBytes} bytes (budget 2 MB).`);

const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map(match => match[0]);
for (const tag of imgs) {
  budget(/\balt=["'][^"']*["']/i.test(tag), `Image missing alt attribute: ${tag.slice(0,120)}`);
}
const nonHeroImages = imgs.filter(tag => !/foam-acura-hero/i.test(tag));
for (const tag of nonHeroImages) {
  budget(/\bloading=["']lazy["']/i.test(tag), `Non-hero image should lazy-load: ${tag.slice(0,120)}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Performance budgets passed: HTML ${statSync(files.html).size} B, JS ${statSync(files.siteJs).size} B, CSS ${cssBytes} B, referenced first-party assets ${localBytes} B.`);
