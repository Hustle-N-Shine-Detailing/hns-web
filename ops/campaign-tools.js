(() => {
  const links = [
    { name: 'Google Business Profile', source: 'google_business', medium: 'organic', campaign: 'local_profile', note: 'Use for Google Business posts and the profile website button.' },
    { name: 'Facebook', source: 'facebook', medium: 'social', campaign: 'boise_detailing', note: 'Use in Facebook business posts and local-group posts.' },
    { name: 'Instagram', source: 'instagram', medium: 'social', campaign: 'boise_detailing', note: 'Use in bio links, stories and profile promotions.' },
    { name: 'Nextdoor', source: 'nextdoor', medium: 'social', campaign: 'treasure_valley_local', note: 'Use for neighborhood posts and direct recommendations.' },
    { name: 'Flyer / QR code', source: 'flyer', medium: 'offline', campaign: 'local_qr', note: 'Use as the destination encoded in printed QR codes.' },
    { name: 'Dealer outreach', source: 'dealer_outreach', medium: 'direct', campaign: 'trade_partner', note: 'Use when sending the Trade Partner page to dealerships or body shops.', path: '/trade-partners/' }
  ];

  const style = document.createElement('style');
  style.textContent = '.campaign-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.campaign-card{display:grid;gap:10px}.campaign-card code,.referral-output{display:block;white-space:normal;overflow-wrap:anywhere;background:#0b0d0f;border:1px solid var(--line);border-radius:10px;padding:10px;font-size:.76rem;color:#dce2e7}.campaign-actions{display:flex;gap:8px;flex-wrap:wrap}.campaign-note{color:var(--muted);font-size:.8rem}.referral-builder{margin-top:14px;display:grid;gap:12px}.referral-builder select{width:100%;background:#0b0d0f;color:#fff;border:1px solid var(--line);border-radius:9px;padding:11px}.referral-preview{display:grid;gap:9px;padding:14px;border:1px solid var(--line);border-radius:12px;background:#0c0d0f}.referral-preview h4{margin:0}.referral-help{color:var(--muted);font-size:.78rem;line-height:1.5}@media(max-width:820px){.campaign-grid{grid-template-columns:1fr}}';
  document.head.appendChild(style);

  const nav = document.createElement('button');
  nav.className = 'nav-item';
  nav.dataset.view = 'campaigns';
  nav.textContent = 'Campaign Links';
  els.nav.appendChild(nav);

  const view = document.createElement('section');
  view.id = 'campaignsView';
  view.className = 'view hidden';
  view.innerHTML = '<article class="panel"><div class="panel-head"><div><h3>Track every marketing source</h3><small>Use these links instead of the plain homepage URL. Website bookings keep the source and campaign attached to the lead.</small></div></div><div id="campaignGrid" class="campaign-grid"></div></article><article class="panel" style="margin-top:14px"><div class="panel-head"><div><h3>Customer referral links</h3><small>Create a unique tracked link for an existing customer. If somebody books from it, the booking source shows as referral and the campaign identifies who referred them.</small></div></div><div class="referral-builder"><label>Customer<select id="referralCustomer"><option value="">Choose a customer</option></select></label><div id="referralPreview" class="referral-preview"><div class="referral-help">Choose a customer to create their referral link. This tracks attribution; it does not promise a discount or reward unless you decide to offer one.</div></div></div></article>';
  document.querySelector('.main').appendChild(view);

  function buildUrl(item) {
    const url = new URL(item.path || '/', 'https://hustlenshine.pro');
    url.searchParams.set('utm_source', item.source);
    url.searchParams.set('utm_medium', item.medium);
    url.searchParams.set('utm_campaign', item.campaign);
    return url.toString();
  }
  function copyButton(url,label){
    const copy=document.createElement('button');copy.className='btn primary mini';copy.type='button';copy.textContent=label||'Copy tracked link';
    copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(url);copy.textContent='Copied';setTimeout(()=>{copy.textContent=label||'Copy tracked link'},1400)}catch{window.prompt('Copy this tracked link:',url)}});
    return copy;
  }

  const grid = view.querySelector('#campaignGrid');
  links.forEach(item => {
    const url = buildUrl(item);
    const card = document.createElement('article');
    card.className = 'panel campaign-card';
    const title = document.createElement('h3'); title.textContent = item.name;
    const note = document.createElement('div'); note.className = 'campaign-note'; note.textContent = item.note;
    const code = document.createElement('code'); code.textContent = url;
    const actions = document.createElement('div'); actions.className = 'campaign-actions';
    const open = document.createElement('a'); open.className = 'btn mini'; open.href = url; open.target = '_blank'; open.rel = 'noopener'; open.textContent = 'Open link ↗';
    actions.append(copyButton(url), open);
    card.append(title, note, code, actions);
    grid.appendChild(card);
  });

  const customerSelect=view.querySelector('#referralCustomer'),preview=view.querySelector('#referralPreview');
  function referralUrl(customer){
    const url=new URL('/','https://hustlenshine.pro');
    url.searchParams.set('utm_source','referral');
    url.searchParams.set('utm_medium','customer');
    url.searchParams.set('utm_campaign','ref_'+String(customer.id||'').replaceAll('-','').slice(0,10));
    return url.toString();
  }
  function renderCustomerOptions(){
    const current=customerSelect.value;
    customerSelect.replaceChildren();
    const first=document.createElement('option');first.value='';first.textContent='Choose a customer';customerSelect.appendChild(first);
    [...state.customers].sort((a,b)=>customerName(a).localeCompare(customerName(b))).forEach(customer=>{const option=document.createElement('option');option.value=customer.id;option.textContent=customerName(customer)+(customer.phone?' • '+customer.phone:'');customerSelect.appendChild(option)});
    if([...customerSelect.options].some(o=>o.value===current))customerSelect.value=current;
  }
  function renderReferral(){
    preview.replaceChildren();
    const customer=state.customers.find(c=>c.id===customerSelect.value);
    if(!customer){const help=document.createElement('div');help.className='referral-help';help.textContent='Choose a customer to create their referral link. This tracks attribution; it does not promise a discount or reward unless you decide to offer one.';preview.appendChild(help);return}
    const url=referralUrl(customer),name=customerName(customer);
    const h=document.createElement('h4');h.textContent=name+' referral link';
    const code=document.createElement('code');code.className='referral-output';code.textContent=url;
    const actions=document.createElement('div');actions.className='campaign-actions';actions.appendChild(copyButton(url,'Copy referral link'));
    if(customer.phone){
      const text=document.createElement('a');text.className='btn mini';text.href='sms:'+String(customer.phone).replace(/[^+\d]/g,'')+'?&body='+encodeURIComponent('Hey '+(customer.first_name||'')+', thanks again for trusting Hustle & Shine. If you know somebody who needs their vehicle detailed, here is my booking link you can send them: '+url);text.textContent='Text link to customer';actions.appendChild(text);
    }
    const open=document.createElement('a');open.className='btn mini';open.href=url;open.target='_blank';open.rel='noopener';open.textContent='Open ↗';actions.appendChild(open);
    const help=document.createElement('div');help.className='referral-help';help.textContent='Bookings from this link will show Source: referral and a unique campaign code in the booking inbox.';
    preview.append(h,code,actions,help);
  }
  customerSelect.addEventListener('change',renderReferral);

  const previousShowView = showView;
  showView = function(name) {
    previousShowView(name);
    if (name === 'campaigns') {
      els.pageTitle.textContent = 'Campaign & Referral Links';
      renderCustomerOptions();
      renderReferral();
    }
  };
})();