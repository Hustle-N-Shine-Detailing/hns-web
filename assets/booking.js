(() => {
  const form=document.getElementById('request-form');
  const message=document.getElementById('request-message');
  const button=document.getElementById('send-request');
  let pending=false;
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(pending||!form.reportValidity())return;
    const data=Object.fromEntries(new FormData(form));data.consent=form.elements.consent.checked;
    data.vehicle=document.getElementById('sumVehicle').textContent;data.service=document.getElementById('sumService').textContent;
    pending=true;button.disabled=true;button.textContent='Sending…';message.textContent='';
    try{
      const response=await fetch('https://eratuoffduqjywqlljwc.supabase.co/functions/v1/booking-request',{method:'POST',headers:{apikey:'sb_publishable_4JQI3mjlyxVIgLbjx1hvhw_iiFIZIwq','Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});
      const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'Unable to send. Please call or text (208) 977-1200.');
      message.textContent='Your request has been sent to Hustle & Shine. This is not a confirmed appointment. You can use the calendar below to choose an available time.';message.className='form-message success';form.reset();
    }catch(error){message.textContent=error.name==='TimeoutError'?'The connection timed out. Your request may have arrived; please call or text to confirm.':error.message;message.className='form-message error';}
    finally{pending=false;button.disabled=false;button.textContent='Send request';message.focus();}
  });
})();
