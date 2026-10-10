(() => {
  const dashboard = document.getElementById('dashboardView');
  if (!dashboard) return;
  const center = document.createElement('section');
  center.className = 'command-center';
  center.innerHTML = `<div class="command-hero"><div><div class="eyebrow">HUSTLE & SHINE • DAILY OPERATIONS</div><h3>Your next move, ready.</h3><p id="commandDate"></p></div><div class="command-shortcuts"><button class="btn primary" type="button" data-command="new">+ Book a job</button><button class="btn" type="button" data-command="money">Payments</button><button class="btn" type="button" data-command="growth">Follow-ups</button></div></div><div class="command-stats" id="commandStats"></div><div class="command-columns"><article class="panel"><div class="panel-head"><div><h3>Upcoming work</h3><small>Boise time · next 7 days</small></div><button class="text-btn" type="button" data-command="jobs">All jobs</button></div><div id="commandSchedule"></div></article><article class="panel"><div class="panel-head"><div><h3>Before you head out</h3><small>Missing details and jobs that need a decision</small></div></div><div id="commandAttention"></div></article></div><article class="panel command-search"><label for="commandSearch">Find a customer or job</label><input id="commandSearch" type="search" placeholder="Name, vehicle, address or phone" autocomplete="off"><div id="commandResults" aria-live="polite"></div></article><p class="command-foot">Calendly bookings are checked hourly by your ChatGPT automation. Use Refresh to load the latest Ops records. Only saved invoice payments count as collected.</p>`;
  dashboard.prepend(center);
  const find = id => center.querySelector('#' + id);
  const day = value => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const active = job => !['completed','cancelled','no_show'].includes(job.status);
  const nameOf = job => customerName(job.customers || state.customers.find(c => c.id === job.customer_id));
  function node(tag, text, cls) { const n = document.createElement(tag); if(text !== undefined) n.textContent = text; if(cls)n.className=cls; return n; }
  function button(label, fn, primary=false) { const b=node('button',label,'btn mini'+(primary?' primary':''));b.type='button';b.onclick=fn;return b; }
  const openJob = id => document.dispatchEvent(new CustomEvent('ops:open-job',{detail:id}));
  function line(title, detail, actions=[]) { const row=node('div',undefined,'command-row');const copy=node('div');copy.append(node('strong',title),node('p',detail));const buttons=node('div',undefined,'command-buttons');buttons.append(...actions);row.append(copy,buttons);return row; }
  function contactActions(job) {
    const c=state.customers.find(c=>c.id===job.customer_id), buttons=[];
    const phone=String(c?.phone||'').replace(/[^+\d]/g,'');
    if(phone && /\d{7}/.test(phone)) { const a=node('a','Call','btn mini');a.href='tel:'+phone;buttons.push(a); }
    if(job.address?.trim()){const a=node('a','Directions','btn mini');a.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(job.address);a.target='_blank';a.rel='noopener';buttons.push(a);}
    buttons.push(button('Open job',()=>openJob(job.id),true),button('Edit details',()=>editJob(job)));
    return buttons;
  }
  function renderCenter() {
    if(!state.businessId)return;
    const now=Date.now(), today=day(now), week=now+7*86400000;
    find('commandDate').textContent=new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',weekday:'long',month:'long',day:'numeric'}).format(new Date())+' · Boise time';
    const jobs=state.jobs.filter(active);
    const upcoming=jobs.filter(j=>j.scheduled_start && new Date(j.scheduled_start).getTime()<=week && day(j.scheduled_start)>=today).sort((a,b)=>new Date(a.scheduled_start)-new Date(b.scheduled_start));
    const invoices=(state.invoices||[]).filter(i=>i.status!=='void');
    const balance=invoices.reduce((sum,i)=>sum+Math.max(0,Number(i.amount_due)-Number(i.amount_paid)),0);
    const stats=find('commandStats');stats.replaceChildren();
    [['Today’s jobs',jobs.filter(j=>j.scheduled_start && day(j.scheduled_start)===today).length],['Next 7 days',upcoming.length],['Outstanding invoices',state.invoices ? money(balance) : 'Loading…'],['New inquiries',state.leads.filter(l=>l.status==='new').length]].forEach(([label,value])=>{const el=node('div',undefined,'command-stat');el.append(node('span',label),node('strong',String(value)));stats.append(el);});
    const schedule=find('commandSchedule');schedule.replaceChildren();
    upcoming.slice(0,8).forEach(job=>{
      const inv=invoices.find(i=>i.job_id===job.id);
      const payment=inv ? money(inv.amount_paid)+' paid · '+money(Math.max(0,inv.amount_due-inv.amount_paid))+' balance' : Number(job.total)>0 ? money(job.total)+' quoted · no invoice' : 'Price needs confirmation';
      schedule.append(line(nameOf(job),[fmtDate(job.scheduled_start),vehicleName(job.vehicles),payment].filter(Boolean).join(' • '),contactActions(job)));
    });
    if(!upcoming.length)schedule.append(line('Room on the calendar','Follow up with warm leads or book your next customer.',[button('Booking leads',()=>showView('leads'))]));
    const attention=find('commandAttention');attention.replaceChildren();let count=0;
    jobs.forEach(job=>{
      if(job.scheduled_start && new Date(job.scheduled_start).getTime()>week)return;
      const missing=[];
      if(!job.scheduled_start)missing.push('appointment time');
      else if(day(job.scheduled_start)<today)missing.push('past appointment still open');
      if(!job.address?.trim())missing.push('service address');
      if(!job.vehicle_id)missing.push('vehicle');
      if(!Number(job.total))missing.push('confirmed price');
      if(!job.scheduled_end)missing.push('end time');
      if(missing.length){count++;if(count<=6)attention.append(line(nameOf(job),missing.join(' · '),[button('Review',()=>editJob(job))]));}
    });
    if(!count)attention.append(line('Ready for the road','No missing job details found in the next 7 days.'));
    if(count>6)attention.append(node('p',`${count-6} more jobs need review. Open Jobs to see all.`, 'muted'));
    renderSearch();
  }
  function renderSearch() {
    const result=find('commandResults'), term=find('commandSearch').value.trim().toLowerCase();result.replaceChildren();
    if(!term)return;
    const matchedCustomers=state.customers.filter(c=>[customerName(c),c.phone,c.email,c.address].join(' ').toLowerCase().includes(term));
    const matches=state.jobs.filter(j=>matchedCustomers.some(c=>c.id===j.customer_id)||[nameOf(j),vehicleName(j.vehicles),j.address].join(' ').toLowerCase().includes(term));
    matches.slice(0,8).forEach(j=>result.append(line(nameOf(j),[fmtDate(j.scheduled_start),vehicleName(j.vehicles),j.status.replaceAll('_',' ')].join(' • '),[button('Open job',()=>openJob(j.id)),button('Edit details',()=>editJob(j))])));
    matchedCustomers.filter(c=>!matches.some(j=>j.customer_id===c.id)).slice(0,5).forEach(c=>result.append(line(customerName(c),[c.phone,c.email,'No job in the loaded list'].filter(Boolean).join(' • '),[button('Customers',()=>showView('customers'))])));
    if(!result.children.length)result.append(node('p','No matches in the loaded records.','muted'));
  }
  center.addEventListener('click',e=>{const b=e.target.closest('[data-command]');if(!b)return;if(b.dataset.command==='new')els.newJobBtn.click();else showView(b.dataset.command);});
  find('commandSearch').addEventListener('input',renderSearch);
  const edit=document.createElement('dialog');edit.id='commandEditJob';
  edit.innerHTML=`<form class="modal-card"><div class="panel-head"><h3>Edit job details</h3><button class="icon-btn" type="button" aria-label="Close job details">×</button></div><p id="commandEditName" class="muted"></p><div class="form-grid"><label class="full">Service address<input name="address" maxlength="500"></label><label class="full">Vehicle<select name="vehicle_id"></select></label><label>Confirmed job total ($)<input name="total" type="number" min="0.01" step="0.01" inputmode="decimal"></label><label>Planned duration (minutes)<input name="duration" type="number" min="15" max="1440" step="1"></label><label class="full">Internal notes<textarea name="internal_notes" rows="4"></textarea></label></div><p class="muted">Start time stays unchanged. Price can be set before an invoice exists. Open the job workspace for invoices, payments, photos and status.</p><p id="commandEditMessage" role="status"></p><button type="submit" class="btn primary">Save job details</button></form>`;
  document.body.append(edit);let editing;
  edit.querySelector('.icon-btn').onclick=()=>edit.close();
  function editJob(job){editing={...job};const f=edit.querySelector('form');f.elements.address.value=job.address||'';f.elements.total.value=Number(job.total)>0?job.total:'';f.elements.total.disabled=!state.invoices || state.invoices.some(i=>i.job_id===job.id && i.status!=='void');f.elements.duration.value=job.scheduled_start&&job.scheduled_end?Math.round((new Date(job.scheduled_end)-new Date(job.scheduled_start))/60000):'';f.elements.duration.disabled=!job.scheduled_start;f.elements.internal_notes.value=job.internal_notes||'';f.elements.vehicle_id.replaceChildren(new Option('Vehicle not confirmed',''));state.vehicles.filter(v=>v.customer_id===job.customer_id).forEach(v=>f.elements.vehicle_id.add(new Option(vehicleName(v),v.id)));f.elements.vehicle_id.value=job.vehicle_id||'';edit.querySelector('#commandEditName').textContent=nameOf(job)+' · '+fmtDate(job.scheduled_start);edit.querySelector('#commandEditMessage').textContent='';edit.showModal();}
  edit.querySelector('form').addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget,b=form.querySelector('[type="submit"]'),message=edit.querySelector('#commandEditMessage');b.disabled=true;
    try{
      const payload={address:form.elements.address.value.trim(),vehicle_id:form.elements.vehicle_id.value||null,internal_notes:form.elements.internal_notes.value.trim(),updated_at:new Date().toISOString()};
      if(!form.elements.total.disabled && form.elements.total.value && Number(form.elements.total.value)!==Number(editing.total)) {
        const {data:existing,error:invoiceError}=await db.from('invoices').select('id').eq('job_id',editing.id).eq('business_id',state.businessId).neq('status','void').limit(1);
        if(invoiceError)throw invoiceError;if(existing?.length)throw new Error('An invoice exists now. Reopen this job to review its price.');
        const {data:current,error:jobError}=await db.from('jobs').select('tax').eq('id',editing.id).eq('business_id',state.businessId).single();if(jobError)throw jobError;
        payload.total=Math.round(Number(form.elements.total.value)*100)/100;payload.subtotal=Math.round((payload.total-Number(current.tax||0))*100)/100;
        if(payload.subtotal<0)throw new Error('Total cannot be less than the recorded tax.');
      }
      if(!form.elements.duration.disabled && form.elements.duration.value){
        const end=new Date(new Date(editing.scheduled_start).getTime()+Number(form.elements.duration.value)*60000);
        const overlaps=state.jobs.some(j=>j.id!==editing.id && active(j) && j.scheduled_start && new Date(j.scheduled_start)<new Date(end.getTime()+30*60000) && new Date(j.scheduled_end||new Date(new Date(j.scheduled_start).getTime()+120*60000))>new Date(new Date(editing.scheduled_start).getTime()-30*60000));
        if(overlaps)throw new Error('This duration overlaps another job or the 30-minute travel buffer.');payload.scheduled_end=end.toISOString();
      }
      const {data,error}=await db.from('jobs').update(payload).eq('id',editing.id).eq('business_id',state.businessId).eq('address',editing.address).eq('internal_notes',editing.internal_notes).eq('total',editing.total).select('id').maybeSingle();
      if(error)throw error;if(!data)throw new Error('Job changed or access was denied. Refresh and try again.');
      edit.close();await loadAll();showAppNotice('Job details saved.');
    }catch(error){message.textContent=error.message;}finally{b.disabled=false;}
  });
  const originalRender=render;render=function(){originalRender();renderCenter();};
  document.addEventListener('ops:updated',renderCenter);
})();
