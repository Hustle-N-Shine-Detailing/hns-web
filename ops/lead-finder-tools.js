(() => {
  state.leadCandidates = state.leadCandidates || [];

  const style = document.createElement('style');
  style.textContent = `
    .lead-finder-controls{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:10px;margin-bottom:14px}
    .lead-candidate{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start;padding:16px;border-bottom:1px solid var(--line)}
    .lead-candidate:last-child{border-bottom:0}.lead-candidate h4{margin:0 0 6px;font-size:1rem}.lead-meta{display:flex;gap:7px;flex-wrap:wrap;color:var(--muted);font-size:.76rem}.lead-reason{margin-top:8px;font-size:.82rem;line-height:1.45;color:#c9c9cf}.lead-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.lead-count{font-size:.78rem;color:var(--muted)}
    @media(max-width:700px){.lead-finder-controls{grid-template-columns:1fr}.lead-candidate{grid-template-columns:1fr}.lead-actions{justify-content:flex-start}}
  `;
  document.head.appendChild(style);

  const nav = document.createElement('button');
  nav.className = 'nav-item';
  nav.dataset.view = 'leadFinder';
  nav.textContent = 'Lead Finder';
  els.nav.appendChild(nav);

  const view = document.createElement('section');
  view.id = 'leadFinderView';
  view.className = 'view hidden';
  view.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <div><h3>Lead Finder</h3><small>Boise + Treasure Valley businesses that could turn into recurring detailing accounts.</small></div>
        <span id="leadFinderCount" class="lead-count"></span>
      </div>
      <div class="lead-finder-controls">
        <label>Search<input id="leadFinderSearch" type="search" placeholder="Company, category, city…" /></label>
        <label>Category<select id="leadFinderCategory"><option value="">All categories</option></select></label>
        <label>City<select id="leadFinderCity"><option value="">All cities</option></select></label>
      </div>
      <div id="leadFinderList" class="list"></div>
    </div>`;
  document.querySelector('.main').appendChild(view);

  const search = document.getElementById('leadFinderSearch');
  const category = document.getElementById('leadFinderCategory');
  const city = document.getElementById('leadFinderCity');
  const list = document.getElementById('leadFinderList');
  const count = document.getElementById('leadFinderCount');

  const previousShowView = showView;
  showView = function(name) {
    previousShowView(name);
    if (name === 'leadFinder') els.pageTitle.textContent = 'Lead Finder';
  };

  function unique(values) {
    return [...new Set(values.filter(Boolean))].sort((a,b) => a.localeCompare(b));
  }

  function fillFilters() {
    const selectedCategory = category.value;
    const selectedCity = city.value;
    category.innerHTML = '<option value="">All categories</option>';
    city.innerHTML = '<option value="">All cities</option>';
    unique(state.leadCandidates.map(item => item.category)).forEach(value => {
      const option = document.createElement('option'); option.value = value; option.textContent = value; category.appendChild(option);
    });
    unique(state.leadCandidates.map(item => item.city)).forEach(value => {
      const option = document.createElement('option'); option.value = value; option.textContent = value; city.appendChild(option);
    });
    if ([...category.options].some(o => o.value === selectedCategory)) category.value = selectedCategory;
    if ([...city.options].some(o => o.value === selectedCity)) city.value = selectedCity;
  }

  function filteredLeads() {
    const term = search.value.trim().toLowerCase();
    return state.leadCandidates.filter(item => {
      if (item.status !== 'new') return false;
      if (category.value && item.category !== category.value) return false;
      if (city.value && item.city !== city.value) return false;
      if (!term) return true;
      return [item.company_name,item.category,item.city,item.phone,item.fit_reason].some(value => String(value || '').toLowerCase().includes(term));
    });
  }

  function makeButton(text, className, onClick) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = className; button.textContent = text; button.addEventListener('click', onClick); return button;
  }

  async function promote(item, button) {
    button.disabled = true; button.textContent = 'Adding…';
    const { error } = await db.rpc('promote_lead_candidate', { p_lead_id: item.id });
    if (error) { button.disabled = false; button.textContent = 'Add to prospects'; return alert(error.message); }
    item.status = 'saved';
    await loadAll();
    await loadLeadCandidates();
    showView('prospects');
  }

  async function dismiss(item, button) {
    button.disabled = true;
    const { error } = await db.from('lead_candidates').update({ status: 'dismissed', updated_at: new Date().toISOString() }).eq('id', item.id).eq('business_id', state.businessId);
    if (error) { button.disabled = false; return alert(error.message); }
    item.status = 'dismissed'; renderLeadFinder();
  }

  function renderLeadFinder() {
    const leads = filteredLeads();
    count.textContent = `${leads.length} ready to review`;
    list.replaceChildren();
    if (!leads.length) return empty(list, 'No matching leads in this batch. Clear the filters or load another research batch.');

    leads.forEach(item => {
      const card = document.createElement('article'); card.className = 'lead-candidate';
      const copy = document.createElement('div');
      const title = document.createElement('h4'); title.textContent = item.company_name;
      const meta = document.createElement('div'); meta.className = 'lead-meta';
      [item.category, [item.city,item.state].filter(Boolean).join(', '), item.phone].filter(Boolean).forEach(value => {
        const span = document.createElement('span'); span.textContent = value; meta.appendChild(span);
      });
      const reason = document.createElement('div'); reason.className = 'lead-reason'; reason.textContent = item.fit_reason || 'Potential local commercial account.';
      copy.append(title, meta, reason);
      if (item.website) {
        const link = document.createElement('a'); link.href = item.website; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Website'; link.className = 'text-btn'; copy.appendChild(link);
      }

      const actions = document.createElement('div'); actions.className = 'lead-actions';
      const add = makeButton('Add to prospects', 'btn primary mini', () => promote(item, add));
      const skip = makeButton('Dismiss', 'btn mini', () => dismiss(item, skip));
      actions.append(add, skip);
      card.append(copy, actions); list.appendChild(card);
    });
  }

  async function loadLeadCandidates() {
    if (!state.businessId) return;
    const { data, error } = await db.from('lead_candidates')
      .select('id,company_name,category,phone,email,website,address,city,state,fit_reason,status,prospect_id,created_at')
      .eq('business_id', state.businessId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    state.leadCandidates = data || [];
    fillFilters();
    renderLeadFinder();
  }

  search.addEventListener('input', renderLeadFinder);
  category.addEventListener('change', renderLeadFinder);
  city.addEventListener('change', renderLeadFinder);

  const previousLoadAll = loadAll;
  loadAll = async function() {
    await previousLoadAll();
    await loadLeadCandidates();
  };

  if (state.businessId) loadLeadCandidates().catch(error => console.error(error));
})();
