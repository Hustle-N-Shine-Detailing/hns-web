const allowedOrigins = new Set(['https://hustlenshine.pro', 'https://www.hustlenshine.pro']);
const publicKey = 'sb_publishable_4JQI3mjlyxVIgLbjx1hvhw_iiFIZIwq';
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const headers = { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':allowedOrigins.has(origin) ? origin : 'https://hustlenshine.pro', 'Access-Control-Allow-Headers':'apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Vary':'Origin', 'Cache-Control':'no-store' };
  const reply = (data: unknown, status=200) => new Response(JSON.stringify(data), { status, headers });
  if (origin && !allowedOrigins.has(origin)) return reply({error:'Origin not allowed.'},403);
  if (req.method==='OPTIONS') return new Response(null,{status:204,headers});
  if (req.method!=='POST') return reply({error:'Method not allowed.'},405);
  // This is a public intake endpoint. API-key validation identifies the project,
  // not a customer. Database reads/updates remain protected by admin-only RLS.
  if (req.headers.get('apikey')!==publicKey) return reply({error:'Invalid API key.'},401);
  try {
    const reader=req.body?.getReader(); if(!reader) return reply({error:'Request body required.'},400);
    let size=0; const chunks:Uint8Array[]=[];
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>10000){await reader.cancel();return reply({error:'Request too large.'},413);}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply({error:'Invalid request.'},400);}
    if(!body || typeof body!=='object' || Array.isArray(body))return reply({error:'Invalid request.'},400);
    if(body.website || body.consent!==true)return reply({error:'Please check the form and consent box.'},400);
    const limits:Record<string,number>={customer_name:100,phone:30,email:254,city:100,vehicle:80,service:100,customer_notes:2000};
    const data:Record<string,string>={};for(const [k,max] of Object.entries(limits)){if(body[k]!==undefined && typeof body[k]!=='string')return reply({error:'Invalid form field.'},400);data[k]=(body[k]||'').trim();if(data[k].length>max)return reply({error:'A form field is too long.'},400);}
    if(data.customer_name.length<2 || !/^[+\d()\s.-]{7,30}$/.test(data.phone) || data.phone.replace(/\D/g,'').length<7)return reply({error:'Enter your name and a valid phone number.'},400);
    if(data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))return reply({error:'Enter a valid email address.'},400);
    const vehicles=['Cars & Sedans','Trucks & SUVs','Oversized & RVs','Boats & Powersports'];
    const services=['Exterior Wash & Gloss','Interior Restoration','Signature Full Detail','1-Step Paint Correction','2-Step Paint Correction','3-Step Paint Correction','Ceramic Coating','Specialty Vehicle Detail'];
    if(!vehicles.includes(data.vehicle)||!services.includes(data.service))return reply({error:'Choose a vehicle and service.'},400);
    const url=Deno.env.get('SUPABASE_URL')!;
    const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const key=secretKeys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dbHeaders:Record<string,string>={apikey:key,'Content-Type':'application/json'};
    if(!secretKeys.default)dbHeaders.Authorization='Bearer '+key;
    const ip=req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown';
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
    const rateKey=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
    const rate=await fetch(url+'/rest/v1/rpc/accept_request_attempt',{method:'POST',headers:dbHeaders,body:JSON.stringify({rate_key:rateKey})});
    if(!rate.ok)return reply({error:'Unable to receive requests right now. Please call or text (208) 977-1200.'},503);
    if(await rate.json()!==true)return reply({error:'Too many requests. Please call or text (208) 977-1200.'},429);
    const saved=await fetch(url+'/rest/v1/booking_requests',{method:'POST',headers:{...dbHeaders,Prefer:'return=minimal'},body:JSON.stringify(data)});
    if(!saved.ok)return reply({error:'Your request was not saved. Please call or text (208) 977-1200.'},503);
    return reply({ok:true},201);
  } catch { return reply({error:'Unable to send your request. Please call or text (208) 977-1200.'},500); }
});
