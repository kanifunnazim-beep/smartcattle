/* Sessions are authoritative on the server; selection opens exactly one session. */
(() => {
 const $=id=>document.getElementById(id);
 const devices=[{id:'scale-weight-01',select:'scaleCow',cancel:'cancelWeight',message:'weightSessionMessage',field:'cow_id'},
 {id:'scale-feed-01',select:'scaleFeed',cancel:'cancelFeed',message:'feedSessionMessage',field:'feed_type'}];
 let busy=false,known=new Set(),generation=0;
 const staff=()=>window.scUser?.role==='petugas';
 function controls(d,locked){$(d.select).disabled=locked||!staff();$(d.cancel).disabled=!d.active||!staff();}
 async function refresh(){
  if(busy||!staff())return;busy=true;const gen=generation;
  try{
   const r=await window.scApi('scale_sessions');if(gen!==generation)return;
   for(const d of devices){
    const active=r.data.find(s=>s.device_id===d.id&&s.effective_state==='waiting');
    const latest=r.data.find(s=>s.device_id===d.id);
    d.active=active?.id||null;controls(d,!!active||d.starting);
    if(active){$(d.message).textContent='Menunggu hasil stabil · '+(active.cow_id||({kering:'Pakan Kering',combor:'Combor',basah:'Pakan Basah'})[active.feed_type]);}
    else if(latest){
     if(latest.effective_state==='completed'){
      $(d.message).textContent='Berhasil disimpan: '+Number(latest.result_kg).toLocaleString('id-ID')+' kg'+(d.field==='feed_type'?' · '+(Number(latest.result_kg)/10).toLocaleString('id-ID',{maximumFractionDigits:3})+' kg per sapi.': ' · '+latest.cow_id+'.');
      if(!known.has(latest.id)){known.add(latest.id);window.dispatchEvent(new Event('sc-records-updated'));}
     }else $(d.message).textContent=latest.effective_state==='expired'?'Sesi kedaluwarsa. Pilih kembali untuk menimbang.':'Sesi dibatalkan. Silakan pilih kembali.';
    }else $(d.message).textContent='Belum ada sesi penimbangan.';
    if(!active&&!d.starting)$(d.select).value='';
   }
  }catch(e){if(gen===generation)devices.forEach(d=>$(d.message).textContent='Status sesi belum dapat dimuat: '+e.message);}
  finally{busy=false;}
 }
 for(const d of devices){
  controls(d,false);
  $(d.select).onchange=async()=>{
   const value=$(d.select).value;if(!value||d.starting)return;d.starting=true;controls(d,true);
   try{await window.scApi('scale_sessions',{method:'POST',body:{device_id:d.id,[d.field]:value}});}
   catch(e){$(d.message).textContent=e.message;}
   finally{d.starting=false;await refresh();}
  };
  $(d.cancel).onclick=async()=>{
   if(!d.active||!confirm('Batalkan sesi penimbangan ini?'))return;$(d.cancel).disabled=true;
   try{await window.scApi('scale_sessions',{method:'POST',body:{operation:'cancel',device_id:d.id,id:d.active}});await refresh();}
   catch(e){$(d.message).textContent=e.message;controls(d,true);}
  };
 }
 window.addEventListener('sc-session',()=>{generation++;if(!staff()){devices.forEach(d=>{d.active=null;controls(d,true);$(d.message).textContent='Login petugas diperlukan.';});}else refresh();});
 setInterval(()=>{if(document.visibilityState!=='hidden')refresh();},3000);refresh();
})();
