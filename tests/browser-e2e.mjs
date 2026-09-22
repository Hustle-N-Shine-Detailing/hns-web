import { chromium } from 'playwright';

const base = process.env.HNS_TEST_URL || 'http://127.0.0.1:4173';
const failures = [];
const fakeId = '11111111-1111-4111-8111-111111111111';
const fakeToken = '22222222-2222-4222-8222-222222222222';

function check(condition, message) {
  if (!condition) failures.push(message);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const scenario of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } }
  ]) {
    const context = await browser.newContext({ viewport: scenario.viewport });
    const page = await context.newPage();
    const browserErrors = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error') browserErrors.push(msg.text()); });

    await page.route('https://eratuoffduqjywqlljwc.supabase.co/functions/v1/booking-request', async route => {
      let body = {};
      try { body = JSON.parse(route.request().postData() || '{}'); } catch {}
      if (body.event_name) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      } else {
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, booking_request_id: fakeId, tracking_token: fakeToken }) });
      }
    });

    await page.goto(base + '/?utm_source=e2e&utm_medium=test&utm_campaign=booking_flow', { waitUntil: 'domcontentloaded' });
    check((await page.title()).includes('Hustle & Shine'), scenario.name + ': homepage title missing');
    const missingAlt = await page.locator('img:not([alt])').count();
    check(missingAlt === 0, scenario.name + ': ' + missingAlt + ' image(s) are missing alt attributes');
    const unnamedButtons = await page.locator('button').evaluateAll(buttons => buttons.filter(button => !(button.textContent || '').trim() && !button.getAttribute('aria-label')).length);
    check(unnamedButtons === 0, scenario.name + ': ' + unnamedButtons + ' button(s) have no accessible name');
    const unlabeledInputs = await page.locator('input:not([type="hidden"]),textarea,select').evaluateAll(fields => fields.filter(field => !field.closest('label') && !field.getAttribute('aria-label') && !field.getAttribute('aria-labelledby')).length);
    check(unlabeledInputs === 0, scenario.name + ': ' + unlabeledInputs + ' form field(s) have no accessible label');
    await page.getByRole('button', { name: /Book Now/i }).first().click();
    check(await page.getByRole('heading', { name: /Build your detail/i }).isVisible(), scenario.name + ': booking modal did not open');

    await page.getByRole('button', { name: /Cars & Sedans/i }).click();
    await page.getByRole('button', { name: /Signature Full Detail/i }).click();

    check(await page.getByRole('heading', { name: /Save your detail request/i }).isVisible(), scenario.name + ': contact step did not load');
    check((await page.locator('#sumPrice').textContent())?.trim() === '$220', scenario.name + ': sedan full-detail price was not $220');

    await page.getByLabel('Your name').fill('Automated Test');
    await page.getByLabel('Phone number').fill('2085550100');
    await page.getByLabel('City (optional)').fill('Boise');
    await page.getByRole('checkbox', { name: /You may contact me/i }).check();
    await page.getByRole('button', { name: /Save request & continue/i }).click();
    await page.getByText(/Request saved./).waitFor();

    check(await page.getByRole('link', { name: /Pay \$220 with Stripe/i }).isVisible(), scenario.name + ': payment handoff did not unlock after mocked save');
    check(await page.getByRole('link', { name: /Check availability & book/i }).isVisible(), scenario.name + ': scheduling handoff did not unlock after mocked save');

    if (scenario.name === 'mobile') {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(overflow <= 2, 'mobile: page has horizontal overflow of ' + overflow + 'px');
    }
    check(browserErrors.length === 0, scenario.name + ': browser errors: ' + browserErrors.join(' | '));
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(base + '/trade-partners/', { waitUntil: 'domcontentloaded' });
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  check(!/noindex/i.test(robots || ''), 'Trade Partner page is still noindex');
  check(await page.getByRole('heading', { name: /Your brand\. Our work\./i }).isVisible(), 'Trade Partner hero missing');

  for (const path of ['/fleet-detailing/', '/dealer-detailing/', '/body-shop-detailing/', '/commercial-detailing/']) {
    await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    check((await page.locator('h1').count()) === 1, path + ': expected exactly one H1');
    check((await page.locator('meta[name="description"]').getAttribute('content') || '').length > 80, path + ': meta description missing/short');
    check((await page.locator('link[rel="canonical"]').getAttribute('href') || '').startsWith('https://hustlenshine.pro/'), path + ': canonical URL missing');
  }
  await context.close();

  for (const privateSurface of [
    { path: '/admin/', name: 'admin' },
    { path: '/ops/', name: 'ops' }
  ]) {
    const privateContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const privatePage = await privateContext.newPage();
    const privateErrors = [];
    privatePage.on('pageerror', error => privateErrors.push(error.message));
    await privatePage.goto(base + privateSurface.path, { waitUntil: 'domcontentloaded' });
    check((await privatePage.locator('body').innerText()).trim().length > 40, privateSurface.name + ': sign-in page is blank');
    check(await privatePage.locator('input[type="email"]').count() === 1, privateSurface.name + ': email field missing');
    check(await privatePage.locator('input[type="password"]').count() === 1, privateSurface.name + ': password field missing');
    check(await privatePage.locator('button[type="submit"]').count() >= 1, privateSurface.name + ': sign-in button missing');
    const privateOverflow = await privatePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(privateOverflow <= 2, privateSurface.name + ': mobile sign-in page has horizontal overflow of ' + privateOverflow + 'px');
    check(privateErrors.length === 0, privateSurface.name + ': browser errors: ' + privateErrors.join(' | '));
    await privateContext.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Browser checks passed: desktop/mobile booking flow, mocked booking save, Trade Partner indexing, and commercial SEO pages.');
