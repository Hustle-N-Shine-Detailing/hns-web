const SUPABASE_URL = 'https://eratuoffduqjywqlljwc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4JQI3mjlyxVIgLbjx1hvhw_iiFIZIwq';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const state = {
  businessId: null,
  businessName: 'Hustle & Shine Detailing Co',
  leads: [],
  jobs: [],
  customers: [],
  services: [],
  prospects: [],
};

const $ = (id) => document.getElementById(id);
const els = {
  authView: $('authView'), appView: $('appView'), authForm: $('authForm'), authMessage: $('authMessage'),
  email: $('email'), password: $('password'), createAccount: $('createAccount'), signOut: $('signOut'),
  pageTitle: $('pageTitle'), nav: $('nav'), newCustomerBtn: $('newCustomerBtn'), newJobBtn: $('newJobBtn'), newProspectBtn: $('newProspectBtn'),
  customerDialog: $('customerDialog'), jobDialog: $('jobDialog'), prospectDialog: $('prospectDialog'),
  customerForm: $('customerForm'), jobForm: $('jobForm'), prospectForm: $('prospectForm'), jobCustomer: $('jobCustomer'),
  metricLeads: $('metricLeads'), metricJobs: $('metricJobs'), metricCustomers: $('metricCustomers'), metricServices: $('metricServices'),
  nextJobs: $('nextJobs'), freshLeads: $('freshLeads'), leadsList: $('leadsList'), jobsList: $('jobsList'), customersList: $('customersList'), servicesList: $('servicesList'), prospectsList: $('prospectsList'),
};

function setMessage(text, isError = false) {
  els.authMessage.textContent = text || '';
  els.authMessage.style.color = isError ? 'var(--danger)' : '';
}

function fmtDate(value) {
  if (!value) return 'No date';
  try { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
  catch { return 'No date'; }
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function row(title, sub, status, extraNode) {
  const wrap = document.createElement('div');
  wrap.className = 'row';
  const main = document.createElement('div');
  main.className = 'row-main';
  const t = document.createElement('div');
  t.className = 'row-title';
  t.textContent = title || 'Untitled';
  const s = document.createElement('div');
  s.className = 'row-sub';
  s.textContent = sub || '';
  main.append(t, s);
  wrap.appendChild(main);
  if (extraNode) wrap.appendChild(extraNode);
  else if (status) {
    const pill = document.createElement('span');
    pill.className = `pill ${String(status).replaceAll('_', '-')}`;
    pill.textContent = String(status).replaceAll('_', ' ');
    wrap.appendChild(pill);
  }
  return wrap;
}

function empty(container, text) {
  container.replaceChildren();
  const node = document.createElement('div');
  node.className = 'empty';
  node.textContent = text;
  container.appendChild(node);
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  const target = document.getElementById(`${name}View`);
  if (target) target.classList.remove('hidden');
  const titles = { dashboard: 'Dashboard', leads: 'Booking Leads', prospects: 'Prospects', jobs: 'Jobs', customers: 'Customers', services: 'Services' };
  els.pageTitle.textContent = titles[name] || 'Dashboard';
}

async function loadMembership() {
  const { data, error } = await db.from('business_members').select('business_id,role,businesses(name,slug)').limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This login is not attached to a business yet. Use the Hustle & Shine owner email to create the first owner account.');
  state.businessId = data.business_id;
  state.businessName = data.businesses?.name || state.businessName;
}

async function loadAll() {
  if (!state.businessId) return;
  const [leads, jobs, customers, services, prospects] = await Promise.all([
    db.from('booking_requests').select('id,created_at,customer_name,phone,email,city,vehicle,service,customer_notes,status,admin_notes').order('created_at', { ascending: false }).limit(100),
    db.from('jobs').select('id,scheduled_start,status,address,total,internal_notes,customers(first_name,last_name),vehicles(year,make,model)').eq('business_id', state.businessId).order('scheduled_start', { ascending: true }).limit(100),
    db.from('customers').select('id,first_name,last_name,phone,email,address,notes,created_at').eq('business_id', state.businessId).order('created_at', { ascending: false }).limit(200),
    db.from('services').select('id,name,description,base_price,duration_minutes,active').eq('business_id', state.businessId).order('name'),
    db.from('prospects').select('*').eq('business_id', state.businessId).order('created_at', { ascending: false }).limit(200),
  ]);
  [leads, jobs, customers, services, prospects].forEach(result => { if (result.error) throw result.error; });
  state.leads = leads.data || [];
  state.jobs = jobs.data || [];
  state.customers = customers.data || [];
  state.services = services.data || [];
  state.prospects = prospects.data || [];
  render();
}

function render() {
  const upcoming = state.jobs.filter(j => !['completed','cancelled'].includes(j.status) && (!j.scheduled_start || new Date(j.scheduled_start) >= new Date(Date.now() - 86400000)));
  els.metricLeads.textContent = state.leads.filter(l => l.status === 'new').length;
  els.metricJobs.textContent = upcoming.length;
  els.metricCustomers.textContent = state.customers.length;
  els.metricServices.textContent = state.services.filter(s => s.active !== false).length;

  renderJobs(els.nextJobs, upcoming.slice(0, 5));
  renderLeads(els.freshLeads, state.leads.slice(0, 5));
  renderLeads(els.leadsList, state.leads);
  renderJobs(els.jobsList, state.jobs);
  renderCustomers();
  renderServices();
  renderProspects();
  fillCustomerSelect();
}

function renderJobs(container, jobs) {
  container.replaceChildren();
  if (!jobs.length) return empty(container, 'No jobs yet. Create the first one when you are ready.');
  jobs.forEach(job => {
    const customer = job.customers ? `${job.customers.first_name || ''} ${job.customers.last_name || ''}`.trim() : 'Customer';
    const vehicle = job.vehicles ? `${job.vehicles.year || ''} ${job.vehicles.make || ''} ${job.vehicles.model || ''}`.trim() : '';
    const sub = [fmtDate(job.scheduled_start), vehicle, job.address, Number(job.total) ? money(job.total) : ''].filter(Boolean).join(' • ');
    container.appendChild(row(customer, sub, job.status));
  });
}

function renderLeads(container, leads) {
  container.replaceChildren();
  if (!leads.length) return empty(container, 'No booking requests yet.');
  leads.forEach(lead => {
    const select = document.createElement('select');
    select.className = 'status-select';
    ['new','contacted','scheduled','completed','closed'].forEach(stage => {
      const option = document.createElement('option');
      option.value = stage; option.textContent = stage.replaceAll('_', ' '); option.selected = lead.status === stage;
      select.appendChild(option);
    });
    select.addEventListener('change', async () => {
      select.disabled = true;
      const { error } = await db.from('booking_requests').update({ status: select.value }).eq('id', lead.id);
      select.disabled = false;
      if (error) { alert(error.message); return; }
      lead.status = select.value;
      render();
    });
    const sub = [lead.vehicle, lead.service, lead.city, lead.phone].filter(Boolean).join(' • ');
    container.appendChild(row(lead.customer_name, sub, null, select));
  });
}

function renderCustomers() {
  els.customersList.replaceChildren();
  if (!state.customers.length) return empty(els.customersList, 'No customers yet. Add one from the top right.');
  state.customers.forEach(c => {
    const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Customer';
    els.customersList.appendChild(row(name, [c.phone, c.email, c.address].filter(Boolean).join(' • '), null));
  });
}

function renderServices() {
  els.servicesList.replaceChildren();
  if (!state.services.length) return empty(els.servicesList, 'No service menu yet. We can load your real packages and pricing next.');
  state.services.forEach(s => {
    const sub = [s.description, money(s.base_price), s.duration_minutes ? `${s.duration_minutes} min` : ''].filter(Boolean).join(' • ');
    els.servicesList.appendChild(row(s.name, sub, s.active ? 'active' : 'inactive'));
  });
}

function renderProspects() {
  els.prospectsList.replaceChildren();
  if (!state.prospects.length) return empty(els.prospectsList, 'No prospects yet. Add Boise / Treasure Valley businesses you want to land.');
  state.prospects.forEach(p => {
    const select = document.createElement('select');
    select.className = 'status-select';
    ['new','researching','contacted','follow_up','quote_sent','won','lost'].forEach(stage => {
      const option = document.createElement('option');
      option.value = stage; option.textContent = stage.replaceAll('_', ' '); option.selected = p.stage === stage;
      select.appendChild(option);
    });
    select.addEventListener('change', async () => {
      select.disabled = true;
      const { error } = await db.from('prospects').update({ stage: select.value, updated_at: new Date().toISOString() }).eq('id', p.id);
      select.disabled = false;
      if (error) { alert(error.message); return; }
      p.stage = select.value;
      renderProspects();
    });
    const sub = [p.category, [p.city,p.state].filter(Boolean).join(', '), p.estimated_vehicles ? `${p.estimated_vehicles} vehicles` : '', Number(p.estimated_monthly_value) ? `${money(p.estimated_monthly_value)}/mo est.` : '', p.next_follow_up_at ? `Follow up ${fmtDate(p.next_follow_up_at)}` : ''].filter(Boolean).join(' • ');
    els.prospectsList.appendChild(row(p.company_name, sub, null, select));
  });
}

function fillCustomerSelect() {
  els.jobCustomer.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = ''; placeholder.textContent = state.customers.length ? 'Choose customer' : 'Add a customer first';
  els.jobCustomer.appendChild(placeholder);
  state.customers.forEach(c => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = `${c.first_name || ''} ${c.last_name || ''}`.trim();
    els.jobCustomer.appendChild(option);
  });
}

async function bootForSession(session) {
  if (!session) {
    els.appView.classList.add('hidden');
    els.authView.classList.remove('hidden');
    return;
  }
  try {
    await loadMembership();
    els.authView.classList.add('hidden');
    els.appView.classList.remove('hidden');
    await loadAll();
  } catch (error) {
    await db.auth.signOut();
    els.appView.classList.add('hidden');
    els.authView.classList.remove('hidden');
    setMessage(error.message, true);
  }
}

els.authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('Signing in…');
  const { error } = await db.auth.signInWithPassword({ email: els.email.value.trim(), password: els.password.value });
  if (error) setMessage(error.message, true);
});

els.createAccount.addEventListener('click', async () => {
  const email = els.email.value.trim();
  const password = els.password.value;
  if (!email || password.length < 8) return setMessage('Enter your owner email and a password with at least 8 characters.', true);
  setMessage('Creating owner account…');
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) return setMessage(error.message, true);
  if (data.session) return setMessage('Owner account created. Loading dashboard…');
  setMessage('Account created. Check your email for the confirmation link, then come back and sign in.');
});

els.signOut.addEventListener('click', () => db.auth.signOut());
els.nav.addEventListener('click', (e) => { const btn = e.target.closest('[data-view]'); if (btn) showView(btn.dataset.view); });
document.addEventListener('click', (e) => { const jump = e.target.closest('[data-jump]'); if (jump) showView(jump.dataset.jump); });

document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => btn.closest('dialog').close()));
els.newCustomerBtn.addEventListener('click', () => els.customerDialog.showModal());
els.newJobBtn.addEventListener('click', () => { fillCustomerSelect(); els.jobDialog.showModal(); });
els.newProspectBtn.addEventListener('click', () => els.prospectDialog.showModal());

els.customerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(els.customerForm);
  const payload = Object.fromEntries(form.entries());
  payload.business_id = state.businessId;
  const { error } = await db.from('customers').insert(payload);
  if (error) return alert(error.message);
  els.customerForm.reset(); els.customerDialog.close(); await loadAll();
});

els.jobForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(els.jobForm);
  const payload = Object.fromEntries(form.entries());
  payload.business_id = state.businessId;
  payload.scheduled_start = new Date(payload.scheduled_start).toISOString();
  const { error } = await db.from('jobs').insert(payload);
  if (error) return alert(error.message);
  els.jobForm.reset(); els.jobDialog.close(); await loadAll();
});

els.prospectForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(els.prospectForm);
  const payload = Object.fromEntries(form.entries());
  payload.business_id = state.businessId;
  payload.estimated_vehicles = Number(payload.estimated_vehicles || 0);
  payload.estimated_monthly_value = Number(payload.estimated_monthly_value || 0);
  if (!payload.next_follow_up_at) delete payload.next_follow_up_at;
  else payload.next_follow_up_at = new Date(payload.next_follow_up_at).toISOString();
  const { error } = await db.from('prospects').insert(payload);
  if (error) return alert(error.message);
  els.prospectForm.reset(); els.prospectDialog.close(); await loadAll(); showView('prospects');
});

(async () => {
  const { data } = await db.auth.getSession();
  await bootForSession(data.session);
  db.auth.onAuthStateChange((_event, session) => bootForSession(session));
})();
