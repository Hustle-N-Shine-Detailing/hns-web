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

    check(await page.getByRole('heading', { name: /Save this quote/i }).isVisible(), scenario.name + ': contact step did not load');
    check((await page.locator('#sumPrice').textContent())?.trim() === '$220', scenario.name + ': sedan full-detail price was not $220');

    await page.getByLabel('Your name').fill('Automated Test');
    await page.getByLabel('Phone number').fill('2085550100');
    await page.getByLabel('City (optional)').fill('Boise');
    await page.getByRole('checkbox', { name: /You may contact me/i }).check();
    await page.getByRole('button', { name: /Save my quote & continue/i }).click();
    await page.getByText(/Quote saved./).waitFor();

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
    check(await privatePage.locator('#email').count() === 1, privateSurface.name + ': owner email field missing');
    check(await privatePage.locator('#password').count() === 1, privateSurface.name + ': owner password field missing');
    const signInButton = privateSurface.name === 'admin' ? '#login-button' : '#authForm button[type="submit"]';
    check(await privatePage.locator(signInButton).count() === 1, privateSurface.name + ': sign-in button missing');
    const authSurface = privateSurface.name === 'admin' ? '#login-panel' : '#authView';
    check(await privatePage.locator(authSurface).isVisible(), privateSurface.name + ': sign-in surface is not visible');
    if (privateSurface.name === 'admin') {
      for (const metricId of ['count-booking-conversion','count-booking-close','count-form-errors','count-request-errors','avg-response-time']) {
        check(await privatePage.locator('#' + metricId).count() === 1, 'admin: missing dashboard metric #' + metricId);
      }
    }
    const privateOverflow = await privatePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(privateOverflow <= 2, privateSurface.name + ': mobile sign-in page has horizontal overflow of ' + privateOverflow + 'px');
    check(privateErrors.length === 0, privateSurface.name + ': browser errors: ' + privateErrors.join(' | '));
    await privateContext.close();
  }

  // Exercise the authenticated Ops write path with a browser-side Supabase stub.
  // This catches dead Save buttons, stale DOM wiring, and regressions in the customer/invoice RPC calls.
  {
    const opsContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const opsPage = await opsContext.newPage();
    const opsErrors = [];
    opsPage.on('pageerror', error => opsErrors.push(error.message));
    opsPage.on('console', msg => { if (msg.type() === 'error') opsErrors.push(msg.text()); });

    await opsPage.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.102.0/dist/umd/supabase.min.js', async route => {
      const stub = `
(() => {
  const businessId = '612c314d-962e-4119-adc4-ac9c16216053';
  const ownerId = '2d82675c-fd88-461d-906d-81caa47786d1';
  const store = {
    business_members: [{ business_id: businessId, role: 'owner', businesses: { name: 'Hustle & Shine Detailing Co', slug: 'hustle-shine-detailing' } }],
    booking_requests: [],
    customers: [{ id: 'c-seed', first_name: 'Seed', last_name: 'Customer', phone: '2085550100', email: '', address: 'Boise', notes: '', created_at: '2026-09-23T12:00:00Z' }],
    vehicles: [{ id: 'v-seed', customer_id: 'c-seed', year: 2024, make: 'Chevrolet', model: 'Tahoe', color: 'Black', plate: '', vin: '', notes: '', created_at: '2026-09-23T12:00:00Z', customers: { first_name: 'Seed', last_name: 'Customer' } }],
    services: [{ id: 's-seed', name: 'Full Detail', description: '', base_price: 220, duration_minutes: 120, active: true }],
    jobs: [{
      id: 'j-seed', business_id: businessId, customer_id: 'c-seed', vehicle_id: 'v-seed',
      scheduled_start: '2027-01-15T17:00:00Z', scheduled_end: '2027-01-15T19:00:00Z',
      status: 'scheduled', address: 'Boise', total: 220, subtotal: 220, tax: 0,
      internal_notes: '', customer_notes: '',
      customers: { first_name: 'Seed', last_name: 'Customer', phone: '2085550100', email: '' },
      vehicles: { year: 2024, make: 'Chevrolet', model: 'Tahoe', color: 'Black', plate: '', vin: '' },
      job_services: [{ name: 'Full Detail', quantity: 1, unit_price: 220, line_total: 220 }]
    }],
    prospects: [],
    invoices: [],
    estimates: [],
    estimate_items: [],
    maintenance_plans: [],
    followups: [],
    lead_candidates: [],
    site_events: [],
    service_price_tiers: [],
    job_inspections: [],
    job_photos: [],
    expenses: []
  };
  window.__opsRpcCalls = [];

  function rowsFor(table, filters) {
    let rows = [...(store[table] || [])];
    for (const [field, value] of filters) rows = rows.filter(row => row?.[field] === value);
    return rows;
  }

  function builderFor(table, initialOp = 'select', initialPayload = null) {
    const state = { op: initialOp, payload: initialPayload, filters: [], limit: null, applied: false };

    function applyWrite() {
      if (state.applied) return;
      state.applied = true;
      if (state.op === 'insert') {
        const items = Array.isArray(state.payload) ? state.payload : [state.payload];
        for (const item of items) (store[table] ||= []).push({ id: item.id || crypto.randomUUID(), ...item });
      } else if (state.op === 'update') {
        for (const row of rowsFor(table, state.filters)) Object.assign(row, state.payload);
      } else if (state.op === 'delete') {
        const doomed = new Set(rowsFor(table, state.filters));
        store[table] = (store[table] || []).filter(row => !doomed.has(row));
      } else if (state.op === 'upsert') {
        const item = state.payload;
        const existing = (store[table] || []).find(row => item.job_id && row.job_id === item.job_id);
        if (existing) Object.assign(existing, item); else (store[table] ||= []).push({ id: item.id || crypto.randomUUID(), ...item });
      }
    }

    function resultRows() {
      applyWrite();
      let rows = rowsFor(table, state.filters);
      if (state.limit != null) rows = rows.slice(0, state.limit);
      return rows;
    }

    const api = {
      select() { return proxy; },
      eq(field, value) { state.filters.push([field, value]); return proxy; },
      neq() { return proxy; },
      gte() { return proxy; },
      lte() { return proxy; },
      gt() { return proxy; },
      lt() { return proxy; },
      is() { return proxy; },
      in() { return proxy; },
      or() { return proxy; },
      order() { return proxy; },
      limit(value) { state.limit = value; return proxy; },
      abortSignal() { return proxy; },
      maybeSingle() {
        const rows = resultRows();
        return Promise.resolve({ data: rows[0] || null, error: null });
      },
      single() {
        const rows = resultRows();
        return Promise.resolve({ data: rows[0] || null, error: rows[0] ? null : { message: 'No row' } });
      },
      insert(payload) { return builderFor(table, 'insert', payload); },
      update(payload) { return builderFor(table, 'update', payload); },
      delete() { return builderFor(table, 'delete', null); },
      upsert(payload) { return builderFor(table, 'upsert', payload); },
      then(resolve, reject) { return Promise.resolve({ data: resultRows(), error: null }).then(resolve, reject); }
    };
    const proxy = api;
    return proxy;
  }

  const db = {
    auth: {
      getSession: () => new Promise(resolve => setTimeout(() => resolve({ data: { session: { user: { id: ownerId } } }, error: null }), 0)),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ data: { session: { user: { id: ownerId } } }, error: null }),
      signOut: async () => ({ error: null })
    },
    from: table => builderFor(table),
    rpc: async (name, args) => {
      window.__opsRpcCalls.push({ name, args });
      if (name === 'create_customer') {
        const id = 'c-' + (store.customers.length + 1);
        store.customers.unshift({
          id,
          first_name: args.p_first_name,
          last_name: args.p_last_name || '',
          phone: args.p_phone || '',
          email: args.p_email || '',
          address: args.p_address || '',
          notes: args.p_notes || '',
          created_at: new Date().toISOString()
        });
        return { data: id, error: null };
      }
      if (name === 'create_invoice_for_job') {
        let inv = store.invoices.find(item => item.job_id === args.p_job_id);
        if (!inv) {
          inv = {
            id: 'inv-1', job_id: args.p_job_id, invoice_number: 1001, status: 'draft',
            amount_due: 220, amount_paid: 0, due_at: null, paid_at: null, created_at: new Date().toISOString(),
            jobs: store.jobs.find(item => item.id === args.p_job_id)
          };
          store.invoices.unshift(inv);
        }
        return { data: inv.id, error: null };
      }
      return { data: null, error: null };
    },
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        remove: async () => ({ error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==' }, error: null })
      })
    }
  };

  window.supabase = { createClient: () => db };
})();
`;
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: stub });
    });

    await opsPage.goto(base + '/ops/', { waitUntil: 'domcontentloaded' });
    await opsPage.locator('#appView').waitFor({ state: 'visible' });

    await opsPage.locator('#newCustomerBtn').click();
    await opsPage.locator('#customerDialog input[name="first_name"]').fill('Richard');
    await opsPage.locator('#customerDialog input[name="last_name"]').fill('Bishop');
    await opsPage.locator('#customerDialog input[name="phone"]').fill('6034936206');
    await opsPage.locator('#customerDialog input[name="email"]').fill('milordbish@gmail.com');
    await opsPage.locator('#customerDialog input[name="address"]').fill('Nampa, ID');
    await opsPage.locator('#customerDialog button[type="submit"]').click();
    await opsPage.getByText(/Richard was saved to Customers/i).waitFor();
    check(await opsPage.getByText('Richard Bishop', { exact: true }).count() === 1, 'ops authenticated: saved customer did not render');

    await opsPage.locator('[data-view="jobs"]').click();
    await opsPage.getByRole('button', { name: 'Open job' }).first().click();
    await opsPage.getByRole('button', { name: 'Create invoice' }).click();
    await opsPage.getByText(/Invoice is ready/i).waitFor();
    check(await opsPage.getByText(/Invoice #1001/).count() >= 1, 'ops authenticated: invoice did not render after creation');

    const rpcNames = await opsPage.evaluate(() => window.__opsRpcCalls.map(call => call.name));
    check(rpcNames.includes('create_customer'), 'ops authenticated: customer RPC was not called');
    check(rpcNames.includes('create_invoice_for_job'), 'ops authenticated: invoice RPC was not called');
    check(opsErrors.length === 0, 'ops authenticated: browser errors: ' + opsErrors.join(' | '));
    await opsContext.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Browser checks passed: desktop/mobile booking flow, mocked booking save, Trade Partner indexing, and commercial SEO pages.');
