(function(){
  var INTAKE_URL='https://eratuoffduqjywqlljwc.supabase.co/functions/v1/booking-request';
  var PUBLIC_KEY='sb_publishable_4JQI3mjlyxVIgLbjx1hvhw_iiFIZIwq';
  var params=new URLSearchParams(location.search),KEY='hns_campaign_v1';
  function referrerHost(){try{return document.referrer?new URL(document.referrer).hostname:''}catch(e){return''}}
  function context(){var saved={};try{saved=JSON.parse(sessionStorage.getItem(KEY)||'{}')||{}}catch(e){}var incoming={referrer_host:referrerHost(),utm_source:params.get('utm_source')||'',utm_medium:params.get('utm_medium')||'',utm_campaign:params.get('utm_campaign')||''};var merged={referrer_host:incoming.referrer_host||saved.referrer_host||'',utm_source:incoming.utm_source||saved.utm_source||'',utm_medium:incoming.utm_medium||saved.utm_medium||'',utm_campaign:incoming.utm_campaign||saved.utm_campaign||''};try{sessionStorage.setItem(KEY,JSON.stringify(merged))}catch(e){}return merged}
  var campaign=context();
  function send(payload){return fetch(INTAKE_URL,{method:'POST',headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true})}
  function track(name){send({event_name:name,path:location.pathname,referrer_host:campaign.referrer_host,utm_source:campaign.utm_source,utm_medium:campaign.utm_medium,utm_campaign:campaign.utm_campaign}).catch(function(){})}
  track('page_view');
  document.addEventListener('click',function(event){var link=event.target.closest('a[href^="tel:"],a[href^="sms:"]');if(link)track(link.href.indexOf('tel:')===0?'call_click':'text_click')});

  var types={
    '/fleet-detailing/':{category:'Fleet detailing',headline:'Request a fleet quote',prompt:'Tell me how many vehicles you have and what “clean” needs to look like. I’ll follow up personally.'},
    '/dealer-detailing/':{category:'Dealership recon',headline:'Request a dealer trial',prompt:'Send your lot size, typical recon needs and the first vehicle you want me to prove myself on.'},
    '/body-shop-detailing/':{category:'Body shop cleanup',headline:'Request a shop trial',prompt:'Tell me your normal delivery volume and what final cleanup you need before vehicles go back to customers.'},
    '/commercial-detailing/':{category:'Commercial account',headline:'Request a business quote',prompt:'Tell me what your company drives, how many vehicles you have and how often you want them cleaned.'},
    '/trade-partners/':{category:'Trade partner',headline:'Request wholesale pricing',prompt:'Tell me what kind of overflow work you need and the volume you expect. Your customer stays yours.'}
  };
  var type=types[location.pathname];
  if(!type)return;
  var host=document.querySelector('.cta');
  if(!host||host.querySelector('[data-commercial-lead-form]'))return;
  var wrap=document.createElement('div');
  wrap.className='lead-capture';
  wrap.innerHTML='<div class="lead-capture-head"><div><b>Quick inquiry</b><h3>'+type.headline+'</h3><p>'+type.prompt+'</p></div><span>Usually takes under a minute</span></div>'+
    '<form data-commercial-lead-form class="lead-capture-form">'+
      '<input class="form-trap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">'+
      '<label>Company<input name="company_name" maxlength="120" required></label>'+
      '<label>Your name<input name="contact_name" maxlength="100" required></label>'+
      '<label>Phone<input name="phone" inputmode="tel" maxlength="30" required></label>'+
      '<label>Email<input name="email" type="email" maxlength="254"></label>'+
      '<label>City<input name="city" maxlength="100" value="Boise"></label>'+
      '<label>Approx. vehicles<input name="estimated_vehicles" type="number" min="0" max="10000" value="1"></label>'+
      '<label class="full">What do you need?<textarea name="notes" rows="4" maxlength="1800" placeholder="Vehicle types, condition, frequency, location, deadline, or anything I should know."></textarea></label>'+
      '<label class="consent full"><input name="consent" type="checkbox" required> <span>I agree Hustle & Shine can contact me about this request.</span></label>'+
      '<div class="full lead-submit-row"><button class="btn primary" type="submit">Send request →</button><span class="lead-form-message" role="status"></span></div>'+
    '</form>';
  var related=host.querySelector('.related');
  if(related)host.insertBefore(wrap,related);else host.appendChild(wrap);
  var form=wrap.querySelector('form'),button=form.querySelector('button[type="submit"]'),message=wrap.querySelector('.lead-form-message');
  form.addEventListener('submit',async function(event){
    event.preventDefault();
    if(!form.reportValidity())return;
    var fd=new FormData(form);
    var payload={
      lead_type:'commercial',company_name:String(fd.get('company_name')||'').trim(),contact_name:String(fd.get('contact_name')||'').trim(),
      phone:String(fd.get('phone')||'').trim(),email:String(fd.get('email')||'').trim(),city:String(fd.get('city')||'').trim(),
      estimated_vehicles:Number(fd.get('estimated_vehicles')||0),category:type.category,notes:String(fd.get('notes')||'').trim(),
      website:String(fd.get('website')||''),consent:fd.get('consent')==='on',referrer_host:campaign.referrer_host,
      utm_source:campaign.utm_source,utm_medium:campaign.utm_medium,utm_campaign:campaign.utm_campaign
    };
    track('request_submit');button.disabled=true;button.textContent='Sending…';message.textContent='';
    try{
      var response=await send(payload),data={};try{data=await response.json()}catch(e){}
      if(!response.ok||!data.ok)throw new Error(data.error||'Could not save your request.');
      track('request_saved');message.textContent='Got it. Joshua will follow up directly.';message.className='lead-form-message success';form.reset();
      form.elements.city.value='Boise';form.elements.estimated_vehicles.value='1';
    }catch(error){track('request_error');message.textContent=error.message||'Could not send. Call or text (208) 977-1200.';message.className='lead-form-message error'}
    finally{button.disabled=false;button.textContent='Send request →'}
  });
})();