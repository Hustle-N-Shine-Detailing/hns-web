(() => {
  const $=id=>document.getElementById(id);
  if(!window.HNSCreateClient){$('login-message').textContent='Sign-in could not load. Please refresh the page.';return;}
  const client=window.HNSCreateClient('https://eratuoffduqjywqlljwc.supabase.co','sb_publishable_4JQI3mjlyxVIgLbjx1hvhw_iiFIZIwq',{auth:{storage:sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const statuses=['new','contacted','scheduled','completed','closed'];
  let rows=[],userId=null,loading=false,offset=0,canLoadMore=false;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  function clear(){userId=null;rows=[];offset=0;$('requests').replaceChildren();$('dashboard').hidden=true;$('logout').hidden=true;$('login-panel').hidden=false;$('password').value='';}
  async function authorize(session){
    if(!session){clear();return;}
    const {data,error}=await client.from('admin_members').select('user_id').eq('user_id',session.user.id).maybeSingle();
    if(error||!data){clear();$('login-message').textContent='This account does not have owner access. Contact the site administrator to activate it.';await client.auth.signOut();return;}
    userId=session.user.id;$('login-panel').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;await load(false);
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
      for(const [label,value,type] of [['Phone',row.phone,'tel'],['Email',row.email,'email'],['Vehicle',row.vehicle],['Service',row.service],['City',row.city]]){if(!value)continue;const p=el('p');p.append(el('strong',label));if(type){const a=el('a',value);a.href=type==='tel'?'tel:'+value.replace(/[^+\d]/g,''):'mailto:'+value;p.append(a);}else p.append(document.createTextNode(value));details.append(p);}card.append(details);
      if(row.customer_notes){card.append(el('p','Customer note: '+row.customer_notes,'customer-note'));}
      const form=el('form'),fields=el('div',undefined,'edit-fields'),statusLabel=el('label','Follow-up status'),select=el('select');select.setAttribute('aria-label','Status for '+row.customer_name);for(const s of statuses){const o=el('option',s.charAt(0).toUpperCase()+s.slice(1));o.value=s;select.append(o);}select.value=row.status;statusLabel.append(select);
      const notesLabel=el('label','Private notes'),notes=el('textarea');notes.rows=3;notes.maxLength=5000;notes.value=row.admin_notes;notesLabel.append(notes);fields.append(statusLabel,notesLabel);const save=el('button','Save changes','primary');save.type='submit';const message=el('span','','save-message');message.setAttribute('role','status');const actions=el('div',undefined,'save-row');actions.append(save,message);form.append(fields,actions);card.append(form);
      form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;message.textContent='Saving…';try{const {data,error}=await client.from('booking_requests').update({status:select.value,admin_notes:notes.value}).eq('id',row.id).select('id,status,admin_notes').single();if(error||!data)throw error||new Error();Object.assign(row,data);top.querySelector('.badge').textContent=row.status;message.textContent='Saved';$('count-new').textContent=rows.filter(r=>r.status==='new').length;$('count-contacted').textContent=rows.filter(r=>r.status==='contacted').length;$('count-scheduled').textContent=rows.filter(r=>r.status==='scheduled').length;}catch{message.textContent='Not saved. Refresh or sign in again, then retry.';}finally{save.disabled=false;}});
      $('requests').append(card);
    }
  }
  async function load(more){
    if(loading||!userId)return;loading=true;$('refresh').disabled=true;$('load-more').disabled=true;$('inbox-message').textContent='Loading requests…';
    const next=more?offset:0;
    try{const {data,error}=await client.from('booking_requests').select('*').order('created_at',{ascending:false}).range(next,next+49);if(error)throw error;if(!userId)return;rows=more?[...rows,...data]:data;offset=next+data.length;canLoadMore=data.length===50;show();$('inbox-message').textContent='Updated '+new Date().toLocaleTimeString();}
    catch{$('inbox-message').textContent='Could not load requests. Check your connection and try Refresh. Your saved requests have not been changed.';}
    finally{loading=false;$('refresh').disabled=false;$('load-more').disabled=false;}
  }
  $('login-form').addEventListener('submit',async event=>{event.preventDefault();$('login-button').disabled=true;$('login-message').textContent='Signing in…';try{const {data,error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;await authorize(data.session);$('password').value='';}catch{$('login-message').textContent='Unable to sign in. Check your email and password, and make sure owner access has been activated.';}finally{$('login-button').disabled=false;}});
  $('logout').addEventListener('click',async()=>{clear();await client.auth.signOut();});$('refresh').addEventListener('click',()=>load(false));$('load-more').addEventListener('click',()=>load(true));$('search').addEventListener('input',show);$('filter').addEventListener('change',show);
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')clear();});
  client.auth.getSession().then(({data,error})=>{if(error){clear();return;}return authorize(data.session);}).catch(()=>{clear();$('login-message').textContent='Could not restore your session. Please sign in again.';});
})();
