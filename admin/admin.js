(() => {
  const $=id=>document.getElementById(id);
  if(!window.HNSCreateClient){$('login-message').textContent='Sign-in could not load. Please refresh the page.';return;}
  const client=window.HNSCreateClient('https://eratuoffduqjywqlljwc.supabase.co','sb_publishable_4JQI3mjlyxVIgLbjx1hvhw_iiFIZIwq',{auth:{storage:sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const BUSINESS_ID='612c314d-962e-4119-adc4-ac9c16216053';
  const statuses=['new','contacted','scheduled','completed','closed'];
  let rows=[],events=[],userId=null,loading=false,trafficLoading=false,offset=0,canLoadMore=false;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  function clear(){userId=null;rows=[];events=[];offset=0;$('requests').replaceChildren();$('traffic-sources').replaceChildren();$('traffic-devices').replaceChildren();$('booking-sources').replaceChildren();$('dashboard').hidden=true;$('logout').hidden=true;$('login-panel').hidden=false;$('password').value='';}
  async function authorize(session){
    if(!session){clear();return;}
    const {data,error}=await client.from('business_members').select('business_id,role').eq('business_id',BUSINESS_ID).eq('user_id',session.user.id).in('role',['owner','manager']).maybeSingle();
    if(error||!data){clear();$('login-message').textContent='This account does not have owner access. Contact the site administrator to activate it.';await client.auth.signOut();return;}
    userId=session.user.id;$('login-panel').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;await Promise.all([load(false),loadTraffic()]);
  }
  function breakdown(target,values,emptyText){
    const counts=new Map();values.forEach(value=>counts.set(value,(counts.get(value)||0)+1));target.replaceChildren();
    const sorted=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
    if(!sorted.length){target.append(el('p',emptyText,'muted'));return;}
    sorted.forEach(([label,total])=>{const row=el('div',undefined,'source-row');row.append(el('span',label),el('strong',String(total)));target.append(row);});
  }
  function showTraffic(){
    const views=events.filter(event=>event.event_name==='page_view');
    const opens=events.filter(event=>event.event_name==='booking_open').length;
    const saved=events.filter(event=>event.event_name==='request_saved').length;
    $('count-views').textContent=views.length;$('count-visitors').textContent=new Set(views.map(event=>event.visitor_hash)).size;
    $('count-booking-opens').textContent=opens;$('count-vehicle-selected').textContent=events.filter(event=>event.event_name==='vehicle_selected').length;$('count-service-selected').textContent=events.filter(event=>event.event_name==='service_selected').length;$('count-request-submit').textContent=events.filter(event=>event.event_name==='request_submit').length;$('count-request-saved').textContent=saved;
    $('count-booking-conversion').textContent=opens?Math.round((saved/opens)*100)+'%':'0%';
    $('count-booking-close').textContent=events.filter(event=>event.event_name==='booking_close').length;
    $('count-form-errors').textContent=events.filter(event=>event.event_name==='form_validation_error').length;
    $('count-request-errors').textContent=events.filter(event=>event.event_name==='request_error').length;
    const cutoff=Date.now()-7*24*60*60*1000;const recentRows=rows.filter(row=>new Date(row.created_at).getTime()>=cutoff);const responseMinutes=recentRows.filter(row=>row.first_contacted_at).map(row=>(new Date(row.first_contacted_at)-new Date(row.created_at))/60000).filter(value=>Number.isFinite(value)&&value>=0);
    const avg=responseMinutes.length?responseMinutes.reduce((sum,value)=>sum+value,0)/responseMinutes.length:null;
    $('avg-response-time').textContent=avg===null?'—':(avg<60?Math.round(avg)+'m':(avg/60).toFixed(avg<600?1:0)+'h');
    $('count-contact-clicks').textContent=events.filter(event=>event.event_name==='call_click'||event.event_name==='text_click').length;
    $('count-calendar-clicks').textContent=events.filter(event=>event.event_name==='calendar_click').length;
    $('count-payment-clicks').textContent=events.filter(event=>event.event_name==='payment_click').length;
    breakdown($('traffic-sources'),views.map(event=>event.utm_source||event.referrer_host||'Direct / unknown'),'No source data yet.');
    breakdown($('traffic-devices'),views.map(event=>event.device_type||'unknown'),'No device data yet.');
    breakdown($('booking-sources'),recentRows.map(row=>row.utm_source||row.referrer_host||'Direct / unknown'),'No attributed bookings yet.');
    $('traffic-message').textContent=events.length?'Updated '+new Date().toLocaleTimeString():'No tracked visits yet.';
  }
  function show(){
    $('count-new').textContent=rows.filter(r=>r.status==='new').length;$('count-contacted').textContent=rows.filter(r=>r.status==='contacted').length;$('count-scheduled').textContent=rows.filter(r=>r.status==='scheduled').length;$('count-total').textContent=rows.length;
    const q=$('search').value.toLowerCase().trim(),status=$('filter').value;
    const visible=rows.filter(r=>(status==='all'||r.status===status)&&[r.customer_name,r.phone,r.email,r.city,r.service,r.vehicle].join(' ').toLowerCase().includes(q));
    $('requests').replaceChildren();$('load-more').hidden=!canLoadMore;
    if(!visible.length){$('requests').append(el('p',rows.length?'No requests match these filters.':'No requests yet. New website submissions will appear here.','empty'));return;}
    for(const row of visible){
      const card=el('article',undefined,'request'),top=el('div',undefined,'request-top'),who=el('div');who.append(el('h2',row.customer_name));const time=el('time',new Date(row.created_at).toLocaleString());time.dateTime=row.created_at;who.append(time);top.append(who,el('span',row.status,'badge'));card.append(top);
      const details=el('div',undefined,'details');
      for(const [label,value,type] of [['Phone',row.phone,'tel'],['Email',row.email,'email'],['Vehicle',row.vehicle],['Service',row.service],['City',row.city],['Lead source',row.utm_source||row.referrer_host||'Direct / unknown'],['Campaign',row.utm_campaign]]){if(!value)continue;const p=el('p');p.append(el('strong',label));if(type){const a=el('a',value);a.href=type==='tel'?'tel:'+value.replace(/[^+\d]/g,''):'mailto:'+value;p.append(a);}else p.append(document.createTextNode(value));details.append(p);}card.append(details);
      const journey=el('div',undefined,'journey');journey.append(el('span','Request saved','done'),el('span','Calendly opened',row.calendar_clicked_at?'done':''),el('span','Stripe opened',row.payment_clicked_at?'done':''));card.append(journey);
      if(row.customer_notes){card.append(el('p','Customer note: '+row.customer_notes,'customer-note'));}
      const form=el('form'),fields=el('div',undefined,'edit-fields'),statusLabel=el('label','Follow-up status'),select=el('select');select.setAttribute('aria-label','Status for '+row.customer_name);for(const s of statuses){const o=el('option',s.charAt(0).toUpperCase()+s.slice(1));o.value=s;select.append(o);}select.value=row.status;statusLabel.append(select);
      const notesLabel=el('label','Private notes'),notes=el('textarea');notes.rows=3;notes.maxLength=5000;notes.value=row.admin_notes;notesLabel.append(notes);fields.append(statusLabel,notesLabel);const save=el('button','Save changes','primary');save.type='submit';const message=el('span','','save-message');message.setAttribute('role','status');const actions=el('div',undefined,'save-row');actions.append(save,message);form.append(fields,actions);card.append(form);
      form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;message.textContent='Saving…';try{const {data,error}=await client.from('booking_requests').update({status:select.value,admin_notes:notes.value}).eq('id',row.id).eq('business_id',BUSINESS_ID).select('id,status,admin_notes,first_contacted_at').single();if(error||!data)throw error||new Error();Object.assign(row,data);top.querySelector('.badge').textContent=row.status;message.textContent='Saved';showTraffic();$('count-new').textContent=rows.filter(r=>r.status==='new').length;$('count-contacted').textContent=rows.filter(r=>r.status==='contacted').length;$('count-scheduled').textContent=rows.filter(r=>r.status==='scheduled').length;}catch{message.textContent='Not saved. Refresh or sign in again, then retry.';}finally{save.disabled=false;}});
      $('requests').append(card);
    }
  }
  async function load(more){
    if(loading||!userId)return;loading=true;$('refresh').disabled=true;$('load-more').disabled=true;$('inbox-message').textContent='Loading requests…';
    const next=more?offset:0;
    try{const {data,error}=await client.from('booking_requests').select('*').eq('business_id',BUSINESS_ID).order('created_at',{ascending:false}).range(next,next+49);if(error)throw error;if(!userId)return;rows=more?[...rows,...data]:data;offset=next+data.length;canLoadMore=data.length===50;show();$('inbox-message').textContent='Updated '+new Date().toLocaleTimeString();}
    catch{$('inbox-message').textContent='Could not load requests. Check your connection and try Refresh. Your saved requests have not been changed.';}
    finally{loading=false;$('refresh').disabled=false;$('load-more').disabled=false;}
  }
  async function loadTraffic(){
    if(trafficLoading||!userId)return;trafficLoading=true;$('traffic-message').textContent='Loading traffic…';
    const since=new Date(Date.now()-7*24*60*60*1000).toISOString();
    try{const {data,error}=await client.from('site_events').select('event_name,occurred_at,visitor_hash,referrer_host,device_type,utm_source,utm_medium,utm_campaign').eq('business_id',BUSINESS_ID).gte('occurred_at',since).order('occurred_at',{ascending:false}).limit(5000);if(error)throw error;if(!userId)return;events=data||[];showTraffic();}
    catch{$('traffic-message').textContent='Traffic could not load. Booking requests are still available below.';}
    finally{trafficLoading=false;}
  }
  $('login-form').addEventListener('submit',async event=>{event.preventDefault();$('login-button').disabled=true;$('login-message').textContent='Signing in…';try{const {data,error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;await authorize(data.session);$('password').value='';}catch{$('login-message').textContent='Unable to sign in. Check your email and password, and make sure owner access has been activated.';}finally{$('login-button').disabled=false;}});
  $('logout').addEventListener('click',async()=>{clear();await client.auth.signOut();});$('refresh').addEventListener('click',()=>Promise.all([load(false),loadTraffic()]));$('load-more').addEventListener('click',()=>load(true));$('search').addEventListener('input',show);$('filter').addEventListener('change',show);
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')clear();});
  client.auth.getSession().then(({data,error})=>{if(error){clear();return;}return authorize(data.session);}).catch(()=>{clear();$('login-message').textContent='Could not restore your session. Please sign in again.';});
})();
