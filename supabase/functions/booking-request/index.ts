const allowedOrigins = new Set(['https://hustlenshine.pro', 'https://www.hustlenshine.pro']);
const publicKey = 'sb_publishable_4JQI3mjlyxVIgLbjx1hvhw_iiFIZIwq';
const businessId = '612c314d-962e-4119-adc4-ac9c16216053';
const analyticsEvents = new Set(['page_view','booking_open','calendar_click','payment_click','call_click','text_click']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
}

async function sha256(value: string) {
  return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
}

function deviceType(userAgent: string) {
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return 'tablet';
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return 'mobile';
  return userAgent ? 'desktop' : 'unknown';
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const headers = { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':allowedOrigins.has(origin) ? origin : 'https://hustlenshine.pro', 'Access-Control-Allow-Headers':'apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Vary':'Origin', 'Cache-Control':'no-store' };
  const reply = (data: unknown, status=200) => new Response(JSON.stringify(data), { status, headers });
  if (origin && !allowedOrigins.has(origin)) return reply({error:'Origin not allowed.'},403);
  if (req.method==='OPTIONS') return new Response(null,{status:204,headers});
  if (req.method!=='POST') return reply({error:'Method not allowed.'},405);
  // This public endpoint accepts booking forms and anonymous analytics events.
  // Database reads and owner updates remain protected by admin-only RLS.
  if (req.headers.get('apikey')!==publicKey) return reply({error:'Invalid API key.'},401);
  try {
    const reader=req.body?.getReader(); if(!reader) return reply({error:'Request body required.'},400);
    let size=0; const chunks:Uint8Array[]=[];
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>10000){await reader.cancel();return reply({error:'Request too large.'},413);}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply({error:'Invalid request.'},400);}
    if(!body || typeof body!=='object' || Array.isArray(body))return reply({error:'Invalid request.'},400);

    const url=Deno.env.get('SUPABASE_URL')!;
    const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const key=secretKeys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dbHeaders:Record<string,string>={apikey:key,'Content-Type':'application/json'};
    if(!secretKeys.default)dbHeaders.Authorization='Bearer '+key;
    const ip=req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown';

    if (typeof body.event_name==='string') {
      if(!analyticsEvents.has(body.event_name))return reply({error:'Invalid event.'},400);
      const rateKey=await sha256('analytics|'+ip);
      const rate=await fetch(url+'/rest/v1/rpc/accept_site_event',{method:'POST',headers:dbHeaders,body:JSON.stringify({rate_key:rateKey})});
      if(!rate.ok || await rate.json()!==true)return reply({ok:true});
      const ua=req.headers.get('user-agent')||'';
      const month=new Date().toISOString().slice(0,7);
      const visitorHash=await sha256([ip,ua,month].join('|'));
      const clean=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
      const pathValue=clean(body.path,300);
      const country=(req.headers.get('cf-ipcountry')||'').toUpperCase();
      const event={
        business_id:businessId,
        event_name:body.event_name,
        path:pathValue.startsWith('/')?pathValue:'/',
        visitor_hash:visitorHash,
        referrer_host:clean(body.referrer_host,253),
        device_type:deviceType(ua),
        country_code:/^[A-Z]{2}$/.test(country)?country:'',
        utm_source:clean(body.utm_source,100),
        utm_medium:clean(body.utm_medium,100),
        utm_campaign:clean(body.utm_campaign,150)
      };
      const saved=await fetch(url+'/rest/v1/site_events',{method:'POST',headers:{...dbHeaders,Prefer:'return=minimal'},body:JSON.stringify(event)});
      if(!saved.ok)return reply({ok:false},503);
      if((body.event_name==='calendar_click'||body.event_name==='payment_click') && uuidPattern.test(body.booking_request_id||'') && uuidPattern.test(body.tracking_token||'')){
        const field=body.event_name==='payment_click'?'payment_clicked_at':'calendar_clicked_at';
        const query=new URLSearchParams({id:'eq.'+body.booking_request_id,tracking_token:'eq.'+body.tracking_token});
        await fetch(url+'/rest/v1/booking_requests?'+query.toString(),{method:'PATCH',headers:{...dbHeaders,Prefer:'return=minimal'},body:JSON.stringify({[field]:new Date().toISOString()})});
      }
      return reply({ok:true});
    }

    if(body.website || body.consent!==true)return reply({error:'Please check the form and consent box.'},400);
    const limits:Record<string,number>={customer_name:100,phone:30,email:254,city:100,vehicle:80,service:100,customer_notes:2000};
    const data:Record<string,string>={};for(const [k,max] of Object.entries(limits)){if(body[k]!==undefined && typeof body[k]!=='string')return reply({error:'Invalid form field.'},400);data[k]=(body[k]||'').trim();if(data[k].length>max)return reply({error:'A form field is too long.'},400);}
    if(data.customer_name.length<2 || !/^[+\d()\s.-]{7,30}$/.test(data.phone) || data.phone.replace(/\D/g,'').length<7)return reply({error:'Enter your name and a valid phone number.'},400);
    if(data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))return reply({error:'Enter a valid email address.'},400);
    const vehicles=['Cars & Sedans','Trucks & SUVs','Oversized & RVs','Boats & Powersports'];
    const services=['Exterior Wash & Gloss','Interior Restoration','Signature Full Detail','1-Step Paint Correction','2-Step Paint Correction','3-Step Paint Correction','Ceramic Coating','Specialty Vehicle Detail'];
    if(!vehicles.includes(data.vehicle)||!services.includes(data.service))return reply({error:'Choose a vehicle and service.'},400);
    const rateKey=await sha256('booking|'+ip);
    const rate=await fetch(url+'/rest/v1/rpc/accept_request_attempt',{method:'POST',headers:dbHeaders,body:JSON.stringify({rate_key:rateKey})});
    if(!rate.ok)return reply({error:'Unable to receive requests right now. Please call or text (208) 977-1200.'},503);
    if(await rate.json()!==true)return reply({error:'Too many requests. Please call or text (208) 977-1200.'},429);
    const saved=await fetch(url+'/rest/v1/booking_requests?select=id,tracking_token',{method:'POST',headers:{...dbHeaders,Prefer:'return=representation'},body:JSON.stringify(data)});
    if(!saved.ok)return reply({error:'Your request was not saved. Please call or text (208) 977-1200.'},503);
    const rows=await saved.json();
    return reply({ok:true,booking_request_id:rows[0]?.id,tracking_token:rows[0]?.tracking_token},201);
  } catch { return reply({error:'Unable to send your request. Please call or text (208) 977-1200.'},500); }
});
