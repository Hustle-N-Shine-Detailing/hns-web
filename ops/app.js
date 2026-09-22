const SUPABASE_URL = 'https://eratuoffduqjywqlljwc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4JQI3mjlyxVIgLbjx1hvhw_iiFIZIwq';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const state = {
  businessId: null,
  businessName: 'Hustle & Shine Detailing Co',
  leads: [],
  jobs: [],
  customers: [],
  vehicles: [],
  services: [],
  prospects: [],
};

const $ = (id) => document.getElementById(id);
const els = {
  authView: $('authView'), appView: $('appView'), authForm: $('authForm'), authMessage: $('authMessage'),
  email: $('email'), password: $('password'), signOut: $('signOut'), refreshApp: $('refreshApp'), appNotice: $('appNotice'),
  pageTitle: $('pageTitle'), nav: $('nav'),
  newCustomerBtn: $('newCustomerBtn'), newJobBtn: $('newJobBtn'), newProspectBtn: $('newProspectBtn'),
  newVehicleBtn: $('newVehicleBtn'), newServiceBtn: $('newServiceBtn'), addProspectInside: $('addProspectInside'),
  customerDialog: $('customerDialog'), vehicleDialog: $('vehicleDialog'), jobDialog: $('jobDialog'), serviceDialog: $('serviceDialog'), prospectDialog: $('prospectDialog'),
  customerForm: $('customerForm'), vehicleForm: $('vehicleForm'), jobForm: $('jobForm'), serviceForm: $('serviceForm'), prospectForm: $('prospectForm'),
  jobCustomer: $('jobCustomer'), jobVehicle: $('jobVehicle'), jobService: $('jobService'), vehicleCustomer: $('vehicleCustomer'),
  metricLeads: $('metricLeads'), metricJobs: $('metricJobs'), metricCustomers: $('metricCustomers'), metricServices: $('metricServices'),
  nextJobs: $('nextJobs'), freshLeads: $('freshLeads'), leadsList: $('leadsList'), jobsList: $('jobsList'), customersList: $('customersList'),
  vehiclesList: $('vehiclesList'), servicesList: $('servicesList'), prospectsList: $('prospectsList'),
};

function setMessage(text, isError = false) {
  els.authMessage.textContent = text || '';
  els.authMessage.style.color = isError ? 'var(--danger)' : '';
}

function showAppNotice(text = '', isError = false) {
  if (!els.appNotice) return;
  els.appNotice.textContent = text;
  els.appNotice.classList.toggle('hidden', !text);
  els.appNotice.classList.toggle('error', Boolean(text) && isError);
}

function fmtDate(value) {
  if (!value) return 'No date';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  } catch {
    return 'No date';
  }
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function customerName(customer) {
  return customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer' : 'Customer';
}

function vehicleName(vehicle) {
  if (!vehicle) return '';
  return `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.replace(/\s+/g, ' ').trim() || 'Vehicle';
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
  const titles = {
    dashboard: 'Dashboard', leads: 'Booking Leads', prospects: 'Prospects', jobs: 'Jobs',
    customers: 'Customers', garage: 'Garage', services: 'Services', trade: 'Trade Partners'
  };
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
  const [leads, jobs, customers, vehicles, services, prospects] = await Promise.all([
    db.from('booking_requests').select('id,business_id,created_at,customer_name,phone,email,city,vehicle,service,customer_notes,status,admin_notes,converted_customer_id,converted_at,first_contacted_at,referrer_host,utm_source,utm_medium,utm_campaign').eq('business_id', state.businessId).order('created_at', { ascending: false }).limit(100),
    db.from('jobs').select('id,customer_id,vehicle_id,scheduled_start,scheduled_end,status,address,total,internal_notes,customers(first_name,last_name),vehicles(year,make,model,color,plate)').eq('business_id', state.businessId).order('scheduled_start', { ascending: true }).limit(100),
    db.from('customers').select('id,first_name,last_name,phone,email,address,notes,created_at').eq('business_id', state.businessId).order('created_at', { ascending: false }).limit(200),
    db.from('vehicles').select('id,customer_id,year,make,model,color,plate,vin,notes,created_at,customers(first_name,last_name)').eq('business_id', state.businessId).order('created_at', { ascending: false }).limit(300),
    db.from('services').select('id,name,description,base_price,duration_minutes,active').eq('business_id', state.businessId).order('name'),
    db.from('prospects').select('*').eq('business_id', state.businessId).order('created_at', { ascending: false }).limit(200),
  ]);
  [leads, jobs, customers, vehicles, services, prospects].forEach(result => { if (result.error) throw result.error; });
  state.leads = leads.data || [];
  state.jobs = jobs.data || [];
  state.customers = customers.data || [];
  state.vehicles = vehicles.data || [];
  state.services = services.data || [];
  state.prospects = prospects.data || [];
  render();
}

function render() {
  const upcoming = state.jobs.filter(j => !['completed', 'cancelled'].includes(j.status) && (!j.scheduled_start || new Date(j.scheduled_start) >= new Date(Date.now() - 86400000)));
  els.metricLeads.textContent = state.leads.filter(l => l.status === 'new').length;
  els.metricJobs.textContent = upcoming.length;
  els.metricCustomers.textContent = state.customers.length;
  els.metricServices.textContent = state.services.filter(s => s.active !== false).length;

  renderJobs(els.nextJobs, upcoming.slice(0, 5));
  renderLeads(els.freshLeads, state.leads.slice(0, 5));
  renderLeads(els.leadsList, state.leads);
  renderJobs(els.jobsList, state.jobs);
  renderCustomers();
  renderVehicles();
  renderServices();
  renderProspects();
  fillCustomerSelects();
  fillServiceSelect();
}

function renderJobs(container, jobs) {
  container.replaceChildren();
  if (!jobs.length) return empty(container, 'No jobs yet. Create the first one when you are ready.');
  jobs.forEach(job => {
    const customer = customerName(job.customers);
    const vehicle = vehicleName(job.vehicles);
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
    ['new', 'contacted', 'scheduled', 'completed', 'closed'].forEach(stage => {
      const option = document.createElement('option');
      option.value = stage;
      option.textContent = stage.replaceAll('_', ' ');
      option.selected = lead.status === stage;
      select.appendChild(option);
    });
    select.addEventListener('change', async () => {
      select.disabled = true;
      const { error } = await db.from('booking_requests').update({ status: select.value }).eq('id', lead.id).eq('business_id', state.businessId);
      select.disabled = false;
      if (error) return alert(error.message);
      lead.status = select.value;
      render();
    });
    const source = lead.utm_source || lead.referrer_host || ''; const sub = [lead.vehicle, lead.service, lead.city, lead.phone, source ? `Source: ${source}` : ''].filter(Boolean).join(' • ');
    container.appendChild(row(lead.customer_name, sub, null, select));
  });
}

function renderCustomers() {
  els.customersList.replaceChildren();
  if (!state.customers.length) return empty(els.customersList, 'No customers yet. Add one from the top right.');
  state.customers.forEach(c => {
    const count = state.vehicles.filter(v => v.customer_id === c.id).length;
    const sub = [c.phone, c.email, c.address, count ? `${count} vehicle${count === 1 ? '' : 's'}` : ''].filter(Boolean).join(' • ');
    els.customersList.appendChild(row(customerName(c), sub, null));
  });
}

function renderVehicles() {
  els.vehiclesList.replaceChildren();
  if (!state.vehicles.length) return empty(els.vehiclesList, 'No vehicles yet. Add a customer vehicle to start building real service history.');
  state.vehicles.forEach(v => {
    const owner = customerName(v.customers);
    const sub = [owner, v.color, v.plate ? `Plate ${v.plate}` : '', v.vin ? `VIN ${v.vin}` : ''].filter(Boolean).join(' • ');
    els.vehiclesList.appendChild(row(vehicleName(v), sub, null));
  });
}

function renderServices() {
  els.servicesList.replaceChildren();
  if (!state.services.length) return empty(els.servicesList, 'No service menu yet. Add your real packages and pricing.');
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
    ['new', 'researching', 'contacted', 'follow_up', 'quote_sent', 'won', 'lost'].forEach(stage => {
      const option = document.createElement('option');
      option.value = stage;
      option.textContent = stage.replaceAll('_', ' ');
      option.selected = p.stage === stage;
      select.appendChild(option);
    });
    select.addEventListener('change', async () => {
      select.disabled = true;
      const { error } = await db.from('prospects').update({ stage: select.value, updated_at: new Date().toISOString() }).eq('id', p.id);
      select.disabled = false;
      if (error) return alert(error.message);
      p.stage = select.value;
      renderProspects();
    });
    const sub = [
      p.category,
      [p.city, p.state].filter(Boolean).join(', '),
      p.estimated_vehicles ? `${p.estimated_vehicles} vehicles` : '',
      Number(p.estimated_monthly_value) ? `${money(p.estimated_monthly_value)}/mo est.` : '',
      p.next_follow_up_at ? `Follow up ${fmtDate(p.next_follow_up_at)}` : ''
    ].filter(Boolean).join(' • ');
    els.prospectsList.appendChild(row(p.company_name, sub, null, select));
  });
}

function fillCustomerSelect(select, placeholderText) {
  select.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = state.customers.length ? placeholderText : 'Add a customer first';
  select.appendChild(placeholder);
  state.customers.forEach(c => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = customerName(c);
    select.appendChild(option);
  });
}

function fillCustomerSelects() {
  fillCustomerSelect(els.jobCustomer, 'Choose customer');
  fillCustomerSelect(els.vehicleCustomer, 'Choose customer');
  fillJobVehicleSelect('');
}

function fillJobVehicleSelect(customerId) {
  els.jobVehicle.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = customerId ? 'No vehicle selected' : 'Choose a customer first';
  els.jobVehicle.appendChild(placeholder);
  if (!customerId) return;
  state.vehicles.filter(v => v.customer_id === customerId).forEach(v => {
    const option = document.createElement('option');
    option.value = v.id;
    option.textContent = vehicleName(v);
    els.jobVehicle.appendChild(option);
  });
}

function fillServiceSelect() {
  els.jobService.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'No service selected';
  els.jobService.appendChild(placeholder);
  state.services.filter(s => s.active !== false).forEach(s => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = `${s.name} — ${money(s.base_price)}`;
    els.jobService.appendChild(option);
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
  } catch (error) {
    await db.auth.signOut();
    els.appView.classList.add('hidden');
    els.authView.classList.remove('hidden');
    setMessage(error.message, true);
    return;
  }
  els.authView.classList.add('hidden');
  els.appView.classList.remove('hidden');
  showAppNotice('Loading your shop…');
  try {
    await loadAll();
    showAppNotice();
  } catch (error) {
    console.error('Unable to refresh the owner console.', error);
    showAppNotice('Some shop data could not load. Check your connection and tap Refresh.', true);
  }
}

els.authForm.addEventListener('submit', async event => {
  event.preventDefault();
  setMessage('Signing in…');
  const { error } = await db.auth.signInWithPassword({ email: els.email.value.trim(), password: els.password.value });
  if (error) setMessage(error.message, true);
});

els.signOut.addEventListener('click', () => db.auth.signOut());
els.refreshApp.addEventListener('click', async () => {
  els.refreshApp.disabled = true;
  showAppNotice('Refreshing your shop…');
  try { await loadAll(); showAppNotice(); }
  catch (error) { console.error(error); showAppNotice('Refresh failed. Check your connection and try again.', true); }
  finally { els.refreshApp.disabled = false; }
});
els.nav.addEventListener('click', e => { const btn = e.target.closest('[data-view]'); if (btn) showView(btn.dataset.view); });
document.addEventListener('click', e => { const jump = e.target.closest('[data-jump]'); if (jump) showView(jump.dataset.jump); });
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => btn.closest('dialog').close()));

els.newCustomerBtn.addEventListener('click', () => els.customerDialog.showModal());
els.newProspectBtn.addEventListener('click', () => els.prospectDialog.showModal());
els.addProspectInside.addEventListener('click', () => els.prospectDialog.showModal());
els.newVehicleBtn.addEventListener('click', () => { fillCustomerSelect(els.vehicleCustomer, 'Choose customer'); els.vehicleDialog.showModal(); });
els.newServiceBtn.addEventListener('click', () => els.serviceDialog.showModal());
els.newJobBtn.addEventListener('click', () => {
  fillCustomerSelect(els.jobCustomer, 'Choose customer');
  fillJobVehicleSelect('');
  fillServiceSelect();
  els.jobDialog.showModal();
});
els.jobCustomer.addEventListener('change', () => fillJobVehicleSelect(els.jobCustomer.value));

els.customerForm.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(els.customerForm).entries());
  payload.business_id = state.businessId;
  const { error } = await db.from('customers').insert(payload);
  if (error) return alert(error.message);
  els.customerForm.reset();
  els.customerDialog.close();
  await loadAll();
});

els.vehicleForm.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(els.vehicleForm).entries());
  payload.business_id = state.businessId;
  if (!payload.year) delete payload.year;
  else payload.year = Number(payload.year);
  const { error } = await db.from('vehicles').insert(payload);
  if (error) return alert(error.message);
  els.vehicleForm.reset();
  els.vehicleDialog.close();
  await loadAll();
  showView('garage');
});

els.serviceForm.addEventListener('submit', async e => {
  e.preventDefault();
  const form = new FormData(els.serviceForm);
  const payload = Object.fromEntries(form.entries());
  payload.business_id = state.businessId;
  payload.base_price = Number(payload.base_price || 0);
  payload.duration_minutes = Number(payload.duration_minutes || 60);
  payload.active = form.get('active') === 'on';
  const { error } = await db.from('services').insert(payload);
  if (error) return alert(error.message);
  els.serviceForm.reset();
  els.serviceForm.querySelector('[name="active"]').checked = true;
  els.serviceDialog.close();
  await loadAll();
  showView('services');
});

els.jobForm.addEventListener('submit', async e => {
  e.preventDefault();
  const form = new FormData(els.jobForm);
  const payload = Object.fromEntries(form.entries());
  const serviceId = payload.service_id || null;
  delete payload.service_id;
  payload.business_id = state.businessId;
  const requestedStart = new Date(payload.scheduled_start);
  if (Number.isNaN(requestedStart.getTime())) return alert('Choose a valid job date and time.');
  if (!payload.vehicle_id) delete payload.vehicle_id;

  const selectedService = serviceId ? state.services.find(s => s.id === serviceId) : null;
  const durationMinutes = Math.max(Number(selectedService?.duration_minutes || 120), 30);
  const requestedEnd = new Date(requestedStart.getTime() + durationMinutes * 60000);
  if (requestedStart.getHours() < 8 || requestedEnd.getHours() > 18 || (requestedEnd.getHours() === 18 && requestedEnd.getMinutes() > 0)) {
    return alert('This job would fall outside the normal 8 AM–6 PM service window.');
  }
  const bufferMs = 30 * 60000;
  const conflict = state.jobs.find(job => {
    if (!job.scheduled_start || ['completed','cancelled','no_show'].includes(job.status)) return false;
    const existingStart = new Date(job.scheduled_start).getTime() - bufferMs;
    const existingEnd = new Date(job.scheduled_end || new Date(new Date(job.scheduled_start).getTime() + 2 * 60 * 60000)).getTime() + bufferMs;
    return requestedStart.getTime() < existingEnd && requestedEnd.getTime() > existingStart;
  });
  if (conflict) return alert('That time overlaps another job or the 30-minute mobile travel buffer. Pick a different time.');

  payload.scheduled_start = requestedStart.toISOString();
  payload.scheduled_end = requestedEnd.toISOString();
  if (selectedService) {
    payload.subtotal = Number(selectedService.base_price || 0);
    payload.total = Number(selectedService.base_price || 0);
  }

  const { data: job, error } = await db.from('jobs').insert(payload).select('id').single();
  if (error) return alert(error.message);

  if (selectedService) {
    const price = Number(selectedService.base_price || 0);
    const { error: serviceError } = await db.from('job_services').insert({
      job_id: job.id,
      service_id: selectedService.id,
      name: selectedService.name,
      quantity: 1,
      unit_price: price,
      line_total: price,
    });
    if (serviceError) alert(`Job created, but the service line could not be attached: ${serviceError.message}`);
  }

  els.jobForm.reset();
  els.jobDialog.close();
  await loadAll();
  showView('jobs');
});

els.prospectForm.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(els.prospectForm).entries());
  payload.business_id = state.businessId;
  payload.estimated_vehicles = Number(payload.estimated_vehicles || 0);
  payload.estimated_monthly_value = Number(payload.estimated_monthly_value || 0);
  if (!payload.next_follow_up_at) delete payload.next_follow_up_at;
  else payload.next_follow_up_at = new Date(payload.next_follow_up_at).toISOString();
  const { error } = await db.from('prospects').insert(payload);
  if (error) return alert(error.message);
  els.prospectForm.reset();
  els.prospectDialog.close();
  await loadAll();
  showView('prospects');
});

(async () => {
  const { data } = await db.auth.getSession();
  await bootForSession(data.session);
  db.auth.onAuthStateChange((_event, session) => bootForSession(session));
})();
