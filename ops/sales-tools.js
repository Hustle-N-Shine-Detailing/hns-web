(() => {
  state.salesLeadCandidates = state.salesLeadCandidates || [];
  state.salesProspects = state.salesProspects || [];

  const style = document.createElement('style');
  style.textContent = `
    .sales-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
    .sales-metric{padding:16px;border:1px solid var(--line);border-radius:14px;background:#0c0c0e;display:grid;gap:5px}
    .sales-metric span{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.sales-metric strong{font-size:1.55rem}
    .sales-toolbar{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-bottom:14px}.sales-toolbar label{min-width:210px}.sales-track-note{font-size:.76rem;color:var(--muted);padding-bottom:9px}
    .sales-card{padding:16px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start}.sales-card:last-child{border-bottom:0}
    .sales-title{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sales-title h4{margin:0;font-size:1rem}.sales-score,.sales-track{font-size:.7rem;font-weight:800;padding:4px 7px;border:1px solid var(--line);border-radius:999px;background:#111}
    .sales-track{font-weight:700;color:var(--muted)}
    .sales-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:6px;color:var(--muted);font-size:.76rem}.sales-copy{font-size:.82rem;line-height:1.45;margin-top:9px;color:#d0d0d5}.sales-copy strong{color:#fff}
    .sales-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.sales-actions a{text-decoration:none}.sales-due{font-size:.72rem;color:var(--muted);margin-top:7px}.sales-due.overdue{color:var(--danger)}
    @media(max-width:800px){.sales-metrics{grid-template-columns:1fr 1fr}.sales-card{grid-template-columns:1fr}.sales-actions{justify-content:flex-start}.sales-toolbar{display:grid}.sales-toolbar label{min-width:0}}
  `;
  document.head.appendChild(style);

  const nav = document.createElement('button');
  nav.className = 'nav-item';
  nav.dataset.view = 'sales';
  nav.textContent = 'Sales';
  els.nav.appendChild(nav);

  const view = document.createElement('section');
  view.id = 'salesView';
  view.className = 'view hidden';
  view.innerHTML = `
    <div id="salesMetrics" class="sales-metrics"></div>
    <div class="panel">
      <div class="panel-head"><div><h3>Account hunter</h3><small>Work the right sales motion instead of treating every fleet the same.</small></div></div>
      <div class="sales-toolbar">
        <label>Sales lane<select id="salesTrackFilter">
          <option value="quick_close">Quick Close</option>
          <option value="recurring_fleet">Recurring Fleet</option>
          <option value="procurement">Procurement / Whale</option>
          <option value="">All researched leads</option>
        </select></label>
        <div id="salesTrackNote" class="sales-track-note"></div>
      </div>
      <div id="salesHotLeads" class="list"></div>
    </div>
    <div class="panel" style="margin-top:14px">
      <div class="panel-head"><div><h3>Prospect follow-up queue</h3><small>Anything due now or still waiting on the next touch.</small></div></div>
      <div id="salesProspects" class="list"></div>
    </div>`;
  document.querySelector('.main').appendChild(view);

  const metrics = document.getElementById('salesMetrics');
  const hotList = document.getElementById('salesHotLeads');
  const prospectList = document.getElementById('salesProspects');
  const trackFilter = document.getElementById('salesTrackFilter');
  const trackNote = document.getElementById('salesTrackNote');

  const trackLabels = {
    quick_close: 'Quick Close',
    recurring_fleet: 'Recurring Fleet',
    procurement: 'Procurement / Whale'
  };
  const trackNotes = {
    quick_close: 'Local owner/manager. Goal: get a pilot vehicle or small fleet trial quickly.',
    recurring_fleet: 'Route-heavy fleet. Goal: land a monthly rotation with repeatable volume.',
    procurement: 'Longer cycle. Goal: learn vendor rules, get registered, and stay in front of the buyer.'
  };

  const previousShowView = showView;
  showView = function(name) {
    previousShowView(name);
    if (name === 'sales') els.pageTitle.textContent = 'Sales Queue';
  };

  function safePhone(value) {
    return String(value || '').replace(/[^0-9+]/g, '');
  }

  function actionLink(text, href) {
    const a = document.createElement('a');
    a.className = 'btn mini';
    a.textContent = text;
    a.href = href;
    if (/^https?:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }

  function button(text, className, onClick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = className; b.textContent = text; b.addEventListener('click', onClick); return b;
  }

  function fmtDue(value) {
    if (!value) return 'No next action scheduled';
    return `Next action ${fmtDate(value)}`;
  }

  async function loadSalesQueue() {
    if (!state.businessId) return;
    const [leadRes, prospectRes] = await Promise.all([
      db.from('lead_candidates')
        .select('id,company_name,category,phone,email,website,city,state,fit_reason,status,prospect_id,lead_score,suggested_offer,next_action,researched_at,sales_track')
        .eq('business_id', state.businessId)
        .eq('status', 'new')
        .order('lead_score', { ascending: false })
        .limit(200),
      db.from('prospects')
        .select('id,company_name,category,contact_name,phone,email,website,city,state,stage,last_contact_at,next_follow_up_at,estimated_monthly_value,notes')
        .eq('business_id', state.businessId)
        .order('next_follow_up_at', { ascending: true, nullsFirst: true })
        .limit(200)
    ]);
    if (leadRes.error) throw leadRes.error;
    if (prospectRes.error) throw prospectRes.error;
    state.salesLeadCandidates = leadRes.data || [];
    state.salesProspects = prospectRes.data || [];
    renderSalesQueue();
  }

  function renderMetrics() {
    const active = state.salesProspects.filter(p => !['won','lost'].includes(p.stage));
    const now = Date.now();
    const due = active.filter(p => !p.next_follow_up_at || new Date(p.next_follow_up_at).getTime() <= now).length;
    const hot = state.salesLeadCandidates.filter(l => Number(l.lead_score || 0) >= 95).length;
    const quotes = state.salesProspects.filter(p => p.stage === 'quote_sent').length;
    const won = state.salesProspects.filter(p => p.stage === 'won').length;
    const cards = [['95+ leads', hot], ['Due now', due], ['Quotes out', quotes], ['Won', won]];
    metrics.replaceChildren();
    cards.forEach(([label, value]) => {
      const card = document.createElement('article'); card.className = 'sales-metric';
      const l = document.createElement('span'); l.textContent = label;
      const v = document.createElement('strong'); v.textContent = String(value);
      card.append(l, v); metrics.appendChild(card);
    });
  }

  async function promoteLead(item, btn) {
    const old = btn.textContent;
    btn.disabled = true; btn.textContent = 'Adding…';
    try {
      const { data, error } = await db.rpc('promote_lead_candidate', { p_lead_id: item.id });
      if (error) throw error;
      if (!data) throw new Error('Prospect was not created.');
      item.status = 'saved';
      await loadAll();
      await loadSalesQueue();
    } catch (error) {
      alert(error?.message || 'Unable to add this lead to prospects.');
    } finally {
      if (btn.isConnected) { btn.disabled = false; btn.textContent = old; }
    }
  }

  function renderHotLeads() {
    hotList.replaceChildren();
    const selectedTrack = trackFilter.value;
    trackNote.textContent = selectedTrack ? trackNotes[selectedTrack] : 'All sales motions together. Use this only when you want the full research pool.';
    const leads = state.salesLeadCandidates
      .filter(item => !selectedTrack || item.sales_track === selectedTrack)
      .slice()
      .sort((a,b) => Number(b.lead_score || 0) - Number(a.lead_score || 0))
      .slice(0, 25);
    if (!leads.length) return empty(hotList, 'No new leads are waiting in this sales lane.');
    leads.forEach(item => {
      const card = document.createElement('article'); card.className = 'sales-card';
      const copy = document.createElement('div');
      const title = document.createElement('div'); title.className = 'sales-title';
      const h = document.createElement('h4'); h.textContent = item.company_name;
      const score = document.createElement('span'); score.className = 'sales-score'; score.textContent = `${Number(item.lead_score || 0)}/100`;
      const track = document.createElement('span'); track.className = 'sales-track'; track.textContent = trackLabels[item.sales_track] || 'Lead';
      title.append(h, score, track);
      const meta = document.createElement('div'); meta.className = 'sales-meta';
      [item.category, [item.city,item.state].filter(Boolean).join(', '), item.phone].filter(Boolean).forEach(v => { const s=document.createElement('span'); s.textContent=v; meta.appendChild(s); });
      const pitch = document.createElement('div'); pitch.className = 'sales-copy';
      pitch.innerHTML = `<strong>Pitch:</strong> ${escapeHtml(item.suggested_offer || 'Recurring commercial detail service.')}<br><strong>Next:</strong> ${escapeHtml(item.next_action || 'Call the decision maker.')}`;
      const reason = document.createElement('div'); reason.className = 'sales-due'; reason.textContent = item.fit_reason || '';
      copy.append(title, meta, pitch, reason);

      const actions = document.createElement('div'); actions.className = 'sales-actions';
      if (item.phone) actions.appendChild(actionLink('Call', `tel:${safePhone(item.phone)}`));
      if (item.email) actions.appendChild(actionLink('Email', `mailto:${item.email}`));
      if (item.website) actions.appendChild(actionLink('Website', item.website));
      const add = button('Add to prospects', 'btn primary mini', () => promoteLead(item, add));
      actions.appendChild(add);
      card.append(copy, actions); hotList.appendChild(card);
    });
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  async function updateProspect(prospect, changes, btn) {
    if (btn) btn.disabled = true;
    const payload = { ...changes, updated_at: new Date().toISOString() };
    const { error } = await db.from('prospects').update(payload).eq('id', prospect.id).eq('business_id', state.businessId);
    if (btn) btn.disabled = false;
    if (error) return alert(error.message);
    Object.assign(prospect, changes);
    await loadAll();
    await loadSalesQueue();
  }

  function tomorrowIso(days = 1) {
    return new Date(Date.now() + days * 86400000).toISOString();
  }

  function renderProspectQueue() {
    prospectList.replaceChildren();
    const prospects = state.salesProspects
      .filter(p => !['won','lost'].includes(p.stage))
      .sort((a,b) => {
        const aa = a.next_follow_up_at ? new Date(a.next_follow_up_at).getTime() : 0;
        const bb = b.next_follow_up_at ? new Date(b.next_follow_up_at).getTime() : 0;
        return aa - bb;
      });
    if (!prospects.length) return empty(prospectList, 'No active prospects yet. Add a hot lead above.');

    prospects.forEach(p => {
      const card = document.createElement('article'); card.className = 'sales-card';
      const copy = document.createElement('div');
      const title = document.createElement('div'); title.className = 'sales-title';
      const h = document.createElement('h4'); h.textContent = p.company_name;
      const stage = document.createElement('span'); stage.className = `pill ${String(p.stage || 'new').replaceAll('_','-')}`; stage.textContent = String(p.stage || 'new').replaceAll('_',' ');
      title.append(h, stage);
      const meta = document.createElement('div'); meta.className = 'sales-meta';
      [p.category, [p.city,p.state].filter(Boolean).join(', '), p.contact_name, p.phone, Number(p.estimated_monthly_value) ? `${money(p.estimated_monthly_value)}/mo est.` : ''].filter(Boolean).forEach(v => { const s=document.createElement('span'); s.textContent=v; meta.appendChild(s); });
      const due = document.createElement('div'); due.className = 'sales-due';
      const overdue = !p.next_follow_up_at || new Date(p.next_follow_up_at).getTime() <= Date.now();
      if (overdue) due.classList.add('overdue');
      due.textContent = fmtDue(p.next_follow_up_at);
      copy.append(title, meta, due);

      const actions = document.createElement('div'); actions.className = 'sales-actions';
      if (p.phone) actions.appendChild(actionLink('Call', `tel:${safePhone(p.phone)}`));
      if (p.email) actions.appendChild(actionLink('Email', `mailto:${p.email}`));
      if (p.website) actions.appendChild(actionLink('Website', p.website));
      const logCall = button('Log call', 'btn mini', () => updateProspect(p, { stage: 'contacted', last_contact_at: new Date().toISOString(), next_follow_up_at: tomorrowIso(1) }, logCall));
      const tomorrow = button('Follow up tomorrow', 'btn mini', () => updateProspect(p, { stage: 'follow_up', next_follow_up_at: tomorrowIso(1) }, tomorrow));
      const quote = button('Log quote sent', 'btn primary mini', () => updateProspect(p, { stage: 'quote_sent', last_contact_at: new Date().toISOString(), next_follow_up_at: tomorrowIso(2) }, quote));
      actions.append(logCall, tomorrow, quote);
      card.append(copy, actions); prospectList.appendChild(card);
    });
  }

  function renderSalesQueue() {
    renderMetrics();
    renderHotLeads();
    renderProspectQueue();
  }

  trackFilter.addEventListener('change', renderHotLeads);

  const previousLoadAll = loadAll;
  loadAll = async function() {
    await previousLoadAll();
    await loadSalesQueue();
  };

  if (state.businessId) loadSalesQueue().catch(error => console.error('Sales queue load failed', error));
})();
