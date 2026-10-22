// DOM stub tests of actual UI scripts. No browser layout or PHP is exercised.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
class E {
 constructor(){this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.children=[];this.dataset={};this.classes=new Set();this.classList={contains:x=>this.classes.has(x),add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};this.elements={namedItem:n=>this.fields[n]};this.fields={};this.namespaceURI='http://www.w3.org/2000/svg';}
 addEventListener(){} focus(){} close(){this.open=false;}showModal(){this.open=true;}setAttribute(){}append(...x){this.children.push(...x);}replaceChildren(...x){this.children=x;}querySelector(){return new E();}
}
(async()=>{
 const ids={};const get=id=>ids[id]??=(new E());
 for(const [f,names] of Object.entries({loginForm:['username','password'],recordForm:['cow_id','recorded_date','feed_kg','weight_kg','feed_type'],thresholdForm:['hrMin','hrMax','hrCriticalLow','hrCriticalHigh','tempMin','tempMax','tempCriticalLow','tempCriticalHigh','nh3Warning']}))for(const n of names)get(f).fields[n]=new E();
 get('recordForm').fields.cow_id.value='C001';get('feedCow').value='all';
 let user=null,rows=[],sessions=[],lastBody=null;const listeners={},intervals=[];
 const settings={hrMin:48,hrMax:84,hrCriticalLow:40,hrCriticalHigh:110,tempMin:36.7,tempMax:39.1,tempCriticalLow:35,tempCriticalHigh:40,nh3Warning:null};
 const ctx={console,crypto:crypto.webcrypto,Intl,Date,Map,Set,Number,String,Array,Object,JSON,URLSearchParams,AbortController,Event,Math,Promise,setTimeout,clearTimeout,setInterval:f=>intervals.push(f),confirm:()=>true,
 document:{getElementById:get,querySelector:s=>get(s),querySelectorAll:()=>[],createElement:()=>new E(),createElementNS:()=>new E(),visibilityState:'visible'},HEALTH_LIMITS:{},refreshDataStatus(){},closeDropdowns(){},showToast(){},showPage:n=>{ctx.page=n;},fetch:async(url,options)=>{
 const u=new URL(url,'https://test/'),a=u.searchParams.get('action'),b=options.body?JSON.parse(options.body):null;let data={status:'success'};
 if(a==='session')Object.assign(data,{user,csrf:'csrf'});
 if(a==='login'){user={id:b.username==='pln'?2:1,username:b.username,role:b.username==='pln'?'pln':'petugas'};Object.assign(data,{user,csrf:'csrf'});}
 if(a==='logout'){user=null;Object.assign(data,{user,csrf:'csrf'});}
 if(a==='settings')Object.assign(data,{data:settings,revision:1});
 if(a==='records'){
  if(options.method==='POST'){lastBody=b;rows=[{...b,id:b.id||1,revision:1,source:'manual'}];}
  if(options.method==='DELETE')rows=[];
  Object.assign(data,{data:rows,latest_weights:[],from:'2026-10-01',to:'2026-10-22'});
 }
 if(a==='scale_sessions'){
  if(options.method==='POST'){lastBody=b;if(b.operation==='cancel')sessions[0].effective_state='cancelled';else sessions=[{...b,id:'a'.repeat(32),effective_state:'waiting'}];}
  data.data=sessions;
 }
 return {ok:true,status:200,json:async()=>data};
 }};ctx.window=ctx;ctx.addEventListener=(n,f)=>(listeners[n]??=[]).push(f);ctx.dispatchEvent=e=>(listeners[e.type]||[]).forEach(f=>f());
 vm.createContext(ctx);const root=__dirname+'/../';vm.runInContext(fs.readFileSync(root+'petugas.js','utf8'),ctx);vm.runInContext(fs.readFileSync(root+'scales.js','utf8'),ctx);
 const tick=()=>new Promise(resolve=>setImmediate(resolve));await tick();
 assert.equal(get('recordFields').disabled,true);
 async function login(name){get('loginForm').fields.username.value=name;get('loginForm').fields.password.value='test-password';await get('loginForm').onsubmit({preventDefault(){}});await tick();}
 await login('pln');assert.equal(ctx.page,'reports');assert.equal(get('accountSettings').hidden,true);assert.equal(get('recordFields').disabled,true);
 await get('accountLogout').onclick();await login('petugas');assert.equal(ctx.page,'settings');assert.equal(get('recordFields').disabled,false);
 const f=get('recordForm').fields;f.feed_type.value='basah';f.feed_kg.value='10.125';await get('recordForm').onsubmit({preventDefault(){}});await tick();assert.equal(lastBody.feed_type,'basah');assert.equal(lastBody.feed_kg,10.125);assert.equal(lastBody.id,0);
 let tr=get('feedRows').children[0];await tr.children.at(-1).children[0].onclick();f.feed_kg.value='11';await get('recordForm').onsubmit({preventDefault(){}});await tick();assert.equal(lastBody.id,1);assert.equal(rows.length,1);
 get('scaleCow').value='C003';await get('scaleCow').onchange();await tick();assert.equal(sessions[0].cow_id,'C003');assert.equal(get('scaleCow').disabled,true);
 sessions[0]={...sessions[0],effective_state:'completed',result_kg:325.5};await intervals.at(-1)();await tick();assert.equal(get('scaleCow').disabled,false);assert.equal(get('scaleCow').value,'');assert.match(get('weightSessionMessage').textContent,/Berhasil/);
 get('scaleFeed').value='combor';await get('scaleFeed').onchange();await tick();assert.equal(sessions[0].feed_type,'combor');await get('cancelFeed').onclick();await tick();assert.match(get('feedSessionMessage').textContent,/dibatalkan/);
 tr=get('feedRows').children[0];await tr.children.at(-1).children[1].onclick();await tick();assert.equal(rows.length,0);
 console.log('PASS UI state (DOM stub): PLN/staff roles, manual create/edit/delete, weight completion, feed selection/cancel.');
})().catch(e=>{console.error(e);process.exit(1)});
