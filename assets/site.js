
(function(){
  var menuBtn=document.getElementById('menuToggle');
  var menu=document.getElementById('mobileMenu');
  menuBtn.addEventListener('click',function(){
    var open=menu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded',String(open));
    menuBtn.setAttribute('aria-label',open?'Close menu':'Open menu');
  });
  menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){menu.classList.remove('open');menuBtn.setAttribute('aria-expanded','false');});});

  var CAL='https://calendly.com/mrbaldwin-hustlenshine/';
  var VEHICLES=[
    {id:'sedan',name:'Cars & Sedans',sub:'Coupes · sedans · hatchbacks'},
    {id:'suv',name:'Trucks & SUVs',sub:'Pickups · SUVs · crossovers'},
    {id:'large',name:'Oversized & RVs',sub:'Duallys · vans · RVs'},
    {id:'moto',name:'Boats & Powersports',sub:'Boats · UTVs · motorcycles'}
  ];
  var EXT={key:'ext',name:'Exterior Wash & Gloss',desc:'Hand wash, wheel & tire cleaning, gloss-enhancing sealant, exterior glass, tire shine.',cal:'exterior-wash-gloss-enhancement'};
  var INT={key:'int',name:'Interior Restoration',desc:'Full vacuum, carpet & upholstery shampoo, all surfaces detailed, interior glass, odor treatment.',cal:'complete-interior-restoration'};
  var SIG={key:'sig',name:'Signature Full Detail',desc:'Exterior wash and gloss paired with full interior restoration.',cal:'signature-full-detail-interior-exterior'};

  function pkg(base,price,stripe,starting){return{key:base.key,name:base.name,desc:base.desc,cal:base.cal,price:price,stripe:stripe,starting:!!starting};}
  var PACKAGES={
    sedan:[
      pkg(EXT,100,'https://buy.stripe.com/5kQ9AT0EZ4Ftfgq2NN0co02'),
      pkg(INT,140,'https://buy.stripe.com/3cI28rdrL4Ft0lw4VV0co05'),
      pkg(SIG,220,'https://buy.stripe.com/dRm6oH2N73Bp4BMewv0co08')
    ],
    suv:[
      pkg(EXT,180,'https://buy.stripe.com/28E9AT2N79ZNfgq7430co03'),
      pkg(INT,220,'https://buy.stripe.com/14AdR9cnH6NBc4ebkj0co06'),
      pkg(SIG,340,'https://buy.stripe.com/7sY28r3Rb1thc4e8870co09')
    ],
    large:[
      pkg(EXT,210,'https://buy.stripe.com/aFafZhgDX1thecm8870co04',true),
      pkg(INT,260,'https://buy.stripe.com/8x23cv87rb3Rd8i3RR0co07',true),
      pkg(SIG,400,'https://buy.stripe.com/fZueVd87rdbZ4BM1JJ0co0a',true)
    ],
    moto:[
      {key:'spec',name:'Specialty Vehicle Detail',desc:'Boats, RVs, UTVs, ATVs, and motorcycles. Quoted after an assessment of the vehicle.',cal:'specialty-vehicle-detail-boat-rv-utv-motorcycle',price:null,stripe:null,starting:false}
    ]
  };

  var state={vehicle:null,pkg:null,step:1};
  var $=function(id){return document.getElementById(id);};
  function money(n){return '$'+n;}

  function renderVehicles(){
    var g=$('vehicleGrid'); g.innerHTML='';
    VEHICLES.forEach(function(v){
      var b=document.createElement('button');
      b.className='opt'; b.type='button';
      b.innerHTML='<span class="opt-name">'+v.name+'</span><span class="opt-sub">'+v.sub+'</span>';
      b.addEventListener('click',function(){state.vehicle=v.id;state.pkg=null;goStep(2);});
      g.appendChild(b);
    });
  }

  function renderPackages(){
    var list=$('packageList');
    var v=VEHICLES.find(function(x){return x.id===state.vehicle;});
    $('step2Title').textContent='Step 2 — Choose your service for '+(v?v.name:'');
    list.innerHTML='';
    (PACKAGES[state.vehicle]||[]).forEach(function(p){
      var b=document.createElement('button');
      b.className='pkg-opt';b.type='button';
      var priceHtml=p.price
        ?'<span class="pkg-price">'+money(p.price)+(p.starting?'<small>Starting</small>':'')+'</span>'
        :'<span class="pkg-price" style="font-size:1.2rem">Quote<small>After a quick look</small></span>';
      b.innerHTML='<span><span class="pkg-name">'+p.name+'</span><span class="pkg-desc">'+p.desc+'</span></span>'+priceHtml;
      b.addEventListener('click',function(){state.pkg=p.key;goStep(3);});
      list.appendChild(b);
    });
  }

  function renderSummary(){
    var v=VEHICLES.find(function(x){return x.id===state.vehicle;});
    var p=(PACKAGES[state.vehicle]||[]).find(function(x){return x.key===state.pkg;});
    if(!v||!p)return;
    $('sumVehicle').textContent=v.name;
    $('sumService').textContent=p.name;
    $('sumIncludes').textContent=p.desc;
    $('sumPrice').textContent=p.price?money(p.price):'Quote';
    $('sumPriceLabel').textContent=p.starting?'Starting price':(p.price?'Service price':'Custom quote');
    $('sumNote').textContent=p.price
      ?(p.starting?'Starting price only. Confirm the final price and appointment before paying.':'Schedule your appointment before paying. Payment and scheduling are separate steps.')
      :'Priced after a quick look at the vehicle. Book an assessment or text us photos for a real number.';

    var acts=$('sumActions');acts.innerHTML='';
    var sched=document.createElement('a');
    sched.className='btn btn-primary';
    sched.href=CAL+p.cal;sched.target='_blank';sched.rel='noopener';
    sched.textContent=p.price?'Check availability & book':'Book an assessment';
    acts.appendChild(sched);

    if(p.stripe&&!p.starting){
      var pay=document.createElement('a');
      pay.className='btn btn-outline';pay.href=p.stripe;pay.target='_blank';pay.rel='noopener';
      pay.textContent='Pay '+money(p.price)+' with Stripe';
      acts.appendChild(pay);
    }
    var txt=document.createElement('a');
    txt.className='btn btn-outline';txt.href='sms:+12089771200';txt.textContent='Text a question';
    acts.appendChild(txt);
  }

  function goStep(n){
    state.step=n;
    if(n===1){state.vehicle=null;state.pkg=null;renderVehicles();}
    if(n===2)renderPackages();
    if(n===3)renderSummary();

    document.querySelectorAll('.stage').forEach(function(s){s.hidden=parseInt(s.dataset.stage,10)!==n;});
    document.querySelectorAll('.pnode').forEach(function(node){
      var i=parseInt(node.dataset.node,10);
      node.classList.toggle('current',i===n);
      node.classList.toggle('done',i<n);
      if(i===n)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');
    });
    var heading=document.querySelector('[data-stage="'+n+'"] .step-title');
    if(heading){heading.focus({preventScroll:true});}
  }

  $('back1').addEventListener('click',function(){goStep(1);});
  $('back2').addEventListener('click',function(){state.pkg=null;goStep(2);});
  $('restart').addEventListener('click',function(){goStep(1);});
  $('progress').querySelector('[data-node="1"]').setAttribute('aria-current','step');
  renderVehicles();
})();
