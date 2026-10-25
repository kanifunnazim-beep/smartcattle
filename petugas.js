/* Account and manual records feature; independent of sensor ingestion. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const state={user:null,csrf:'',settingsRevision:0,records:[],latest:[],range:null,recordRevision:0,recordKey:'',recordRequest:0,settingsBusy:false,recordsBusy:false,settingsReady:false,recordsRequest:0,settingsGeneration:0,savingSettings:false};
 window.scUser=null;window.scNh3Warning=null;
 const isStaff=()=>state.user?.role==='petugas';
 const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 const feedNames={kering:'Pakan Kering',combor:'Combor',basah:'Pakan Basah'};
 state.entryId=0;state.requestId=token();
 window.scApi=api;
 const field=(form,name)=>$(form).elements.namedItem(name);
 const message=(id,text,error=false)=>{const e=$(id);e.textContent=text;e.className='sc-message '+(error?'error':'success');};
 function dateWib(d=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
 function shiftDay(day,delta){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);}
 function weekOf(day){const d=new Date(day+'T12:00:00Z');return shiftDay(day,-((d.getUTCDay()+6)%7));}
 function format(v){return v===null||!Number.isFinite(v)?'—':v.toLocaleString('id-ID',{maximumFractionDigits:3});}
 function number(v){return v===null||v===undefined||v===''?null:Number(v);}
 async function api(action,{method='GET',body,params}={}) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try {
   const response=await fetch('web-api.php?'+new URLSearchParams({action,...params}),{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,
    headers:method==='GET'?{}:{'Content-Type':'application/json','X-CSRF-Token':state.csrf},body:body===undefined?undefined:JSON.stringify(body)});
   let data;try{data=await response.json();}catch(e){throw new Error('Layanan petugas belum tersedia. Periksa pemasangan server.');}
   if(!response.ok||data.status!=='success'){
    if(response.status===401&&action!=='login')applySession({user:null,csrf:state.csrf});
    if(response.status===403)syncSession().catch(()=>{});
    const err=new Error(data.message||'Permintaan gagal.');err.status=response.status;throw err;
   }return data;
  }catch(e){if(e.name==='AbortError')throw new Error('Server belum merespons. Coba lagi.');throw e;}finally{clearTimeout(timer);}
 }
 function applySession(data) {
  const changed=state.user?.id!==data.user?.id||state.user?.role!==data.user?.role;
  state.user=data.user;state.csrf=data.csrf||state.csrf;window.scUser=data.user;
  $('accountTitle').textContent=data.user?(data.user.role==='pln'?'PLN · ':'Petugas · ')+data.user.username:'Akses pengunjung';
  $('accountNote').textContent=data.user?(isStaff()?'Akses pengaturan dan laporan aktif.':'Akses seluruh laporan aktif.'):'Monitoring terbuka untuk pengunjung.';
  $('accountLogin').hidden=!!data.user;$('accountLogout').hidden=!data.user;$('accountSettings').hidden=!isStaff();$('feedInput').hidden=!isStaff();
  const canReport=['petugas','pln'].includes(state.user?.role);
  $('reportsLock').hidden=canReport;$('settingsLock').hidden=isStaff();
  const reportsNav=document.querySelector('[data-page="reports"]'),settingsNav=document.querySelector('[data-page="settings"]');
  reportsNav.title=canReport?'Buka laporan':'Login petugas atau PLN untuk membuka laporan';
  reportsNav.setAttribute('aria-label',canReport?'Laporan':'Laporan, perlu login');
  settingsNav.title=isStaff()?'Buka pengaturan':'Login petugas untuk mengubah pengaturan';
  settingsNav.setAttribute('aria-label',isStaff()?'Pengaturan':'Pengaturan, khusus petugas');
  $('thresholdFields').disabled=!isStaff()||!state.settingsReady;$('recordFields').disabled=!isStaff();
  const sub=document.querySelector('#profileButton small');if(sub)sub.textContent=data.user?(isStaff()?'Petugas':'PLN'):'Mode pengunjung';
  if((!isStaff()&&$('page-settings').classList.contains('active'))||(!data.user&&$('page-reports').classList.contains('active')))showPage('overview');
  window.dispatchEvent(new Event('sc-session'));
  if(changed){state.recordKey='';$('saveRecord').disabled=true;renderFeed();}
 }
 async function syncSession(){const r=await api('session');applySession(r);return r;}
 function openLogin(){closeDropdowns();message('loginMessage','');field('loginForm','password').value='';$('loginDialog').showModal();field('loginForm','username').focus();}
 window.scOpenLogin=openLogin;
 async function openSettings(){closeDropdowns();try{await syncSession();}catch(e){openLogin();message('loginMessage',e.message,true);return;}
  if(!state.user){window.scLoginTarget='settings';openLogin();return;}if(!isStaff()){showPage('reports');return;}showPage('settings');await loadSettings(true);await loadRecord();}
 $('accountLogin').onclick=openLogin;$('accountSettings').onclick=openSettings;$('feedInput').onclick=openSettings;
 document.querySelector('[data-page="settings"]').addEventListener('click',()=>{if(state.user)openSettings();});
 $('closeLogin').onclick=()=>{$('loginDialog').close();field('loginForm','password').value='';};
 $('loginDialog').addEventListener('close',()=>field('loginForm','password').value='');
 $('loginForm').onsubmit=async event=>{
  event.preventDefault();const button=$('loginForm').querySelector('[type="submit"]');button.disabled=true;message('loginMessage','Memeriksa akun…');
  try{await syncSession();const r=await api('login',{method:'POST',body:{username:field('loginForm','username').value.trim(),password:field('loginForm','password').value}});applySession(r);$('loginDialog').close();const target=isStaff()?(window.scLoginTarget||'settings'):'reports';window.scLoginTarget=null;showPage(target);if(isStaff()){await loadSettings(true);await loadRecord();}}
  catch(e){message('loginMessage',e.message,true);}finally{button.disabled=false;field('loginForm','password').value='';}
 };
 async function logout(){try{const r=await api('logout',{method:'POST',body:{}});applySession(r);closeDropdowns();showToast('Anda sudah logout.');}catch(e){showToast('Logout belum berhasil: '+e.message);}}
 $('accountLogout').onclick=logout;$('settingsLogout').onclick=logout;
 async function loadSettings(fill=false){
  if(state.settingsBusy||state.savingSettings)return;state.settingsBusy=true;const generation=++state.settingsGeneration;
  try{const r=await api('settings');if(generation!==state.settingsGeneration)return;Object.assign(HEALTH_LIMITS,r.data);window.scNh3Warning=r.data.nh3Warning;state.settingsReady=true;
   if(fill||!state.settingsRevision){Object.entries(r.data).forEach(([k,v])=>{const input=field('thresholdForm',k);if(input)input.value=v??'';});state.settingsRevision=r.revision;}
   $('thresholdFields').disabled=!isStaff();refreshDataStatus();if(fill)message('thresholdMessage','Pengaturan tersimpan telah dimuat.');
  }catch(e){if(fill||!state.settingsReady)message('thresholdMessage',e.message,true);}finally{state.settingsBusy=false;}
 }
 $('reloadThreshold').onclick=()=>loadSettings(true);
 $('thresholdForm').onsubmit=async e=>{e.preventDefault();const data={};for(const [key,value] of new FormData($('thresholdForm')))data[key]=value===''?null:Number(value);
  state.savingSettings=true;++state.settingsGeneration;$('thresholdFields').disabled=true;try{const r=await api('settings',{method:'POST',body:{data,revision:state.settingsRevision}});state.settingsRevision=r.revision;Object.assign(HEALTH_LIMITS,r.data);window.scNh3Warning=r.data.nh3Warning;refreshDataStatus();message('thresholdMessage','Ambang berhasil disimpan untuk seluruh dashboard.');}
  catch(err){message('thresholdMessage',err.message,true);}finally{state.savingSettings=false;$('thresholdFields').disabled=!isStaff();}
 };
 const today=dateWib();$('feedFrom').value=shiftDay(today,-27);$('feedTo').value=today;field('recordForm','recorded_date').value=today;field('recordForm','recorded_date').max=today;
 function loadRecord(){
  state.entryId=0;state.recordRevision=0;state.requestId=token();
  field('recordForm','feed_kg').value='';field('recordForm','weight_kg').value='';field('recordForm','feed_type').value='';
  $('saveRecord').disabled=!isStaff();message('recordMessage','Catatan baru. Untuk koreksi, pilih Ubah pada daftar catatan.');
 }
 $('reloadRecord').onclick=loadRecord;
 $('recordForm').onsubmit=async e=>{
  e.preventDefault();const cow=field('recordForm','cow_id').value,date=field('recordForm','recorded_date').value;
  const feed=number(field('recordForm','feed_kg').value),weight=number(field('recordForm','weight_kg').value);
  if(feed===null&&weight===null){message('recordMessage','Isi pakan atau bobot.',true);return;}
  if(feed!==null&&!field('recordForm','feed_type').value){message('recordMessage','Pilih jenis pakan.',true);return;}
  $('recordFields').disabled=true;
  try{await api('records',{method:'POST',body:{id:state.entryId,revision:state.recordRevision,request_id:state.requestId,cow_id:cow,recorded_date:date,feed_kg:feed,weight_kg:weight,feed_type:field('recordForm','feed_type').value||null}});loadRecord();await loadFeed();message('recordMessage','Catatan berhasil disimpan.');}
  catch(err){message('recordMessage',err.message,true);}
  finally{$('recordFields').disabled=!isStaff();}
 };
 window.addEventListener('sc-records-updated',()=>loadFeed());
 async function loadFeed(){
  const request=++state.recordsRequest;state.recordsBusy=true;const from=$('feedFrom').value,to=$('feedTo').value;
  try{const r=await api('records',{params:{from,to}});if(request!==state.recordsRequest)return;state.records=r.data;state.latest=r.latest_weights;state.range={from:r.from,to:r.to};renderFeed();message('feedMessage','Periode '+r.from+' sampai '+r.to+' · Catatan petugas');}
  catch(e){if(request!==state.recordsRequest)return;message('feedMessage',e.message+' Data yang masih terlihat adalah hasil pemuatan sebelumnya.',true);}finally{if(request===state.recordsRequest)state.recordsBusy=false;}
 }
 $('feedFilter').onsubmit=e=>{e.preventDefault();loadFeed();};$('feedCow').onchange=renderFeed;
 function summarize(rows,latest,cow){
  rows=rows.filter(r=>cow==='all'||r.cow_id===cow);latest=latest.filter(r=>cow==='all'||r.cow_id===cow);
  const weeks=new Map(),perCow=new Map();
  rows.forEach(r=>{const wk=weekOf(r.recorded_date);if(!weeks.has(wk))weeks.set(wk,{date:wk,feed:null,feedTypes:{kering:0,combor:0,basah:0,unknown:0},weights:new Map()});const w=weeks.get(wk);
   if(r.feed_kg!==null){const amount=Number(r.feed_kg);w.feed=(w.feed??0)+amount;const type=['kering','combor','basah'].includes(r.feed_type)?r.feed_type:'unknown';w.feedTypes[type]+=amount;}
   if(r.weight_kg!==null){const old=w.weights.get(r.cow_id);if(!old||old.date<=r.recorded_date)w.weights.set(r.cow_id,{date:r.recorded_date,value:Number(r.weight_kg)});
    if(!perCow.has(r.cow_id))perCow.set(r.cow_id,[]);perCow.get(r.cow_id).push(r);}
  });
  const groups=[...weeks.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(w=>({...w,weight:w.weights.size?[...w.weights.values()].reduce((sum,x)=>sum+x.value,0)/w.weights.size:null}));
  const feeds=groups.filter(w=>w.feed!==null),deltas=[];
  perCow.forEach(arr=>{arr.sort((a,b)=>a.recorded_date.localeCompare(b.recorded_date));if(arr.length>=2)deltas.push(Number(arr.at(-1).weight_kg)-Number(arr[0].weight_kg));});
  return {rows,groups,feed:feeds.length?feeds.reduce((sum,x)=>sum+x.feed,0)/feeds.length:null,weight:latest.length?latest.reduce((sum,x)=>sum+Number(x.weight_kg),0)/latest.length:null,gain:deltas.length?deltas.reduce((a,b)=>a+b,0)/deltas.length:null,weightCount:latest.length,deltaCount:deltas.length};
 }
 // Pure aggregation is shared by UI and regression tests.
 window.scSummarizeFeed=summarize;
 function renderFeed(){
  const cow=$('feedCow').value,result=summarize(state.records,state.latest,cow);
  $('feedAverage').textContent=format(result.feed)+' kg';$('feedWeight').textContent=format(result.weight)+' kg';$('feedGain').textContent=(result.gain>0?'+':'')+format(result.gain)+' kg';
  const latest=state.latest.filter(r=>cow==='all'||r.cow_id===cow).map(r=>r.recorded_date).sort();
  $('feedMetricNote').textContent=(cow==='all'?'Pakan dijumlahkan untuk seluruh sapi; bobot adalah rata-rata '+result.weightCount+' sapi. Perubahan bobot adalah rata-rata '+result.deltaCount+' sapi dengan minimal dua penimbangan.':'Perubahan bobot memakai penimbangan pertama dan terakhir dalam periode.')+(latest.length?' Bobot terakhir dicatat '+latest[0]+(latest.at(-1)!==latest[0]?' – '+latest.at(-1):'')+'.':'')+' Data kosong tidak dihitung sebagai nol.';
  drawFeed(result.groups);const table=$('feedRows');table.replaceChildren();
  [...result.rows].reverse().forEach(row=>{const tr=document.createElement('tr');[row.recorded_date,window.scCowLabel(row.cow_id),feedNames[row.feed_type]||'Belum ditentukan',({manual:'Manual',automatic:'Otomatis',legacy:'Data lama'})[row.source]||'—',format(number(row.feed_kg)),format(number(row.weight_kg))].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});
   const actions=document.createElement('td');if(isStaff()){
    const edit=document.createElement('button');edit.type='button';edit.className='secondary-btn';edit.textContent='Ubah';edit.onclick=async()=>{showPage('settings');field('recordForm','cow_id').value=row.cow_id;field('recordForm','recorded_date').value=row.recorded_date;state.entryId=Number(row.id);state.recordRevision=Number(row.revision);field('recordForm','feed_kg').value=row.feed_kg??'';field('recordForm','weight_kg').value=row.weight_kg??'';field('recordForm','feed_type').value=row.feed_type||'';$('saveRecord').disabled=false;message('recordMessage','Mengoreksi catatan #'+row.id+' untuk '+window.scCowLabel(row.cow_id)+'.');};actions.append(edit);
    const del=document.createElement('button');del.type='button';del.className='secondary-btn';del.textContent='Hapus';del.onclick=async()=>{if(!confirm('Hapus catatan '+window.scCowLabel(row.cow_id)+' tanggal '+row.recorded_date+'?'))return;del.disabled=true;
     try{await api('records',{method:'DELETE',body:{id:Number(row.id),revision:Number(row.revision)}});await loadFeed();if(state.entryId===Number(row.id))loadRecord();}catch(e){showToast(e.message);del.disabled=false;}};actions.append(del);
   }else actions.textContent='—';tr.append(actions);table.append(tr);});
  if(!result.rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=7;td.textContent='Belum ada catatan dalam periode ini.';tr.append(td);table.append(tr);}
 }
 function drawFeed(groups){
  const svg=$('feedChart');svg.replaceChildren();$('feedChartDetail').textContent='Arahkan kursor atau ketuk batang pakan untuk melihat rincian minggu tersebut.';const add=(name,attrs,text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!==undefined)e.textContent=text;svg.append(e);return e;};
  if(!groups.length){add('text',{x:380,y:150,'text-anchor':'middle',fill:'#8492a6','font-size':15},'Belum ada data pakan dan bobot');return;}
  // Fill empty weeks with null, never zero or an interpolated body weight.
  const byWeek=new Map(groups.map(x=>[x.date,x])),weeks=[];
  for(let day=groups[0].date;day<=groups.at(-1).date;day=shiftDay(day,7))weeks.push(byWeek.get(day)||{date:day,feed:null,weight:null});
  const feedMax=Math.max(10,...weeks.map(x=>x.feed??0))*1.15,weights=weeks.filter(x=>x.weight!==null).map(x=>x.weight),lo=weights.length?Math.max(0,Math.floor(Math.min(...weights)/10)*10-10):0,hi=weights.length?Math.ceil(Math.max(...weights)/10)*10+10:100;
  const left=58,right=696,top=30,bottom=244,step=(right-left)/weeks.length;
  add('text',{x:left,y:16,fill:'#5688af','font-size':11},'Pakan kg/minggu');add('text',{x:right,y:16,fill:'#7c3aed','font-size':11,'text-anchor':'end'},'Bobot kg');
  for(let i=0;i<=4;i++){const y=bottom-(bottom-top)*i/4;add('line',{x1:left,x2:right,y1:y,y2:y,stroke:'#e5edf3'});add('text',{x:left-8,y:y+4,'text-anchor':'end','font-size':11,fill:'#8492a6'},format(Math.round(feedMax*i/4)));add('text',{x:right+8,y:y+4,'font-size':11,fill:'#8492a6'},format(Math.round(lo+(hi-lo)*i/4)));}
  let points=[];const flush=()=>{if(points.length>1)add('polyline',{points:points.join(' '),fill:'none',stroke:'#7c3aed','stroke-width':2.5});points=[];};
  weeks.forEach((w,i)=>{const x=left+step*(i+.5);if(w.feed!==null){let stacked=0;const types=[['kering','Kering','#60a5fa'],['combor','Combor','#22c55e'],['basah','Basah','#facc15'],['unknown','Belum dikategorikan','#94a3b8']];
    const label=w.date+' – '+shiftDay(w.date,6)+' · '+types.map(([key,name])=>name+': '+format(w.feedTypes[key])+' kg').join(' · ')+' · Total: '+format(w.feed)+' kg';
    types.forEach(([key,name,color])=>{const amount=w.feedTypes[key];if(amount<=0)return;const h=(bottom-top)*amount/feedMax;stacked+=h;const r=add('rect',{x:x-Math.min(30,step*.25),y:bottom-stacked,width:Math.min(60,step*.5),height:h,fill:color,tabindex:0,role:'img','aria-label':label});const t=document.createElementNS(svg.namespaceURI,'title');t.textContent=label;r.append(t);
     const detail=()=>{$('feedChartDetail').textContent=label+(w.weight!==null?' · Bobot: '+format(w.weight)+' kg':' · Belum ada penimbangan minggu ini.');};r.onmouseenter=detail;r.onfocus=detail;r.onclick=detail;});}
   if(w.weight===null)flush();else points.push(x+','+(bottom-(w.weight-lo)/(hi-lo)*(bottom-top)));
   if(i%Math.max(1,Math.ceil(weeks.length/6))===0||i===weeks.length-1)add('text',{x,y:270,'text-anchor':'middle','font-size':11,fill:'#8492a6'},w.date.slice(5));
  });flush();weeks.forEach((w,i)=>{if(w.weight!==null){const dot=add('circle',{cx:left+step*(i+.5),cy:bottom-(w.weight-lo)/(hi-lo)*(bottom-top),r:4,fill:'#7c3aed'});const t=document.createElementNS(svg.namespaceURI,'title');t.textContent=w.date+' · Bobot '+format(w.weight)+' kg';dot.append(t);}});
 }
 syncSession().catch(e=>message('loginMessage',e.message,true));loadSettings();loadFeed();
 setInterval(()=>loadSettings(false),30000);
 setInterval(()=>{if(document.visibilityState!=='hidden')syncSession().catch(()=>{});},60000);
})();
