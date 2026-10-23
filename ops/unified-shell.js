/* Hustle & Shine: one production workspace for sales, work, and collections.
   Reorganizes existing Ops tools; never copies credentials or legacy app data. */
(() => {
  'use strict';
  const nav = document.getElementById('nav');
  const dashboard = document.getElementById('dashboardView');
  if (!nav || !dashboard) return;

  const groups = [
    { label: 'Today', views: ['dashboard', 'sales', 'leads'] },
    { label: 'Win customers', views: ['leadFinder', 'prospects', 'growth', 'campaigns', 'trade'] },
    { label: 'Deliver & collect', views: ['jobs', 'customers', 'garage', 'services', 'money'] }
  ];
  const original = Array.from(nav.children);
  const byView = new Map(original.filter(el => el.dataset?.view).map(el => [el.dataset.view, el]));
  const used = new Set();
  const organized = document.createDocumentFragment();

  for (const group of groups) {
    const found = group.views.filter(view => byView.has(view));
    if (!found.length) continue;
    const heading = document.createElement('span');
    heading.className = 'unified-nav-label';
    heading.textContent = group.label;
    organized.appendChild(heading);
    for (const view of found) {
      organized.appendChild(byView.get(view));
      used.add(byView.get(view));
    }
  }
  const remaining = original.filter(el => !used.has(el));
  if (remaining.length) {
    const heading = document.createElement('span');
    heading.className = 'unified-nav-label';
    heading.textContent = 'Insights & links';
    organized.appendChild(heading);
    remaining.forEach(el => organized.appendChild(el));
  }
  nav.replaceChildren(organized);
  nav.setAttribute('aria-label', 'Unified business operations');

  const launcher = document.createElement('section');
  launcher.className = 'panel unified-launcher';
  launcher.setAttribute('aria-label', 'Business workspace shortcuts');
  launcher.innerHTML = `
    <div class="unified-launcher-head">
      <div><div class="eyebrow">ONE HUSTLE & SHINE WORKSPACE</div>
      <h3>Sales. Service. Payments. One place.</h3>
      <p>Use this Ops app as the source of truth for customers, jobs, leads and finances. Older builder apps do not automatically sync here.</p></div>
      <a class="btn mini" href="../admin/">Website analytics ↗</a>
    </div>
    <div class="unified-launcher-grid">
      <button type="button" class="btn" data-unified="sales">Sales pipeline</button>
      <button type="button" class="btn" data-unified="growth">Follow-ups & estimates</button>
      <button type="button" class="btn" data-unified="leadFinder">Find local prospects</button>
      <button type="button" class="btn" data-unified="jobs">Jobs & schedule</button>
      <button type="button" class="btn" data-unified="customers">Customer records</button>
      <button type="button" class="btn" data-unified="money">Invoices & payments</button>
    </div>`;
  launcher.addEventListener('click', event => {
    const action = event.target.closest('[data-unified]');
    if (!action) return;
    const view = action.dataset.unified;
    if (document.getElementById(view + 'View') && typeof showView === 'function') {
      showView(view);
      document.querySelector('.main')?.scrollTo?.({ top: 0, behavior: 'smooth' });
    } else if (typeof showAppNotice === 'function') {
      showAppNotice('This workspace tool is not loaded. Refresh Ops and try again.', true);
    }
  });
  const command = dashboard.querySelector('.command-center');
  if (command) command.insertAdjacentElement('afterend', launcher);
  else dashboard.prepend(launcher);

  const styles = document.createElement('style');
  styles.textContent = `
    .sidebar nav{min-height:0;overflow-y:auto;align-content:start}
    .sidebar{gap:16px}
    .unified-nav-label{display:block;padding:15px 11px 4px;color:#88929b;
      font-size:.67rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
    .unified-launcher{margin:0 0 20px}
    .unified-launcher-head{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:14px}
    .unified-launcher-head h3{margin:4px 0 5px}
    .unified-launcher-head p{margin:0;color:var(--muted);font-size:.86rem;max-width:690px}
    .unified-launcher-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
    .unified-launcher-grid button{text-align:left;min-height:47px;white-space:normal}
    @media(max-width:820px){
      .sidebar nav{overflow-y:hidden;overflow-x:auto}
      .unified-nav-label{display:none}
      .unified-launcher-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .unified-launcher-head>a{width:100%;text-align:center}
    }
    @media(max-width:410px){.unified-launcher-grid{grid-template-columns:1fr 1fr;gap:7px}
      .unified-launcher-grid button{font-size:.78rem;padding:10px 8px}}
  `;
  document.head.appendChild(styles);
})();
