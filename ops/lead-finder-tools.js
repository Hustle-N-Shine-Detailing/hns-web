(() => {
  state.leadCandidates = state.leadCandidates || [];

  const style = document.createElement('style');
  style.textContent = `
    .finder-hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:14px;margin-bottom:14px}
    .finder-intro{padding:22px;background:linear-gradient(135deg,#1b180b,#111114 58%);border:1px solid #594d21;border-radius:18px}.finder-intro h3{font-size:1.35rem;margin:4px 0 8px}.finder-intro p{margin:0;color:#c8c8ce;line-height:1.55;font-size:.88rem}.finder-intro .split{margin-top:16px}
    .finder-plan{padding:18px;border:1px solid var(--line);border-radius:18px;background:#101012}.finder-plan h3{margin:0 0 10px}.finder-plan ol{padding-left:20px;margin:0;display:grid;gap:8px;color:#d4d4d8;font-size:.82rem;line-height:1.4}.finder-plan strong{color:var(--accent)}
    .finder-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.finder-metric{padding:15px;border:1px solid var(--line);border-radius:14px;background:#0c0c0e;display:grid;gap:5px}.finder-metric span{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.07em}.finder-metric strong{font-size:1.45rem}
    .lead-finder-controls{display:grid;grid-template-columns:1.35fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px}
    .lead-candidate{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start;padding:16px;border-bottom:1px solid var(--line)}
    .lead-candidate:last-child{border-bottom:0}.lead-title{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lead-title h4{margin:0;font-size:1rem}.lead-score,.lead-track{font-size:.7rem;font-weight:850;padding:4px 7px;border:1px solid var(--line);border-radius:999px;background:#111}.lead-score.hot{border-color:#806f29;color:#f6dc74;background:#27220f}.lead-track{font-weight:700;color:var(--muted)}
    .lead-meta{display:flex;gap:7px;flex-wrap:wrap;color:var(--muted);font-size:.76rem;margin-top:7px}.lead-reason{margin-top:8px;font-size:.82rem;line-height:1.45;color:#c9c9cf}.lead-pitch{margin-top:9px;padding:10px 12px;border-left:3px solid #5a4e23;background:#101012;color:#d9d9dc;font-size:.8rem;line-height:1.45}.lead-pitch strong{color:#fff}.lead-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.lead-actions a{text-decoration:none}.lead-count{font-size:.78rem;color:var(--muted)}
    .opportunity-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.opportunity-card{display:grid;align-content:space-between;gap:12px;padding:16px;border:1px solid var(--line);border-radius:14px;background:#0c0c0e}.opportunity-card h4{margin:0;font-size:.92rem}.opportunity-card p{margin:6px 0 0;color:var(--muted);font-size:.76rem;line-height:1.45}.opportunity-card a{text-decoration:none;text-align:center}
    @media(max-width:1000px){.finder-hero{grid-template-columns:1fr}.opportunity-grid{grid-template-columns:1fr 1fr}.lead-finder-controls{grid-template-columns:1fr 1fr}.finder-metrics{grid-template-columns:1fr 1fr}}
    @media(max-width:700px){.lead-finder-controls,.opportunity-grid{grid-template-columns:1fr}.lead-candidate{grid-template-columns:1fr}.lead-actions{justify-content:flex-start}.finder-intro{padding:18px}}
  `;
  document.head.appendChild(style);

  const nav = document.createElement('button');
  nav.className = 'nav-item';
  nav.dataset.view = 'leadFinder';
  nav.textContent = 'Find Jobs';
  els.nav.appendChild(nav);

  const view = document.createElement('section');
  view.id = 'leadFinderView';
  view.className = 'view hidden';
  view.innerHTML = `
    <div class="finder-hero">
      <article class="finder-intro">
        <div class="eyebrow">YOUR NEXT PAYING ACCOUNT</div>
        <h3>Work the list. Land the job.</h3>
        <p>These are real Treasure Valley businesses already researched for Hustle & Shine. Start with the highest score, contact the decision maker, and move every serious lead into Prospects.</p>
        <div class="split"><button id="startCallingBtn" class="btn primary" type="button">Start with hottest lead</button><button id="openSalesQueueBtn" class="btn" type="button">Open follow-up queue</button></div>
      </article>
      <article class="finder-plan">
        <h3>Daily money plan</h3>
        <ol><li><strong>10 calls</strong> to high-score businesses</li><li><strong>10 emails</strong> with one simple fleet offer</li><li><strong>5 follow-ups</strong> from your Sales queue</li><li><strong>1 quote</strong> before you stop for the day</li></ol>
      </article>
    </div>
    <div id="leadFinderMetrics" class="finder-metrics"></div>
    <div class="panel">
      <div class="panel-head">
        <div><h3>Local job leads</h3><small>Boise + Treasure Valley businesses that could become recurring detailing accounts.</small></div>
        <span id="leadFinderCount" class="lead-count"></span>
      </div>
      <div class="lead-finder-controls">
        <label>Search<input id="leadFinderSearch" type="search" placeholder="Company, category, city…" /></label>
        <label>Sales lane<select id="leadFinderTrack"><option value="">All lanes</option><option value="quick_close">Quick Close</option><option value="recurring_fleet">Recurring Fleet</option><option value="procurement">Procurement</option></select></label>
        <label>Category<select id="leadFinderCategory"><option value="">All categories</option></select></label>
        <label>Minimum score<select id="leadFinderScore"><option value="0">Any score</option><option value="90" selected>90+ hot leads</option><option value="95">95+ best leads</option></select></label>
      </div>
      <div id="leadFinderList" class="list"></div>
    </div>
    <div class="panel" style="margin-top:14px">
      <div class="panel-head"><div><h3>Live opportunity sources</h3><small>Open the official source, search the suggested terms, then add worthwhile opportunities as prospects.</small></div></div>
      <div class="opportunity-grid">
        <article class="opportunity-card"><div><h4>Idaho purchasing</h4><p>Search: vehicle washing, fleet cleaning, detailing and car wash.</p></div><a class="btn mini" href="https://purchasing.idaho.gov/" target="_blank" rel="noopener">Search Idaho bids</a></article>
        <article class="opportunity-card"><div><h4>Federal contracts</h4><p>Search SAM.gov for vehicle cleaning and mobile car wash opportunities.</p></div><a class="btn mini" href="https://sam.gov/opportunities" target="_blank" rel="noopener">Search SAM.gov</a></article>
        <article class="opportunity-card"><div><h4>Nearby fleet targets</h4><p>Find HVAC, plumbing, landscaping and delivery companies around Boise.</p></div><a class="btn mini" href="https://www.google.com/maps/search/commercial+fleet+companies+near+Boise+Idaho" target="_blank" rel="noopener">Open Google Maps</a></article>
        <article class="opportunity-card"><div><h4>Homeowner requests</h4><p>Use your before-and-after work to compete for local mobile-detailing jobs.</p></div><a class="btn mini" href="https://www.thumbtack.com/pro" target="_blank" rel="noopener">Open Thumbtack Pro</a></article>
      </div>
    </div>`;
  document.querySelector('.main').appendChild(view);

  const search = document.getElementById('leadFinderSearch');
  const track = document.getElementById('leadFinderTrack');
  const category = document.getElementById('leadFinderCategory');
  const scoreFilter = document.getElementById('leadFinderScore');
  const list = document.getElementById('leadFinderList');
  const count = document.getElementById('leadFinderCount');
  const metrics = document.getElementById('leadFinderMetrics');

  const previousShowView = showView;
  showView = function(name) {
    previousShowView(name);
    if (name === 'leadFinder') els.pageTitle.textContent = 'Find Detailing Jobs';
  };

  function unique(values) {
    return [...new Set(values.filter(Boolean))].sort((a,b) => a.localeCompare(b));
  }

  function fillFilters() {
    const selectedCategory = category.value;
    category.innerHTML = '<option value="">All categories</option>';
    unique(state.leadCandidates.map(item => item.category)).forEach(value => {
      const option = document.createElement('option'); option.value = value; option.textContent = value; category.appendChild(option);
    });
    if ([...category.options].some(o => o.value === selectedCategory)) category.value = selectedCategory;
  }

  function filteredLeads() {
    const term = search.value.trim().toLowerCase();
    return state.leadCandidates.filter(item => {
      if (item.status !== 'new') return false;
      if (track.value && item.sales_track !== track.value) return false;
      if (category.value && item.category !== category.value) return false;
      if (Number(item.lead_score || 0) < Number(scoreFilter.value || 0)) return false;
      if (!term) return true;
      return [item.company_name,item.category,item.city,item.phone,item.fit_reason,item.suggested_offer,item.next_action].some(value => String(value || '').toLowerCase().includes(term));
    }).sort((a,b) => Number(b.lead_score || 0) - Number(a.lead_score || 0));
  }

  function makeButton(text, className, onClick) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = className; button.textContent = text; button.addEventListener('click', onClick); return button;
  }

  function safePhone(value) {
    return String(value || '').replace(/[^0-9+]/g, '');
  }

  function actionLink(text, href) {
    const link = document.createElement('a');
    link.className = 'btn mini'; link.textContent = text; link.href = href;
    if (/^https?:/i.test(href)) { link.target = '_blank'; link.rel = 'noopener'; }
    return link;
  }

  const trackLabels = { quick_close: 'Quick Close', recurring_fleet: 'Recurring Fleet', procurement: 'Procurement' };

  function renderMetrics() {
    const ready = state.leadCandidates.filter(item => item.status === 'new');
    const values = [
      ['Ready to contact', ready.length],
      ['90+ hot leads', ready.filter(item => Number(item.lead_score || 0) >= 90).length],
      ['Fleet targets', ready.filter(item => item.sales_track === 'recurring_fleet').length],
      ['Contract targets', ready.filter(item => item.sales_track === 'procurement').length]
    ];
    metrics.replaceChildren();
    values.forEach(([label, value]) => {
      const card = document.createElement('article'); card.className = 'finder-metric';
      const name = document.createElement('span'); name.textContent = label;
      const total = document.createElement('strong'); total.textContent = String(value);
      card.append(name, total); metrics.appendChild(card);
    });
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function promoteViaRpc(item) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const { data, error } = await db.rpc('promote_lead_candidate', { p_lead_id: item.id }).abortSignal(controller.signal);
      if (error) throw error;
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function refreshCandidate(item) {
    const { data, error } = await db.from('lead_candidates')
      .select('id,status,prospect_id')
      .eq('id', item.id)
      .eq('business_id', state.businessId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function promoteDirectly(item) {
    const prospectPayload = {
      business_id: state.businessId,
      company_name: item.company_name,
      category: item.category || null,
      contact_name: item.contact_name || null,
      phone: item.phone || null,
      email: item.email || null,
      website: item.website || null,
      address: item.address || null,
      city: item.city || null,
      state: item.state || null,
      source: 'lead_finder',
      stage: 'new',
      notes: item.fit_reason ? `Lead Finder: ${item.fit_reason}` : ''
    };

    const { data: prospect, error: insertError } = await db.from('prospects')
      .insert(prospectPayload)
      .select('id')
      .single();
    if (insertError) throw insertError;

    const { error: updateError } = await db.from('lead_candidates')
      .update({ status: 'saved', prospect_id: prospect.id, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .eq('business_id', state.businessId);

    if (updateError) {
      await db.from('prospects').delete().eq('id', prospect.id).eq('business_id', state.businessId);
      throw updateError;
    }

    return prospect.id;
  }

  async function promote(item, button) {
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = 'Adding…';

    try {
      let prospectId = null;

      try {
        prospectId = await promoteViaRpc(item);
      } catch (rpcError) {
        console.warn('Lead Finder RPC failed; checking status before fallback.', rpcError);
        await wait(350);
        const current = await refreshCandidate(item);
        if (current?.prospect_id || current?.status === 'saved') {
          prospectId = current.prospect_id;
        } else {
          prospectId = await promoteDirectly(item);
        }
      }

      if (!prospectId) {
        const current = await refreshCandidate(item);
        if (!current?.prospect_id && current?.status !== 'saved') throw new Error('The prospect was not saved. Please try again.');
      }

      item.status = 'saved';
      item.prospect_id = prospectId || item.prospect_id;
      renderLeadFinder();

      try {
        await loadAll();
      } catch (refreshError) {
        console.error('Prospect saved, but dashboard refresh failed.', refreshError);
      }
      showView('prospects');
    } catch (error) {
      console.error('Unable to add lead to prospects.', error);
      alert(error?.message || 'Unable to add this lead to prospects. Please try again.');
    } finally {
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = oldText;
      }
    }
  }

  async function dismiss(item, button) {
    button.disabled = true;
    const { error } = await db.from('lead_candidates').update({ status: 'dismissed', updated_at: new Date().toISOString() }).eq('id', item.id).eq('business_id', state.businessId);
    if (error) { button.disabled = false; return alert(error.message); }
    item.status = 'dismissed'; renderLeadFinder();
  }

  function renderLeadFinder() {
    const leads = filteredLeads();
    renderMetrics();
    count.textContent = `${leads.length} matching leads`;
    list.replaceChildren();
    if (!leads.length) return empty(list, 'No matching leads in this batch. Clear the filters or load another research batch.');

    leads.forEach(item => {
      const card = document.createElement('article'); card.className = 'lead-candidate';
      const copy = document.createElement('div');
      const title = document.createElement('div'); title.className = 'lead-title';
      const heading = document.createElement('h4'); heading.textContent = item.company_name;
      const score = document.createElement('span'); score.className = `lead-score${Number(item.lead_score || 0) >= 90 ? ' hot' : ''}`; score.textContent = `${Number(item.lead_score || 0)}/100`;
      const lane = document.createElement('span'); lane.className = 'lead-track'; lane.textContent = trackLabels[item.sales_track] || 'Local lead';
      title.append(heading, score, lane);
      const meta = document.createElement('div'); meta.className = 'lead-meta';
      [item.category, [item.city,item.state].filter(Boolean).join(', '), item.phone].filter(Boolean).forEach(value => {
        const span = document.createElement('span'); span.textContent = value; meta.appendChild(span);
      });
      const reason = document.createElement('div'); reason.className = 'lead-reason'; reason.textContent = item.fit_reason || 'Potential local commercial account.';
      const pitch = document.createElement('div'); pitch.className = 'lead-pitch';
      const pitchLabel = document.createElement('strong'); pitchLabel.textContent = 'Offer: ';
      const pitchText = document.createTextNode(item.suggested_offer || 'Offer a low-risk pilot detail, then propose a recurring fleet schedule.');
      const next = document.createElement('div');
      const nextLabel = document.createElement('strong'); nextLabel.textContent = 'Next move: ';
      next.append(nextLabel, document.createTextNode(item.next_action || 'Call and ask who manages vehicle appearance.'));
      pitch.append(pitchLabel, pitchText, next);
      copy.append(title, meta, reason, pitch);

      const actions = document.createElement('div'); actions.className = 'lead-actions';
      if (item.phone) actions.appendChild(actionLink('Call', `tel:${safePhone(item.phone)}`));
      if (item.email) actions.appendChild(actionLink('Email', `mailto:${item.email}`));
      if (item.website) actions.appendChild(actionLink('Website', item.website));
      const add = makeButton('Add to prospects', 'btn primary mini', () => promote(item, add));
      const skip = makeButton('Dismiss', 'btn mini', () => dismiss(item, skip));
      actions.append(add, skip);
      card.append(copy, actions); list.appendChild(card);
    });
  }

  async function loadLeadCandidates() {
    if (!state.businessId) return;
    const { data, error } = await db.from('lead_candidates')
      .select('id,company_name,category,contact_name,phone,email,website,address,city,state,fit_reason,status,prospect_id,created_at,lead_score,suggested_offer,next_action,researched_at,sales_track')
      .eq('business_id', state.businessId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    state.leadCandidates = data || [];
    fillFilters();
    renderLeadFinder();
  }

  search.addEventListener('input', renderLeadFinder);
  track.addEventListener('change', renderLeadFinder);
  category.addEventListener('change', renderLeadFinder);
  scoreFilter.addEventListener('change', renderLeadFinder);
  document.getElementById('openSalesQueueBtn').addEventListener('click', () => showView('sales'));
  document.getElementById('startCallingBtn').addEventListener('click', () => {
    track.value = ''; scoreFilter.value = '95'; search.value = ''; category.value = '';
    renderLeadFinder();
    document.querySelector('.lead-candidate')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  const previousLoadAll = loadAll;
  loadAll = async function() {
    await previousLoadAll();
    await loadLeadCandidates();
  };

  if (state.businessId) loadLeadCandidates().catch(error => console.error(error));
})();
