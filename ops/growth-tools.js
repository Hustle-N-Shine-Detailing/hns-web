(() => {
  state.estimates = [];
  state.maintenancePlans = [];
  state.followups = [];
  state.expenses = [];

  const style = document.createElement('style');
  style.textContent = `
    .growth-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}
    .growth-card{padding:18px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(180deg,var(--panel),#101012);display:grid;gap:6px}
    .growth-card span{font-size:.76rem;color:var(--muted);font-weight:750}.growth-card strong{font-size:1.7rem}
    .growth-columns{display:grid;grid-template-columns:1fr 1fr;gap:14px}.growth-columns>.panel{min-width:0}
    .growth-actions{display:flex;gap:8px;flex-wrap:wrap}.growth-row-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
    .due-now{color:#f6dc74}.overdue{color:#ff9b9b}.good{color:#8be0ac}.compact-note{font-size:.75rem;color:var(--muted);line-height:1.4}
    #convertEstimateDialog{width:min(560px,calc(100% - 28px))}
    @media(max-width:900px){.growth-summary{grid-template-columns:1fr 1fr}.growth-columns{grid-template-columns:1fr}}
    @media(max-width:520px){.growth-summary{grid-template-columns:1fr 1fr}.growth-card{padding:14px}.growth-card strong{font-size:1.35rem}}
  `;
  document.head.appendChild(style);

  const growthNav = document.createElement('button');
  growthNav.className = 'nav-item';
  growthNav.dataset.view = 'growth';
  growthNav.textContent = 'Growth';
  els.nav.appendChild(growthNav);

  const growthView = document.createElement('section');
  growthView.id = 'growthView';
  growthView.className = 'view hidden';
  growthView.innerHTML = `
    <div id="growthSummary" class="growth-summary"></div>
    <div class="growth-columns">
      <article class="panel">
        <div class="panel-head"><div><h3>Estimates</h3><small>Quote it once, then turn approved work into a job.</small></div><button id="newEstimateBtn" class="btn primary" type="button">+ Estimate</button></div>
        <div id="estimateList" class="list"></div>
      </article>
      <article class="panel">
        <div class="panel-head"><div><h3>Follow-ups</h3><small>Reviews, rebooks and sales follow-through.</small></div><button id="newFollowupBtn" class="btn" type="button">+ Follow-up</button></div>
        <div id="followupList" class="list"></div>
      </article>
      <article class="panel">
        <div class="panel-head"><div><h3>Maintenance plans</h3><small>Keep good customers on a predictable detail schedule.</small></div><button id="newPlanBtn" class="btn" type="button">+ Plan</button></div>
        <div id="planList" class="list"></div>
      </article>
      <article class="panel">
        <div class="panel-head"><div><h3>Expenses & job margin</h3><small>Track what each job actually costs you.</small></div><button id="newExpenseBtn" class="btn" type="button">+ Expense</button></div>
        <div id="expenseList" class="list"></div>
      </article>
    </div>
  `;
  document.querySelector('.main').appendChild(growthView);

  function makeDialog(id, title, body, submitLabel) {
    const dialog = document.createElement('dialog');
    dialog.id = id;
    dialog.innerHTML = `<form class="modal-card"><div class="panel-head"><h3>${title}</h3><button class="icon-btn" type="button" data-growth-close>×</button></div><div class="form-grid">${body}</div><button class="btn primary" type="submit">${submitLabel}</button></form>`;
    document.body.appendChild(dialog);
    dialog.querySelector('[data-growth-close]').addEventListener('click', () => dialog.close());
    return { dialog, form: dialog.querySelector('form') };
  }

  const estimateUI = makeDialog('estimateDialog', 'New estimate', `
    <label class="full">Customer<select name="customer_id" id="estimateCustomer" required></select></label>
    <label class="full">Vehicle<select name="vehicle_id" id="estimateVehicle"><option value="">No vehicle selected</option></select></label>
    <label class="full">Service<select name="service_id" id="estimateService" required></select></label>
    <label>Price<input name="unit_price" id="estimatePrice" type="number" min="0" step="0.01" required /></label>
    <label>Status<select name="status"><option value="draft">Draft</option><option value="sent">Sent</option><option value="approved">Approved</option></select></label>
    <label>Valid until<input name="valid_until" type="date" /></label>
    <label class="full">Notes<textarea name="notes" rows="3" placeholder="Scope, add-ons, paint condition, exclusions…"></textarea></label>
  `, 'Save estimate');

  const planUI = makeDialog('planDialog', 'New maintenance plan', `
    <label class="full">Customer<select name="customer_id" id="planCustomer" required></select></label>
    <label class="full">Vehicle<select name="vehicle_id" id="planVehicle"><option value="">No vehicle selected</option></select></label>
    <label class="full">Service<select name="service_id" id="planService"></select></label>
    <label class="full">Plan name<input name="name" required placeholder="Monthly Maintenance Detail" /></label>
    <label>Every<input name="frequency_weeks" type="number" min="1" max="104" value="4" required /></label>
    <label>weeks</label>
    <label>Plan price<input name="price" id="planPrice" type="number" min="0" step="0.01" value="0" /></label>
    <label>Next due<input name="next_due_at" type="datetime-local" /></label>
    <label class="full">Notes<textarea name="notes" rows="3"></textarea></label>
  `, 'Save maintenance plan');

  const followupUI = makeDialog('followupDialog', 'New follow-up', `
    <label>Type<select name="kind"><option value="review">Review request</option><option value="rebook">Rebook</option><option value="sales">Sales</option><option value="reminder">Reminder</option><option value="note">Note</option></select></label>
    <label>Due<input name="due_at" type="datetime-local" /></label>
    <label class="full">Customer<select name="customer_id" id="followupCustomer"></select></label>
    <label class="full">Prospect<select name="prospect_id" id="followupProspect"></select></label>
    <label class="full">Job<select name="job_id" id="followupJob"></select></label>
    <label class="full">Note<textarea name="note" rows="4" placeholder="What needs to happen next?"></textarea></label>
  `, 'Save follow-up');

  const expenseUI = makeDialog('expenseDialog', 'Add expense', `
    <label class="full">Job<select name="job_id" id="expenseJob"></select></label>
    <label>Category<select name="category"><option value="chemicals">Chemicals</option><option value="fuel">Fuel</option><option value="labor">Labor</option><option value="supplies">Supplies</option><option value="equipment">Equipment</option><option value="marketing">Marketing</option><option value="fees">Fees</option><option value="other">Other</option></select></label>
    <label>Amount<input name="amount" type="number" min="0" step="0.01" required /></label>
    <label>Vendor<input name="vendor" /></label>
    <label>Date<input name="incurred_on" type="date" /></label>
    <label class="full">Description<textarea name="description" rows="3"></textarea></label>
  `, 'Save expense');

  const convertUI = makeDialog('convertEstimateDialog', 'Turn estimate into job', `
    <input name="estimate_id" type="hidden" />
    <label class="full">Schedule<input name="scheduled_start" type="datetime-local" required /></label>
    <label class="full">Service address<input name="address" /></label>
  `, 'Create job');

  const q = id => document.getElementById(id);
  const ui = {
    summary: q('growthSummary'), estimateList: q('estimateList'), followupList: q('followupList'), planList: q('planList'), expenseList: q('expenseList'),
    estimateCustomer: q('estimateCustomer'), estimateVehicle: q('estimateVehicle'), estimateService: q('estimateService'), estimatePrice: q('estimatePrice'),
    planCustomer: q('planCustomer'), planVehicle: q('planVehicle'), planService: q('planService'), planPrice: q('planPrice'),
    followupCustomer: q('followupCustomer'), followupProspect: q('followupProspect'), followupJob: q('followupJob'), expenseJob: q('expenseJob')
  };

  const originalShowView = showView;
  showView = function(name) {
    originalShowView(name);
    if (name === 'growth') els.pageTitle.textContent = 'Growth';
  };

  const originalLoadAll = loadAll;
  loadAll = async function() {
    await originalLoadAll();
    await loadGrowthData();
  };

  async function loadGrowthData() {
    if (!state.businessId) return;
    const [estimateRes, planRes, followupRes, expenseRes] = await Promise.all([
      db.from('estimates').select('id,customer_id,vehicle_id,status,valid_until,notes,subtotal,tax,total,converted_job_id,created_at,customers(first_name,last_name),vehicles(year,make,model),estimate_items(id,service_id,name,quantity,unit_price,line_total)').eq('business_id', state.businessId).order('created_at', { ascending: false }).limit(200),
      db.from('maintenance_plans').select('id,customer_id,vehicle_id,service_id,name,frequency_weeks,price,active,next_due_at,last_completed_at,notes,customers(first_name,last_name),vehicles(year,make,model),services(name)').eq('business_id', state.businessId).order('next_due_at', { ascending: true, nullsFirst: false }).limit(200),
      db.from('followups').select('id,customer_id,prospect_id,job_id,kind,status,due_at,completed_at,note,created_at,customers(first_name,last_name),prospects(company_name),jobs(scheduled_start,vehicles(year,make,model))').eq('business_id', state.businessId).order('due_at', { ascending: true, nullsFirst: false }).limit(300),
      db.from('expenses').select('id,job_id,category,vendor,description,amount,incurred_on,created_at,jobs(id,scheduled_start,total,customers(first_name,last_name),vehicles(year,make,model))').eq('business_id', state.businessId).order('incurred_on', { ascending: false }).limit(300)
    ]);
    for (const result of [estimateRes, planRes, followupRes, expenseRes]) if (result.error) throw result.error;
    state.estimates = estimateRes.data || [];
    state.maintenancePlans = planRes.data || [];
    state.followups = followupRes.data || [];
    state.expenses = expenseRes.data || [];
    renderGrowth();
    fillGrowthSelects();
  }

  function renderGrowth() {
    renderSummary();
    renderEstimates();
    renderPlans();
    renderFollowups();
    renderExpenses();
  }

  function renderSummary() {
    const openEstimates = state.estimates.filter(e => ['draft','sent','approved'].includes(e.status) && !e.converted_job_id);
    const pipeline = openEstimates.reduce((sum, e) => sum + Number(e.total || 0), 0);
    const dueFollowups = state.followups.filter(f => f.status === 'open' && (!f.due_at || new Date(f.due_at) <= new Date())).length;
    const activePlans = state.maintenancePlans.filter(p => p.active).length;
    const expenses = state.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const booked = state.jobs.reduce((sum, j) => sum + Number(j.total || 0), 0);
    const margin = booked - expenses;
    const cards = [
      ['Open estimate value', money(pipeline)],
      ['Follow-ups due', String(dueFollowups)],
      ['Active maintenance', String(activePlans)],
      ['Booked margin', money(margin)]
    ];
    ui.summary.replaceChildren();
    cards.forEach(([label, value]) => {
      const card = document.createElement('article'); card.className = 'growth-card';
      const s = document.createElement('span'); s.textContent = label;
      const strong = document.createElement('strong'); strong.textContent = value;
      card.append(s, strong); ui.summary.appendChild(card);
    });
  }

  function renderEstimates() {
    ui.estimateList.replaceChildren();
    if (!state.estimates.length) return empty(ui.estimateList, 'No estimates yet. Build a quote and turn it into a job when the customer says yes.');
    state.estimates.forEach(est => {
      const actions = document.createElement('div'); actions.className = 'growth-row-actions';
      const pill = document.createElement('span'); pill.className = `pill ${est.status}`; pill.textContent = est.status; actions.appendChild(pill);
      if (!est.converted_job_id && ['draft','sent','approved'].includes(est.status)) {
        const convert = document.createElement('button'); convert.type = 'button'; convert.className = 'btn mini'; convert.textContent = 'Create job';
        convert.addEventListener('click', () => openConvert(est)); actions.appendChild(convert);
      }
      const service = est.estimate_items?.map(i => i.name).join(', ') || 'Estimate';
      const vehicle = est.vehicles ? vehicleName(est.vehicles) : '';
      const expiry = est.valid_until ? `Valid through ${new Date(`${est.valid_until}T12:00:00`).toLocaleDateString()}` : '';
      ui.estimateList.appendChild(row(customerName(est.customers), [service, vehicle, money(est.total), expiry].filter(Boolean).join(' • '), null, actions));
    });
  }

  function renderPlans() {
    ui.planList.replaceChildren();
    if (!state.maintenancePlans.length) return empty(ui.planList, 'No maintenance plans yet. Put your repeat customers on a schedule.');
    state.maintenancePlans.forEach(plan => {
      const due = plan.next_due_at ? new Date(plan.next_due_at) : null;
      const dueText = due ? `Next ${fmtDate(plan.next_due_at)}` : 'Next visit not set';
      const sub = [customerName(plan.customers), plan.vehicles ? vehicleName(plan.vehicles) : '', plan.services?.name || '', `every ${plan.frequency_weeks} wk`, money(plan.price), dueText].filter(Boolean).join(' • ');
      ui.planList.appendChild(row(plan.name, sub, plan.active ? 'active' : 'inactive'));
    });
  }

  function renderFollowups() {
    ui.followupList.replaceChildren();
    const items = [...state.followups].sort((a,b) => {
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
      return new Date(a.due_at || '2999-01-01') - new Date(b.due_at || '2999-01-01');
    });
    if (!items.length) return empty(ui.followupList, 'No follow-ups yet. Completed jobs will automatically queue a review request and a rebook reminder.');
    items.forEach(f => {
      const subject = f.customers ? customerName(f.customers) : (f.prospects?.company_name || (f.jobs?.vehicles ? vehicleName(f.jobs.vehicles) : 'Follow-up'));
      const actions = document.createElement('div'); actions.className = 'growth-row-actions';
      const pill = document.createElement('span'); pill.className = `pill ${f.status}`; pill.textContent = f.status; actions.appendChild(pill);
      if (f.status === 'open') {
        const done = document.createElement('button'); done.type = 'button'; done.className = 'btn mini'; done.textContent = 'Done';
        done.addEventListener('click', () => completeFollowup(f.id)); actions.appendChild(done);
      }
      const due = f.due_at ? fmtDate(f.due_at) : 'No due date';
      ui.followupList.appendChild(row(`${f.kind.replaceAll('_',' ')} — ${subject}`, [due, f.note].filter(Boolean).join(' • '), null, actions));
    });
  }

  function renderExpenses() {
    ui.expenseList.replaceChildren();
    if (!state.expenses.length) return empty(ui.expenseList, 'No expenses logged yet. Add chemicals, fuel, labor, fees and supplies as you use them.');
    state.expenses.slice(0, 80).forEach(exp => {
      const job = exp.jobs;
      const subject = job?.customers ? customerName(job.customers) : (exp.vendor || exp.category);
      const vehicle = job?.vehicles ? vehicleName(job.vehicles) : '';
      ui.expenseList.appendChild(row(`${money(exp.amount)} — ${exp.category}`, [subject, vehicle, exp.vendor, exp.description, exp.incurred_on].filter(Boolean).join(' • '), null));
    });
  }

  function resetSelect(select, label, allowBlank = true) {
    select.replaceChildren();
    if (allowBlank) {
      const option = document.createElement('option'); option.value = ''; option.textContent = label; select.appendChild(option);
    }
  }

  function addOptions(select, items, labelFn) {
    items.forEach(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = labelFn(item); select.appendChild(option); });
  }

  function fillCustomerSelect(select, label) {
    resetSelect(select, label, true); addOptions(select, state.customers, customerName);
  }

  function fillVehicleSelect(select, customerId) {
    resetSelect(select, customerId ? 'No vehicle selected' : 'Choose customer first', true);
    if (customerId) addOptions(select, state.vehicles.filter(v => v.customer_id === customerId), vehicleName);
  }

  function fillGrowthSelects() {
    fillCustomerSelect(ui.estimateCustomer, 'Choose customer');
    fillVehicleSelect(ui.estimateVehicle, '');
    fillCustomerSelect(ui.planCustomer, 'Choose customer');
    fillVehicleSelect(ui.planVehicle, '');
    fillCustomerSelect(ui.followupCustomer, 'No customer');

    resetSelect(ui.estimateService, 'Choose service', true); addOptions(ui.estimateService, state.services.filter(s => s.active !== false), s => `${s.name} — ${money(s.base_price)}`);
    resetSelect(ui.planService, 'No service selected', true); addOptions(ui.planService, state.services.filter(s => s.active !== false), s => `${s.name} — ${money(s.base_price)}`);

    resetSelect(ui.followupProspect, 'No prospect', true); addOptions(ui.followupProspect, state.prospects, p => p.company_name);
    resetSelect(ui.followupJob, 'No job', true); addOptions(ui.followupJob, state.jobs, j => `${customerName(j.customers)} — ${vehicleName(j.vehicles) || fmtDate(j.scheduled_start)}`);
    resetSelect(ui.expenseJob, 'General business expense', true); addOptions(ui.expenseJob, state.jobs, j => `${customerName(j.customers)} — ${vehicleName(j.vehicles) || fmtDate(j.scheduled_start)}`);
  }

  function openEstimate() { fillGrowthSelects(); estimateUI.form.reset(); fillVehicleSelect(ui.estimateVehicle, ''); estimateUI.dialog.showModal(); }
  function openPlan() { fillGrowthSelects(); planUI.form.reset(); fillVehicleSelect(ui.planVehicle, ''); planUI.dialog.showModal(); }
  function openFollowup() { fillGrowthSelects(); followupUI.form.reset(); followupUI.dialog.showModal(); }
  function openExpense() { fillGrowthSelects(); expenseUI.form.reset(); expenseUI.form.elements.incurred_on.value = new Date().toISOString().slice(0,10); expenseUI.dialog.showModal(); }

  q('newEstimateBtn').addEventListener('click', openEstimate);
  q('newPlanBtn').addEventListener('click', openPlan);
  q('newFollowupBtn').addEventListener('click', openFollowup);
  q('newExpenseBtn').addEventListener('click', openExpense);

  ui.estimateCustomer.addEventListener('change', () => fillVehicleSelect(ui.estimateVehicle, ui.estimateCustomer.value));
  ui.planCustomer.addEventListener('change', () => fillVehicleSelect(ui.planVehicle, ui.planCustomer.value));
  ui.estimateService.addEventListener('change', () => {
    const s = state.services.find(service => service.id === ui.estimateService.value);
    if (s) ui.estimatePrice.value = Number(s.base_price || 0).toFixed(2);
  });
  ui.planService.addEventListener('change', () => {
    const s = state.services.find(service => service.id === ui.planService.value);
    if (s) ui.planPrice.value = Number(s.base_price || 0).toFixed(2);
  });

  estimateUI.form.addEventListener('submit', async event => {
    event.preventDefault();
    const fd = new FormData(estimateUI.form);
    const service = state.services.find(s => s.id === fd.get('service_id'));
    if (!service) return alert('Choose a service.');
    const price = Number(fd.get('unit_price') || 0);
    const estimatePayload = {
      business_id: state.businessId,
      customer_id: fd.get('customer_id'),
      vehicle_id: fd.get('vehicle_id') || null,
      status: fd.get('status') || 'draft',
      valid_until: fd.get('valid_until') || null,
      notes: fd.get('notes') || '',
      subtotal: price,
      tax: 0,
      total: price
    };
    const { data: estimate, error } = await db.from('estimates').insert(estimatePayload).select('id').single();
    if (error) return alert(error.message);
    const { error: itemError } = await db.from('estimate_items').insert({
      business_id: state.businessId,
      estimate_id: estimate.id,
      service_id: service.id,
      name: service.name,
      quantity: 1,
      unit_price: price,
      line_total: price
    });
    if (itemError) { await db.from('estimates').delete().eq('id', estimate.id); return alert(itemError.message); }
    estimateUI.dialog.close();
    await loadAll(); showView('growth');
  });

  planUI.form.addEventListener('submit', async event => {
    event.preventDefault();
    const fd = new FormData(planUI.form);
    const payload = {
      business_id: state.businessId,
      customer_id: fd.get('customer_id'),
      vehicle_id: fd.get('vehicle_id') || null,
      service_id: fd.get('service_id') || null,
      name: String(fd.get('name') || '').trim(),
      frequency_weeks: Number(fd.get('frequency_weeks') || 4),
      price: Number(fd.get('price') || 0),
      next_due_at: fd.get('next_due_at') ? new Date(fd.get('next_due_at')).toISOString() : null,
      notes: fd.get('notes') || ''
    };
    const { error } = await db.from('maintenance_plans').insert(payload);
    if (error) return alert(error.message);
    planUI.dialog.close(); await loadAll(); showView('growth');
  });

  followupUI.form.addEventListener('submit', async event => {
    event.preventDefault();
    const fd = new FormData(followupUI.form);
    const customerId = fd.get('customer_id') || null;
    const prospectId = fd.get('prospect_id') || null;
    const jobId = fd.get('job_id') || null;
    if (!customerId && !prospectId && !jobId) return alert('Choose a customer, prospect, or job for this follow-up.');
    const payload = {
      business_id: state.businessId,
      customer_id: customerId,
      prospect_id: prospectId,
      job_id: jobId,
      kind: fd.get('kind') || 'reminder',
      due_at: fd.get('due_at') ? new Date(fd.get('due_at')).toISOString() : null,
      note: fd.get('note') || ''
    };
    const { error } = await db.from('followups').insert(payload);
    if (error) return alert(error.message);
    followupUI.dialog.close(); await loadAll(); showView('growth');
  });

  expenseUI.form.addEventListener('submit', async event => {
    event.preventDefault();
    const fd = new FormData(expenseUI.form);
    const payload = {
      business_id: state.businessId,
      job_id: fd.get('job_id') || null,
      category: fd.get('category') || 'other',
      amount: Number(fd.get('amount') || 0),
      vendor: fd.get('vendor') || '',
      incurred_on: fd.get('incurred_on') || new Date().toISOString().slice(0,10),
      description: fd.get('description') || ''
    };
    const { error } = await db.from('expenses').insert(payload);
    if (error) return alert(error.message);
    expenseUI.dialog.close(); await loadAll(); showView('growth');
  });

  async function completeFollowup(id) {
    const { error } = await db.from('followups').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id);
    if (error) return alert(error.message);
    await loadAll(); showView('growth');
  }

  function openConvert(estimate) {
    convertUI.form.reset();
    convertUI.form.elements.estimate_id.value = estimate.id;
    const customer = state.customers.find(c => c.id === estimate.customer_id);
    if (customer?.address) convertUI.form.elements.address.value = customer.address;
    convertUI.dialog.showModal();
  }

  convertUI.form.addEventListener('submit', async event => {
    event.preventDefault();
    const fd = new FormData(convertUI.form);
    const start = fd.get('scheduled_start');
    if (!start) return alert('Choose the job date and time.');
    const { data, error } = await db.rpc('convert_estimate_to_job', {
      p_estimate_id: fd.get('estimate_id'),
      p_scheduled_start: new Date(start).toISOString(),
      p_address: fd.get('address') || ''
    });
    if (error) return alert(error.message);
    convertUI.dialog.close();
    await loadAll(); showView('jobs');
    if (data) alert('Estimate converted into a scheduled job.');
  });

  if (state.businessId) loadGrowthData().catch(error => console.error(error));
})();
