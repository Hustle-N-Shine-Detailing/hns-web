(() => {
  const style=document.createElement('style');
  style.textContent='.revenue-today{margin:14px 0}.revenue-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;margin-bottom:12px}.revenue-head h3{margin:0}.revenue-head p{margin:4px 0 0;color:var(--muted);font-size:.8rem}.revenue-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}.revenue-metric{padding:14px;border:1px solid var(--line);border-radius:13px;background:#0b0c0e;display:grid;gap:4px}.revenue-metric span{font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.revenue-metric strong{font-size:1.45rem}.revenue-metric.hot strong{color:#ffd76a}.money-queue{display:grid}.money-action{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid var(--line)}.money-action:last-child{border-bottom:0}.money-action h4{margin:0;font-size:.92rem}.money-action p{margin:3px 0 0;color:var(--muted);font-size:.76rem}.money-buttons{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.money-buttons a{text-decoration:none}.funnel-strip{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.funnel-strip span{border:1px solid var(--line);border-radius:999px;padding:6px 9px;font-size:.72rem;color:var(--muted)}.funnel-strip b{color:#fff}@media(max-width:900px){.revenue-metrics{grid-template-columns:1fr 1fr}.money-action{grid-template-columns:1fr}.money-buttons{justify-content:flex-start}}@media(max-width:560px){.revenue-metrics{grid-template-columns:1fr}.revenue-head{display:grid}}';
  document.head.appendChild(style);

  const dashboard=document.getElementById('dashboardView');
  const metricGrid=dashboard&&dashboard.querySelector('.metric-grid');
  if(!dashboard||!metricGrid)return;
  const panel=document.createElement('article');
  panel.className='panel revenue-today';
  panel.innerHTML='<div class="revenue-head"><div><div class="eyebrow">REVENUE FIRST</div><h3>Make Money Today</h3><p>Work this list top to bottom before spending time on lower-priority admin.</p></div><button class="btn primary" id="revenueRefresh" type="button">Refresh money queue</button></div><div class="revenue-metrics" id="revenueMetrics"></div><div class="panel-head"><div><h3>Next actions</h3><small>New inbound leads first, then due follow-ups, hot outbound targets and rebooks.</small></div></div><div class="money-queue" id="moneyQueue"></div><div class="funnel-strip" id="funnelStrip"></div>';
  metricGrid.insertAdjacentElement('afterend',panel);

  const metrics=panel.querySelector('#revenueMetrics'),queue=panel.querySelector('#moneyQueue'),funnel=panel.querySelector('#funnelStrip');
  const safePhone=value=>String(value||'').replace(/[^+\\d]/g,'');
  const sms=(phone,body)=>'sms:'+safePhone(phone)+'?&body='+encodeURIComponent(body);
  const dueNow=value=>!value||new Date(value).getTime()<=Date.now();

  function metric(label,value,hot){
    const el=document.createElement('div');el.className='revenue-metric'+(hot?' hot':'');
    const s=document.createElement('span');s.textContent=label;const b=document.createElement('strong');b.textContent=String(value);
    el.append(s,b);return el;
  }
  function action(title,sub,buttons){
    const el=document.createElement('div');el.className='money-action';
    const copy=document.createElement('div');const h=document.createElement('h4');h.textContent=title;const p=document.createElement('p');p.textContent=sub;copy.append(h,p);
    const acts=document.createElement('div');acts.className='money-buttons';buttons.forEach(btn=>acts.appendChild(btn));el.append(copy,acts);return el;
  }
  function link(label,href,primary){
    const a=document.createElement('a');a.className='btn mini'+(primary?' primary':'');a.textContent=label;a.href=href;return a;
  }
  function jump(label,view,primary){
    const b=document.createElement('button');b.type='button';b.className='btn mini'+(primary?' primary':'');b.textContent=label;b.addEventListener('click',()=>showView(view));return b;
  }

  async function renderRevenue(){
    if(!state.businessId)return;
    metrics.replaceChildren();queue.replaceChildren();funnel.replaceChildren();
    const since=new Date(Date.now()-7*86400000).toISOString();
    const results=await Promise.all([
      db.from('followups').select('id,kind,status,due_at,note,customers(first_name,last_name,phone),prospects(company_name,phone)').eq('business_id',state.businessId).eq('status','open').order('due_at',{ascending:true,nullsFirst:true}).limit(100),
      db.from('maintenance_plans').select('id,name,next_due_at,active,customers(first_name,last_name,phone),vehicles(year,make,model)').eq('business_id',state.businessId).eq('active',true).order('next_due_at',{ascending:true,nullsFirst:true}).limit(100),
      db.from('lead_candidates').select('id,company_name,phone,lead_score,next_action,status').eq('business_id',state.businessId).eq('status','new').gte('lead_score',95).order('lead_score',{ascending:false}).limit(20),
      db.from('site_events').select('event_name,occurred_at').eq('business_id',state.businessId).gte('occurred_at',since).limit(5000)
    ]);
    const followups=results[0],plans=results[1],hotLeads=results[2],events=results[3];
    const failed=results.find(r=>r.error);
    if(failed){queue.appendChild(action('Money queue could not load',failed.error.message,[jump('Open booking leads','leads',true)]));return}
    const dueFollowups=(followups.data||[]).filter(f=>dueNow(f.due_at));
    const duePlans=(plans.data||[]).filter(p=>p.next_due_at&&new Date(p.next_due_at).getTime()<=Date.now()+7*86400000);
    const inboundBookings=state.leads.filter(l=>l.status==='new');
    const inboundCommercial=state.prospects.filter(p=>p.stage==='new'&&p.source==='website');
    const hot=hotLeads.data||[];

    metrics.append(metric('Inbound waiting',inboundBookings.length+inboundCommercial.length,true),metric('Follow-ups due',dueFollowups.length,true),metric('95+ leads ready',hot.length,false),metric('Rebooks due <=7d',duePlans.length,false));

    const actions=[];
    inboundBookings.slice(0,4).forEach(l=>{
      const buttons=[];
      if(l.phone){buttons.push(link('Text',sms(l.phone,'Hi '+(l.customer_name||'')+', this is Joshua with Hustle & Shine. I saw your detailing request for '+(l.service||'your vehicle')+'. I can help you get it scheduled.'),true),link('Call','tel:'+safePhone(l.phone),false))}
      buttons.push(jump('Open lead','leads',false));
      actions.push(action('New booking — '+(l.customer_name||'Customer'),[l.vehicle,l.service,l.city].filter(Boolean).join(' • '),buttons));
    });
    inboundCommercial.slice(0,4).forEach(p=>{
      const buttons=[];
      if(p.phone){buttons.push(link('Call','tel:'+safePhone(p.phone),true),link('Text',sms(p.phone,'Hi '+(p.contact_name||'')+', this is Joshua with Hustle & Shine. I got your '+(p.category||'commercial detailing')+' request for '+p.company_name+'. I wanted to follow up personally.'),false))}
      buttons.push(jump('Open prospect','prospects',false));
      actions.push(action('Website business lead — '+p.company_name,[p.category,p.city,p.estimated_vehicles?(p.estimated_vehicles+' vehicles'):''].filter(Boolean).join(' • '),buttons));
    });
    dueFollowups.slice(0,5).forEach(f=>{
      const subject=f.customers?customerName(f.customers):(f.prospects&&f.prospects.company_name||'Follow-up');
      const phone=f.customers&&f.customers.phone||f.prospects&&f.prospects.phone||'';
      const body=f.kind==='review'?'Hi '+(f.customers&&f.customers.first_name||'')+', this is Joshua with Hustle & Shine. Thanks again for trusting me with your vehicle. If you were happy with the detail, would you mind leaving a Google review? https://share.google/J5GZIexoKMpeSUrB':'Hi, this is Joshua with Hustle & Shine. I wanted to follow up and see if you still need help with your detailing service.';
      const buttons=[];if(phone)buttons.push(link('Text',sms(phone,body),true),link('Call','tel:'+safePhone(phone),false));buttons.push(jump('Follow-ups','growth',false));
      actions.push(action(String(f.kind||'follow-up').replaceAll('_',' ')+' — '+subject,f.note||'Due now',buttons));
    });
    hot.slice(0,5).forEach(l=>{
      const buttons=[];if(l.phone)buttons.push(link('Call','tel:'+safePhone(l.phone),true));buttons.push(jump('Open sales queue','sales',false));
      actions.push(action('Hot outbound — '+l.company_name,String(l.lead_score||0)+'/100 • '+(l.next_action||'Call the decision maker.'),buttons));
    });
    duePlans.slice(0,4).forEach(p=>{
      const name=customerName(p.customers),phone=p.customers&&p.customers.phone||'',buttons=[];
      if(phone)buttons.push(link('Text rebook',sms(phone,'Hi '+(p.customers&&p.customers.first_name||'')+', this is Joshua with Hustle & Shine. Your '+p.name+' is coming due. Want me to get your next detail on the calendar?'),true));
      buttons.push(jump('Maintenance','growth',false));
      actions.push(action('Rebook — '+name,[p.name,vehicleName(p.vehicles),p.next_due_at?fmtDate(p.next_due_at):''].filter(Boolean).join(' • '),buttons));
    });

    if(!actions.length)actions.push(action('Queue is clear','No urgent revenue actions are waiting right now.',[jump('Find new jobs','leadFinder',true)]));
    actions.slice(0,12).forEach(x=>queue.appendChild(x));

    const ev=events.data||[],views=ev.filter(e=>e.event_name==='page_view').length,opens=ev.filter(e=>e.event_name==='booking_open').length,saved=ev.filter(e=>e.event_name==='request_saved').length,contacts=ev.filter(e=>e.event_name==='call_click'||e.event_name==='text_click').length;
    [['7d visits',views],['Booking opens',opens],['Saved requests',saved],['Call/text clicks',contacts],['Open → saved',opens?Math.round(saved/opens*100)+'%':'0%']].forEach(pair=>{const s=document.createElement('span');const b=document.createElement('b');b.textContent=String(pair[1]);s.append(b,document.createTextNode(' '+pair[0]));funnel.appendChild(s)});
  }

  panel.querySelector('#revenueRefresh').addEventListener('click',()=>renderRevenue().catch(error=>{queue.textContent=error.message}));
  const baseRender=render;
  render=function(){baseRender();renderRevenue().catch(error=>{queue.textContent='Revenue queue error: '+error.message})};
})();