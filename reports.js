/* Public report summaries; PDFs are generated locally in the browser. */
(() => {
 'use strict';
 const titles={health:'Laporan Harian Ternak',environment:'Laporan Lingkungan',feed:'Laporan Pakan & Bobot',devices:'Laporan Perangkat'};
 const clean=v=>window.scCowDisplayText(v).replace(/[\u2010-\u2015]/g,'-').replace(/\u2083/g,'3').replace(/\u2084/g,'4');
 const num=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
 const fmt=(v,d=1)=>num(v)===null?'-':Number(v).toLocaleString('id-ID',{minimumFractionDigits:0,maximumFractionDigits:d});
 const count=v=>fmt(v,0);
 const range=(lo,hi,d=1)=>num(lo)===null||num(hi)===null?'-':fmt(lo,d)+' - '+fmt(hi,d);
 const when=v=>new Date(v).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})+' WIB';
 const day=v=>String(v).split('-').reverse().join('/');
 const sum=(rows,k)=>rows.reduce((n,r)=>n+(num(r[k])??0),0);
 function buildReportPdf(report,logoData){
  if(report.status!=='success'||!titles[report.type]||!Array.isArray(report.data)||report.data.length>20000)throw new Error('Format ringkasan tidak valid.');
  const doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
  doc.setProperties({title:titles[report.type]+' - SmartCattle',subject:'Ringkasan monitoring',author:'SmartCattle',creator:'SmartCattle'});
  const rows=report.data,blue=[25,53,91],muted=[101,118,139],width=269;let cursor=56;
  function newPage(){doc.addPage();cursor=56;}
  function ensure(h){if(cursor+h>190)newPage();}
  function textBlock(text){const lines=doc.splitTextToSize(clean(text),width);const h=lines.length*4+3;ensure(h);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...muted);doc.text(lines,14,cursor);cursor+=h;}
  function heading(text){ensure(32);doc.setTextColor(...blue);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(text,14,cursor);cursor+=5;}
  function table(head,body,columnStyles={}){
   ensure(22);
   doc.autoTable({startY:cursor,head:[head],body:body.map(row=>row.map(value=>typeof value==='string'?window.scCowDisplayText(value):value)),margin:{top:56,bottom:20,left:14,right:14},tableWidth:width,theme:'striped',
    styles:{font:'helvetica',fontSize:8.5,cellPadding:1.2,textColor:[34,49,69],overflow:'linebreak',lineWidth:0},
    headStyles:{fillColor:blue,textColor:255,fontStyle:'bold',fontSize:8.5},alternateRowStyles:{fillColor:[244,248,252]},
    columnStyles,showHead:'everyPage',rowPageBreak:'avoid'});
   cursor=doc.lastAutoTable.finalY+10;
  }
  function cards(items){items.forEach(([label,value],i)=>{const x=14+i*91;doc.setFillColor(241,246,251);doc.roundedRect(x,cursor,87,22,2,2,'F');doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...muted);doc.text(label,x+5,cursor+7);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(...blue);doc.text(clean(value),x+5,cursor+16);});cursor+=33;}
  if(report.type==='health'){
   cards([['Sapi dengan data',String(new Set(rows.map(r=>r.device_id)).size)],['Pembacaan tersimpan',count(sum(rows,'samples'))],['Hari dengan pembacaan',String(new Set(rows.map(r=>r.day)).size)]]);
   if(rows.length){
    heading('Ringkasan harian kesehatan');
    table(['Tanggal','Sapi','N HR','HR rata-rata\n(bpm)','HR min - maks\n(bpm)','N suhu','Suhu rata-rata\n(°C)','Suhu min - maks\n(°C)','Ruminasi terakhir\n(menit/hari)'],rows.map(r=>[day(r.day),r.device_id,count(r.hr_count),fmt(r.hr_avg),range(r.hr_min,r.hr_max,0),count(r.temp_count),fmt(r.temp_avg),range(r.temp_min,r.temp_max),fmt(r.rumination_minutes,2)]));
    heading('Rekap indikator pembacaan per sapi');
    const totals=new Map();rows.forEach(r=>{if(!totals.has(r.device_id))totals.set(r.device_id,{samples:0,warning_samples:0,critical_samples:0,sensor_check_samples:0});const t=totals.get(r.device_id);Object.keys(t).forEach(k=>t[k]+=Number(r[k]||0));});
    table(['Sapi','Jumlah pembacaan','Warning','Critical','Periksa sensor'],[...totals].map(([id,t])=>[id,...Object.values(t).map(count)]));
    textBlock('N HR / N suhu = jumlah pembacaan yang masuk perhitungan masing-masing parameter. Rekap menghitung pembacaan, bukan jumlah sapi sakit atau jumlah kejadian terpisah.');
   }
   if(report.thresholds){const t=report.thresholds;textBlock('Ambang saat ringkasan disiapkan: HR normal '+range(t.hrMin,t.hrMax,0)+' bpm; Critical < '+fmt(t.hrCriticalLow,0)+' atau >= '+fmt(t.hrCriticalHigh,0)+' bpm. Suhu sensor normal '+range(t.tempMin,t.tempMax)+' °C; Critical < '+fmt(t.tempCriticalLow)+' atau >= '+fmt(t.tempCriticalHigh)+' °C.');}
  }else if(report.type==='environment'){
   cards([['Hari dengan data',String(rows.length)],['Pembacaan tersimpan',count(sum(rows,'samples'))],['Parameter gas','Amonia (NH3)']]);
   if(rows.length){heading('Ringkasan harian lingkungan');table(['Tanggal','Pembacaan','N suhu / RH / NH3','Suhu rata-rata\n(°C)','Suhu min - maks\n(°C)','RH rata-rata\n(%)','RH min - maks\n(%)','NH3 rata-rata\n(ppm)','NH3 min - maks\n(ppm)'],rows.map(r=>[day(r.day),count(r.samples),[r.temp_count,r.humidity_count,r.nh3_count].map(count).join(' / '),fmt(r.temp_avg),range(r.temp_min,r.temp_max),fmt(r.humidity_avg),range(r.humidity_min,r.humidity_max),fmt(r.nh3_avg,2),range(r.nh3_min,r.nh3_max,2)]));textBlock('N suhu / RH / NH3 = jumlah pembacaan yang masuk perhitungan masing-masing parameter.');}
  }else if(report.type==='feed'){
   const fed=rows.filter(r=>num(r.feed_kg)!==null);cards([['Sapi dengan catatan',String(new Set(rows.map(r=>r.cow_id)).size)],['Total pakan tercatat',fed.length?fmt(sum(fed,'feed_kg'),2)+' kg':'-'],['Catatan penimbangan',String(rows.filter(r=>num(r.weight_kg)!==null).length)]]);
   if(rows.length){
    const ids=[...new Set(rows.map(r=>r.cow_id))].sort();heading('Ringkasan per sapi dalam periode');
    table(['Sapi','Hari pakan\ntercatat','Total pakan\n(kg)','Bobot awal\n(kg / tanggal)','Bobot akhir\n(kg / tanggal)','Perubahan\n(kg)'],ids.map(id=>{const r=rows.filter(x=>x.cow_id===id),f=r.filter(x=>num(x.feed_kg)!==null),w=r.filter(x=>num(x.weight_kg)!==null).sort((a,b)=>a.day.localeCompare(b.day)),first=w[0],last=w.at(-1);return [id,String(new Set(f.map(x=>x.day)).size),f.length?fmt(sum(f,'feed_kg'),2):'-',first?fmt(first.weight_kg,2)+' / '+day(first.day):'-',last?fmt(last.weight_kg,2)+' / '+day(last.day):'-',w.length>=2?fmt(Number(last.weight_kg)-Number(first.weight_kg),2):'-'];}));
    heading('Catatan pakan dan penimbangan');table(['Tanggal','Sapi','Jenis pakan','Sumber','Pakan (kg)','Bobot (kg)'],rows.map(r=>[day(r.day),r.cow_id,({kering:'Pakan Kering',combor:'Combor',basah:'Pakan Basah'})[r.feed_type]||'-',({manual:'Manual',automatic:'Otomatis',legacy:'Data lama'})[r.source]||'-',fmt(r.feed_kg,3),fmt(r.weight_kg,2)]));
   }
  }else{
   cards([['Jumlah sensor',String(rows.length)],['Online saat ringkasan disiapkan',String(rows.filter(r=>r.state==='Online').length)],['Offline saat ringkasan disiapkan',String(rows.filter(r=>r.state==='Offline').length)]]);
   heading('Status berdasarkan pembacaan terakhir');table(['Sensor','Waktu pembacaan terakhir (WIB)','Status saat ringkasan disiapkan'],rows.map(r=>[r.name,r.last_seen||'Belum ada data',r.state]));
  }
  if(!rows.length)textBlock('Tidak ada data tersimpan untuk pilihan laporan ini. Nilai kosong tidak diganti dengan angka nol.');
  heading('Keterangan');(report.notes||[]).forEach(note=>textBlock(note));
  const total=doc.getNumberOfPages();
  for(let p=1;p<=total;p++){
   doc.setPage(p);doc.setTextColor(...blue);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('SMARTCATTLE  /  MONITORING KANDANG',14,12);doc.setFontSize(19);doc.text(titles[report.type],14,23);
   if(logoData){
    // Place the existing transparent logo using its visible bounds; original bytes stay unchanged.
    const prop=doc.getImageProperties(logoData);
    if(prop.width===447&&prop.height===447){const scale=52/356;doc.addImage(logoData,'PNG',283-401*scale,9-185*scale,447*scale,447*scale,'pln-logo','FAST');}
    else {const h=Math.min(20,52*prop.height/prop.width),w=h*prop.width/prop.height;doc.addImage(logoData,'PNG',283-w,7,w,h,'pln-logo','FAST');}
   }
   doc.setDrawColor(220,229,238);doc.line(14,32,283,32);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...muted);
   const scope=report.type==='devices'?'Snapshot status perangkat':day(report.from)+' - '+day(report.to)+(report.type==='health'||report.type==='feed'?'  |  '+(report.cow==='all'?'Semua sapi':window.scCowLabel(report.cow)):'');
   doc.text('Cakupan: '+scope,14,39);doc.text('Data disiapkan: '+when(report.generated_at)+'  |  Cache maksimum '+report.cache_seconds+' detik',14,45);
   doc.line(14,195,283,195);doc.setFontSize(8);doc.text('SmartCattle | Waktu laporan: '+when(new Date().toISOString()),14,201);doc.text('Halaman '+p+' / '+total,283,201,{align:'right'});
  }
  return doc;
 }
 window.scBuildReportPdf=buildReportPdf;
 const form=document.getElementById('reportForm');if(!form)return;
 const type=document.getElementById('reportType'),cow=document.getElementById('reportCow'),from=document.getElementById('reportFrom'),to=document.getElementById('reportTo'),status=document.getElementById('reportMessage'),button=document.getElementById('downloadReport');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const first=new Date(today+'T12:00:00Z');first.setUTCDate(first.getUTCDate()-6);from.value=first.toISOString().slice(0,10);to.value=today;from.max=to.max=today;from.min=to.min='2020-01-01';
 function syncFields(){const device=type.value==='devices';from.disabled=to.disabled=device;cow.disabled=device||type.value==='environment';document.getElementById('reportScopeNote').textContent=device?'Laporan perangkat berisi status berdasarkan pembacaan terakhir saat ringkasan disiapkan.':'Pilih periode 1–31 hari. Laporan berisi ringkasan harian dalam waktu WIB.';}
 type.onchange=syncFields;syncFields();
 document.querySelectorAll('[data-report-type]').forEach(b=>b.onclick=()=>{type.value=b.dataset.reportType;syncFields();form.scrollIntoView({behavior:'smooth',block:'center'});button.focus();});
 let pdfLibraries=null,logoPromise=null,busy=false;
 function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error('Komponen PDF gagal dimuat. Muat ulang halaman lalu coba lagi.'));};document.head.append(s);});}
 function libraries(){if(!pdfLibraries)pdfLibraries=(async()=>{await script('vendor/jspdf.umd.min.js?v=4.2.1');await script('vendor/jspdf.plugin.autotable.min.js?v=5.0.9');if(!window.jspdf?.jsPDF||typeof window.jspdf.jsPDF.API.autoTable!=='function')throw new Error('Komponen PDF tidak lengkap.');})().catch(e=>{pdfLibraries=null;throw e;});return pdfLibraries;}
 async function logo(){if(!logoPromise)logoPromise=(async()=>{const r=await fetch('Logo_PLN_ES.png',{cache:'force-cache'});if(!r.ok)throw new Error('Logo laporan gagal dimuat.');const blob=await r.blob();return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Logo tidak dapat dibaca.'));reader.readAsDataURL(blob);});})().catch(e=>{logoPromise=null;throw e;});return logoPromise;}
 form.onsubmit=async e=>{
  e.preventDefault();if(busy)return;if(!window.scUser){window.scLoginTarget='reports';window.scOpenLogin();return;}
  const isDevice=type.value==='devices',days=(Date.parse(to.value+'T00:00:00Z')-Date.parse(from.value+'T00:00:00Z'))/86400000+1;
  if(!isDevice&&(!Number.isFinite(days)||days<1||days>31||to.value>today)){status.textContent='Pilih rentang 1–31 hari, tidak di masa depan.';status.className='sc-message error';return;}
  busy=true;button.disabled=true;status.className='sc-message';status.textContent='Menyiapkan ringkasan dan PDF…';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
  const selection={type:type.value,cow:cow.disabled?'all':cow.value,from:isDevice?today:from.value,to:isDevice?today:to.value};
  try{
   const [response,,logoData]=await Promise.all([fetch('report-api.php?'+new URLSearchParams(selection),{cache:'no-store',credentials:'same-origin',signal:controller.signal}),libraries(),logo()]);
   let report;try{report=await response.json();}catch(err){throw new Error('Respons laporan tidak valid. Periksa pemasangan API laporan.');}
   if(!response.ok||report.status!=='success')throw new Error(report.message||'Laporan gagal disiapkan.');
   const pdf=buildReportPdf(report,logoData),filename='SmartCattle-'+report.type+'-'+(report.type==='devices'?today:report.from+'_'+report.to)+'-'+window.scCowLabel(report.cow)+'.pdf';
   pdf.save(filename);status.className='sc-message success';status.textContent='PDF siap diunduh. '+report.data.length+' baris ringkasan; data disiapkan '+when(report.generated_at)+'.';
  }catch(err){status.className='sc-message error';status.textContent=err.name==='AbortError'?'Waktu tunggu habis. Coba lagi atau pilih periode lebih pendek.':err.message;}
  finally{clearTimeout(timer);busy=false;button.disabled=false;}
 };
})();
