/* Manual running hours. No timer, MQTT or sensor integration. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),staff=()=>window.scUser?.role==='petugas';
 const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const duration=n=>Math.floor(n/60).toLocaleString('id-ID')+' jam '+(n%60)+' menit';
 let page=1,count=0,editing=null,key=token(),busy=false,sequence=0;
 const message=(id,text)=>{$(id).textContent=text;};
 function reset(){editing=null;key=token();$('rhDate').value=today();$('rhDate').max=today();$('rhHours').value=0;$('rhMinutes').value=0;$('rhSave').textContent='Tambah durasi';}
 function access(){ $('rhFields').disabled=!staff()||busy; }
 function render(rows){
  for(const prefix of ['rh','rhe']){
   const body=$(prefix+'Rows');body.replaceChildren();
   for(const row of rows){
    const tr=document.createElement('tr');
    for(const value of [row.recorded_date.split('-').reverse().join('/'),duration(Number(row.duration_minutes))]){const td=document.createElement('td');td.textContent=value;tr.append(td);}
    if(prefix==='rhe'){
     const td=document.createElement('td');
     if(staff())for(const label of ['Ubah','Hapus']){
      const b=document.createElement('button');b.type='button';b.className='secondary-btn';b.textContent=label;b.disabled=busy;
      b.onclick=()=>{
       if(!staff()||busy)return;
       if(label==='Ubah'){editing=row;$('rhDate').value=row.recorded_date;$('rhHours').value=Math.floor(Number(row.duration_minutes)/60);$('rhMinutes').value=Number(row.duration_minutes)%60;$('rhSave').textContent='Simpan koreksi';message('rhEditMessage','Mengoreksi catatan #'+row.id+'.');$('rhForm').scrollIntoView({block:'center',behavior:'smooth'});}
       else if(confirm('Hapus durasi '+duration(Number(row.duration_minutes))+' pada '+row.recorded_date+'? Total akan berkurang.')) mutate('DELETE',{id:Number(row.id),revision:Number(row.revision)});
      };td.append(b);
     }
     tr.append(td);
    }body.append(tr);
   }
   if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=prefix==='rh'?2:3;td.textContent='Belum ada catatan penggunaan.';tr.append(td);body.append(tr);}
   $(prefix+'Page').textContent='Halaman '+page+' / '+Math.max(1,Math.ceil(count/25));
   $(prefix+'Prev').disabled=page<=1||busy;$(prefix+'Next').disabled=page*25>=count||busy;
  }
 }
 async function load(){
  const seq=++sequence;message('rhMessage','Memuat riwayat…');
  try{
   const r=await window.scApi('running_hours',{params:{page:String(page)}});if(seq!==sequence)return;
   count=r.count;if(page>Math.max(1,Math.ceil(count/25))){page=Math.max(1,Math.ceil(count/25));return load();}
   $('rhTotal').textContent=duration(r.total_minutes);render(r.rows);message('rhMessage',count+' catatan penggunaan.');
  }catch(e){if(seq!==sequence)return;$('rhTotal').textContent='—';message('rhMessage',e.message);message('rhEditMessage',e.message);}
 }
 async function mutate(method,data){
  if(busy||!staff())return;busy=true;access();
  try{await window.scApi('running_hours',{method,body:data});reset();message('rhEditMessage',method==='DELETE'?'Catatan dihapus.':'Durasi tersimpan.');}
  catch(e){message('rhEditMessage',e.message);}
  finally{busy=false;access();await load();}
 }
 $('rhForm').addEventListener('submit',e=>{
  e.preventDefault();if(!staff()||busy)return;
  const hours=Number($('rhHours').value),minutes=Number($('rhMinutes').value),total=hours*60+minutes;
  if(!Number.isInteger(hours)||!Number.isInteger(minutes)||hours<0||minutes<0||minutes>59||total<1||total>1440){message('rhEditMessage','Isi durasi 1 menit sampai 24 jam.');return;}
  const data={recorded_date:$('rhDate').value,duration_minutes:total};
  if(editing){data.id=Number(editing.id);data.revision=Number(editing.revision);}else data.request_id=key;
  mutate('POST',data);
 });
 $('rhNew').onclick=()=>{if(busy)return;reset();message('rhEditMessage','Catatan baru. Pastikan input sebelumnya sudah tersimpan sebelum menambah lagi.');};
 $('rhRefresh').onclick=()=>load();
 for(const prefix of ['rh','rhe']){
  $(prefix+'Prev').onclick=()=>{if(page>1&&!busy){page--;load();}};
  $(prefix+'Next').onclick=()=>{if(page*25<count&&!busy){page++;load();}};
 }
 const visible=()=>$('page-running-hour').classList.contains('active')||$('page-settings').classList.contains('active');
 const observer=new MutationObserver(()=>{if(visible())load();});
 for(const id of ['page-running-hour','page-settings'])observer.observe($(id),{attributes:true,attributeFilter:['class']});
 window.addEventListener('sc-session',()=>{reset();access();if(visible())load();});
 reset();access();if(visible())load();
})();
