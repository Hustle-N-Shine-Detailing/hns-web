(() => {
  state.invoices = [];

  const style = document.createElement('style');
  style.textContent = `
    .job-actions{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
    .btn.mini{padding:7px 10px;font-size:.72rem;border-radius:9px}
    .money-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}
    .money-card{padding:18px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(180deg,var(--panel),#101012);display:grid;gap:6px}
    .money-card span{font-size:.76rem;color:var(--muted);font-weight:750}.money-card strong{font-size:1.7rem}
    .job-detail{padding:22px;display:grid;gap:18px}.job-detail-head{display:flex;justify-content:space-between;gap:14px;align-items:start}
    .job-detail-title{font-size:1.4rem;margin:3px 0}.detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .detail-box{background:#0c0c0e;border:1px solid var(--line);border-radius:13px;padding:12px;display:grid;gap:4px}.detail-box span{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.detail-box strong{font-size:.9rem}
    .tool-section{border-top:1px solid var(--line);padding-top:17px}.tool-section h4{margin:0 0 12px}.section-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .photo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:12px}.photo-card{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#0b0b0d}.photo-card img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}.photo-meta{padding:8px;font-size:.72rem;color:var(--muted)}
    .compact-fields{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.compact-fields .wide{grid-column:1/-1}.check-line{display:flex;gap:8px;align-items:center}.check-line input{width:auto}
    .upload-line{display:grid;grid-template-columns:150px 1fr auto;gap:8px;align-items:end}
    .invoice-box{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid var(--line);border-radius:14px;padding:14px;background:#0c0c0e}
    #jobDetailDialog{width:min(860px,calc(100% - 24px));max-height:92vh;overflow:auto}
    @media(max-width:900px){.sidebar nav{grid-template-columns:repeat(4,1fr)!important}.main{padding-bottom:145px!important}.money-grid{grid-template-columns:1fr 1fr}.photo-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:560px){.detail-grid,.compact-fields{grid-template-columns:1fr 1fr}.upload-line{grid-template-columns:1fr}.photo-grid{grid-template-columns:1fr 1fr}.money-grid{grid-template-columns:1fr 1fr}.job-detail{padding:16px}.job-detail-head{display:grid}}
  `;
  document.head.appendChild(style);

  const moneyNav = document.createElement('button');
  moneyNav.className = 'nav-item';
  moneyNav.dataset.view = 'money';
  moneyNav.textContent = 'Money';
  els.nav.appendChild(moneyNav);

  const moneyView = document.createElement('section');
  moneyView.id = 'moneyView';
  moneyView.className = 'view hidden';
  moneyView.innerHTML = `
    <div id="moneySummary" class="money-grid"></div>
    <div class="panel"><div class="panel-head"><div><h3>Invoices & payments</h3><small>Create invoices from jobs and track what is still owed.</small></div></div><div id="invoiceList" class="list"></div></div>
  `;
  document.querySelector('.main').appendChild(moneyView);

  const dialog = document.createElement('dialog');
  dialog.id = 'jobDetailDialog';
  dialog.innerHTML = `
    <div class="job-detail">
      <div class="job-detail-head">
        <div><div class="eyebrow">JOB WORKSPACE</div><h3 id="jdTitle" class="job-detail-title">Job</h3><div id="jdSub" class="muted"></div></div>
        <div class="section-actions"><select id="jdStatus" class="status-select"></select><button class="icon-btn" type="button" id="jdClose">×</button></div>
      </div>
      <div class="detail-grid">
        <div class="detail-box"><span>Customer</span><strong id="jdCustomer">—</strong></div>
        <div class="detail-box"><span>Vehicle</span><strong id="jdVehicle">—</strong></div>
        <div class="detail-box"><span>Job total</span><strong id="jdTotal">$0</strong></div>
      </div>
      <section class="tool-section"><h4>Invoice</h4><div id="jdInvoice"></div></section>
      <section class="tool-section">
        <h4>Vehicle check-in / inspection</h4>
        <form id="inspectionForm" class="compact-fields">
          <label>Odometer<input name="odometer" type="number" min="0" /></label>
          <label>Fuel<select name="fuel_level"><option value="">Not noted</option><option value="empty">Empty</option><option value="quarter">¼</option><option value="half">½</option><option value="three_quarters">¾</option><option value="full">Full</option></select></label>
          <label>Keys received<input name="keys_received" type="number" min="0" max="10" value="1" /></label>
          <label class="wide">Pre-existing damage<textarea name="preexisting_damage" rows="3" placeholder="Scratches, dents, curb rash, cracked trim, stains…"></textarea></label>
          <label class="wide">Exterior notes<textarea name="exterior_notes" rows="2"></textarea></label>
          <label class="wide">Interior notes<textarea name="interior_notes" rows="2"></textarea></label>
          <label class="wide">Customer / authorization name<input name="customer_signature_name" placeholder="Name confirming condition / work authorization" /></label>
          <label class="wide check-line"><input name="customer_authorized" type="checkbox" /> Customer authorized the work and condition record</label>
          <div class="wide"><button class="btn primary" type="submit">Save inspection</button></div>
        </form>
      </section>
      <section class="tool-section">
        <h4>Job photos</h4>
        <div class="upload-line">
          <label>Photo type<select id="photoKind"><option value="before">Before</option><option value="damage">Damage</option><option value="after">After</option><option value="other">Other</option></select></label>
          <label>Photo<input id="photoFile" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" /></label>
          <button id="uploadPhotoBtn" class="btn primary" type="button">Upload photo</button>
        </div>
        <div id="photoGrid" class="photo-grid"></div>
      </section>
    </div>
  `;
  document.body.appendChild(dialog);

  const x = id => document.getElementById(id);
  const extra = {
    moneySummary: x('moneySummary'), invoiceList: x('invoiceList'), dialog,
    title: x('jdTitle'), sub: x('jdSub'), customer: x('jdCustomer'), vehicle: x('jdVehicle'), total: x('jdTotal'),
    status: x('jdStatus'), invoice: x('jdInvoice'), inspectionForm: x('inspectionForm'), photoKind: x('photoKind'), photoFile: x('photoFile'), photoGrid: x('photoGrid'), uploadPhotoBtn: x('uploadPhotoBtn')
  };

  let activeJobId = null;
  let activeJob = null;

  const originalShowView = showView;
  showView = function(name) {
    originalShowView(name);
    if (name === 'money') els.pageTitle.textContent = 'Money';
  };

  const originalLoadAll = loadAll;
  loadAll = async function() {
    await originalLoadAll();
    await loadOpsExtras();
  };

  renderJobs = function(container, jobs) {
    container.replaceChildren();
    if (!jobs.length) return empty(container, 'No jobs yet. Create the first one when you are ready.');
    jobs.forEach(job => {
      const customer = customerName(job.customers);
      const vehicle = vehicleName(job.vehicles);
      const sub = [fmtDate(job.scheduled_start), vehicle, job.address, Number(job.total) ? money(job.total) : ''].filter(Boolean).join(' • ');
      const actions = document.createElement('div');
      actions.className = 'job-actions';
      const pill = document.createElement('span');
      pill.className = `pill ${String(job.status || '').replaceAll('_', '-')}`;
      pill.textContent = String(job.status || 'scheduled').replaceAll('_', ' ');
      const open = document.createElement('button');
      open.className = 'btn mini';
      open.type = 'button';
      open.textContent = 'Open job';
      open.addEventListener('click', () => openJob(job.id));
      actions.append(pill, open);
      container.appendChild(row(customer, sub, null, actions));
    });
  };

  async function loadOpsExtras() {
    if (!state.businessId) return;
    const { data, error } = await db.from('invoices')
      .select('id,job_id,invoice_number,status,amount_due,amount_paid,due_at,paid_at,created_at,jobs(id,scheduled_start,total,customers(first_name,last_name),vehicles(year,make,model))')
      .eq('business_id', state.businessId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    state.invoices = data || [];
    renderMoney();
    renderJobs(els.nextJobs, state.jobs.filter(j => !['completed','cancelled'].includes(j.status)).slice(0, 5));
    renderJobs(els.jobsList, state.jobs);
  }

  function renderMoney() {
    const paid = state.invoices.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0);
    const due = state.invoices.reduce((sum, inv) => sum + Math.max(0, Number(inv.amount_due || 0) - Number(inv.amount_paid || 0)), 0);
    const jobValue = state.jobs.reduce((sum, job) => sum + Number(job.total || 0), 0);
    const cards = [
      ['Booked job value', money(jobValue)], ['Collected', money(paid)], ['Outstanding', money(due)], ['Invoices', String(state.invoices.length)]
    ];
    extra.moneySummary.replaceChildren();
    cards.forEach(([label, value]) => {
      const card = document.createElement('article'); card.className = 'money-card';
      const l = document.createElement('span'); l.textContent = label;
      const v = document.createElement('strong'); v.textContent = value;
      card.append(l, v); extra.moneySummary.appendChild(card);
    });

    extra.invoiceList.replaceChildren();
    if (!state.invoices.length) return empty(extra.invoiceList, 'No invoices yet. Open a job and create its invoice when you are ready.');
    state.invoices.forEach(inv => {
      const actions = document.createElement('div'); actions.className = 'job-actions';
      const pill = document.createElement('span'); pill.className = `pill ${inv.status}`; pill.textContent = inv.status;
      const open = document.createElement('button'); open.className = 'btn mini'; open.textContent = 'Open job'; open.type = 'button'; open.addEventListener('click', () => openJob(inv.job_id));
      actions.append(pill, open);
      const name = inv.jobs?.customers ? customerName(inv.jobs.customers) : `Invoice #${inv.invoice_number}`;
      const vehicle = inv.jobs?.vehicles ? vehicleName(inv.jobs.vehicles) : '';
      const balance = Math.max(0, Number(inv.amount_due || 0) - Number(inv.amount_paid || 0));
      extra.invoiceList.appendChild(row(`#${inv.invoice_number} — ${name}`, [vehicle, `${money(inv.amount_due)} due`, balance ? `${money(balance)} balance` : 'Paid'].filter(Boolean).join(' • '), null, actions));
    });
  }

  async function openJob(jobId) {
    activeJobId = jobId;
    const [jobRes, invoiceRes, inspectionRes, photoRes] = await Promise.all([
      db.from('jobs').select('id,business_id,customer_id,vehicle_id,scheduled_start,status,address,total,subtotal,customer_notes,internal_notes,customers(first_name,last_name,phone,email),vehicles(year,make,model,color,plate,vin),job_services(name,quantity,unit_price,line_total)').eq('id', jobId).single(),
      db.from('invoices').select('*').eq('job_id', jobId).maybeSingle(),
      db.from('job_inspections').select('*').eq('job_id', jobId).maybeSingle(),
      db.from('job_photos').select('id,storage_path,kind,caption,created_at').eq('job_id', jobId).order('created_at', { ascending: false })
    ]);
    for (const result of [jobRes, invoiceRes, inspectionRes, photoRes]) if (result.error) return alert(result.error.message);
    activeJob = jobRes.data;
    renderJobHeader(activeJob);
    renderInvoice(invoiceRes.data);
    fillInspection(inspectionRes.data);
    await renderPhotos(photoRes.data || []);
    extra.dialog.showModal();
  }

  function renderJobHeader(job) {
    const customer = customerName(job.customers);
    const vehicle = vehicleName(job.vehicles) || 'Vehicle not selected';
    const serviceNames = (job.job_services || []).map(s => s.name).join(', ');
    extra.title.textContent = vehicle;
    extra.sub.textContent = [fmtDate(job.scheduled_start), serviceNames, job.address].filter(Boolean).join(' • ');
    extra.customer.textContent = customer;
    extra.vehicle.textContent = [vehicle, job.vehicles?.color, job.vehicles?.plate ? `Plate ${job.vehicles.plate}` : ''].filter(Boolean).join(' • ');
    extra.total.textContent = money(job.total);
    extra.status.replaceChildren();
    ['scheduled','confirmed','in_progress','completed','cancelled'].forEach(status => {
      const option = document.createElement('option'); option.value = status; option.textContent = status.replaceAll('_',' '); option.selected = job.status === status; extra.status.appendChild(option);
    });
  }

  function renderInvoice(invoice) {
    extra.invoice.replaceChildren();
    const box = document.createElement('div'); box.className = 'invoice-box';
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    const detail = document.createElement('div'); detail.className = 'muted'; detail.style.marginTop = '4px';
    const actions = document.createElement('div'); actions.className = 'section-actions';
    if (!invoice) {
      title.textContent = 'No invoice yet'; detail.textContent = `Create an invoice from this job total (${money(activeJob?.total)}).`;
      const create = document.createElement('button'); create.className = 'btn primary'; create.type = 'button'; create.textContent = 'Create invoice';
      create.addEventListener('click', createInvoice);
      actions.appendChild(create);
    } else {
      title.textContent = `Invoice #${invoice.invoice_number}`;
      const balance = Math.max(0, Number(invoice.amount_due || 0) - Number(invoice.amount_paid || 0));
      detail.textContent = `${money(invoice.amount_due)} total • ${money(invoice.amount_paid)} paid • ${money(balance)} balance`;
      const pill = document.createElement('span'); pill.className = `pill ${invoice.status}`; pill.textContent = invoice.status; actions.appendChild(pill);
      if (invoice.status !== 'paid' && invoice.status !== 'void') {
        const paid = document.createElement('button'); paid.className = 'btn primary'; paid.type = 'button'; paid.textContent = 'Mark paid';
        paid.addEventListener('click', () => markPaid(invoice)); actions.appendChild(paid);
      }
    }
    copy.append(title, detail); box.append(copy, actions); extra.invoice.appendChild(box);
  }

  async function createInvoice() {
    if (!activeJob) return;
    const amount = Number(activeJob.total || 0);
    const { error } = await db.from('invoices').insert({ business_id: state.businessId, job_id: activeJob.id, status: 'draft', amount_due: amount, amount_paid: 0 });
    if (error) return alert(error.message);
    await loadOpsExtras();
    await openJob(activeJob.id);
  }

  async function markPaid(invoice) {
    const amount = Number(invoice.amount_due || 0);
    const { error } = await db.from('invoices').update({ status: 'paid', amount_paid: amount, paid_at: new Date().toISOString() }).eq('id', invoice.id);
    if (error) return alert(error.message);
    await loadOpsExtras();
    await openJob(activeJobId);
  }

  function fillInspection(record) {
    const f = extra.inspectionForm.elements;
    f.odometer.value = record?.odometer ?? '';
    f.fuel_level.value = record?.fuel_level ?? '';
    f.keys_received.value = record?.keys_received ?? 1;
    f.preexisting_damage.value = record?.preexisting_damage ?? '';
    f.exterior_notes.value = record?.exterior_notes ?? '';
    f.interior_notes.value = record?.interior_notes ?? '';
    f.customer_signature_name.value = record?.customer_signature_name ?? '';
    f.customer_authorized.checked = Boolean(record?.customer_authorized);
  }

  extra.inspectionForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!activeJobId) return;
    const form = new FormData(extra.inspectionForm);
    const authorized = form.get('customer_authorized') === 'on';
    if (authorized && !String(form.get('customer_signature_name') || '').trim()) return alert('Enter the customer / authorization name before marking the inspection authorized.');
    const payload = {
      business_id: state.businessId,
      job_id: activeJobId,
      odometer: form.get('odometer') ? Number(form.get('odometer')) : null,
      fuel_level: form.get('fuel_level') || '',
      keys_received: Number(form.get('keys_received') || 1),
      preexisting_damage: form.get('preexisting_damage') || '',
      exterior_notes: form.get('exterior_notes') || '',
      interior_notes: form.get('interior_notes') || '',
      customer_signature_name: form.get('customer_signature_name') || '',
      customer_authorized: authorized,
      completed_at: authorized ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };
    const { error } = await db.from('job_inspections').upsert(payload, { onConflict: 'job_id' });
    if (error) return alert(error.message);
    alert('Inspection saved.');
  });

  async function queueCompletionFollowups(job) {
    if (!job?.id || !job?.customer_id) return;
    const { data: existing, error: existingError } = await db.from('followups')
      .select('kind')
      .eq('business_id', state.businessId)
      .eq('job_id', job.id)
      .in('kind', ['review', 'rebook']);
    if (existingError) throw existingError;
    const kinds = new Set((existing || []).map(item => item.kind));
    const now = Date.now();
    const rows = [];
    if (!kinds.has('review')) rows.push({ business_id: state.businessId, customer_id: job.customer_id, job_id: job.id, kind: 'review', status: 'open', due_at: new Date(now + 24 * 60 * 60 * 1000).toISOString(), note: 'Ask for a Google review after the completed detail.' });
    if (!kinds.has('rebook')) rows.push({ business_id: state.businessId, customer_id: job.customer_id, job_id: job.id, kind: 'rebook', status: 'open', due_at: new Date(now + 42 * 24 * 60 * 60 * 1000).toISOString(), note: 'Check whether the customer is ready for another maintenance detail.' });
    if (!rows.length) return;
    const { error } = await db.from('followups').insert(rows);
    if (error) throw error;
  }

  extra.status.addEventListener('change', async () => {
    if (!activeJobId) return;
    const nextStatus = extra.status.value;
    extra.status.disabled = true;
    const { error } = await db.from('jobs').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', activeJobId);
    extra.status.disabled = false;
    if (error) return alert(error.message);
    if (activeJob) activeJob.status = nextStatus;
    if (nextStatus === 'completed' && activeJob) {
      try { await queueCompletionFollowups(activeJob); }
      catch (followupError) { showAppNotice('Job completed, but the automatic review/rebook follow-ups could not be queued: ' + followupError.message, true); }
    }
    await loadAll();
  });

  extra.uploadPhotoBtn.addEventListener('click', async () => {
    if (!activeJobId) return;
    const file = extra.photoFile.files?.[0];
    if (!file) return alert('Choose a photo first.');
    extra.uploadPhotoBtn.disabled = true; extra.uploadPhotoBtn.textContent = 'Uploading…';
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${state.businessId}/${activeJobId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await db.storage.from('job-photos').upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) { extra.uploadPhotoBtn.disabled = false; extra.uploadPhotoBtn.textContent = 'Upload photo'; return alert(uploadError.message); }
    const { error: metaError } = await db.from('job_photos').insert({ business_id: state.businessId, job_id: activeJobId, storage_path: path, kind: extra.photoKind.value, caption: '' });
    if (metaError) {
      await db.storage.from('job-photos').remove([path]);
      extra.uploadPhotoBtn.disabled = false; extra.uploadPhotoBtn.textContent = 'Upload photo'; return alert(metaError.message);
    }
    extra.photoFile.value = '';
    extra.uploadPhotoBtn.disabled = false; extra.uploadPhotoBtn.textContent = 'Upload photo';
    await openJob(activeJobId);
  });

  async function renderPhotos(photos) {
    extra.photoGrid.replaceChildren();
    if (!photos.length) {
      const note = document.createElement('div'); note.className = 'empty'; note.style.gridColumn = '1/-1'; note.textContent = 'No job photos yet. Start with before and damage documentation.'; extra.photoGrid.appendChild(note); return;
    }
    const signed = await Promise.all(photos.map(async photo => {
      const { data } = await db.storage.from('job-photos').createSignedUrl(photo.storage_path, 3600);
      return { ...photo, url: data?.signedUrl || '' };
    }));
    signed.forEach(photo => {
      const card = document.createElement('article'); card.className = 'photo-card';
      if (photo.url) { const img = document.createElement('img'); img.src = photo.url; img.alt = `${photo.kind} job photo`; card.appendChild(img); }
      const meta = document.createElement('div'); meta.className = 'photo-meta'; meta.textContent = `${photo.kind.toUpperCase()} • ${fmtDate(photo.created_at)}`; card.appendChild(meta); extra.photoGrid.appendChild(card);
    });
  }

  x('jdClose').addEventListener('click', () => extra.dialog.close());
  extra.dialog.addEventListener('close', () => { activeJobId = null; activeJob = null; });

  if (state.businessId) {
    loadOpsExtras().then(() => render()).catch(error => console.error(error));
  }
})();