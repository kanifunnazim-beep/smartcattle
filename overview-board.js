(() => {
  const node=id=>document.getElementById(id);
  const rows=new Map();
  const labels={Critical:['urgent','Perlu tindakan'],Warning:['urgent','Perlu tindakan'],'Periksa sensor':['warn','Periksa sensor'],Normal:['ok','Normal']};
  function write(el,text){if(el.textContent!==text)el.textContent=text}
  const clock=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const dateFmt=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',year:'numeric'});
  function draw(){
    if(document.hidden || !node('page-overview').classList.contains('active'))return;
    const now=Date.now(), day=t=>Math.floor((t+7*3600000)/86400000);
    for(const cow of cattle){
      let row=rows.get(cow.id);
      if(!row){
        const btn=document.createElement('button'), tag=document.createElement('strong');
        row={time:document.createElement('small'),badge:document.createElement('span')};
        tag.textContent=window.scCowLabel(cow.id);
        btn.type='button'; btn.append(tag,row.time,row.badge);
        btn.onclick=()=>{showPage('cattle'); selectCow(cow.id)};
        node('hbRows').append(btn); rows.set(cow.id,row);
      }
      const t=dataTime(cow.recordedAt), valid=cow.hasSensorData && Number.isFinite(t) && t<=now+60000;
      const age=day(now)-day(t);
      const key=[valid,t,age,cow.hasSensorData,cow.measurementStatus].join('|');
      if(row.key===key)continue;
      row.key=key;
      const when=valid?(age===0?'Hari ini':age===1?'Kemarin':dateFmt.format(t))+', '+clock.format(t):'—';
      write(row.time,when);
      row.time.title=valid?'Waktu pembacaan (WIB)':'';
      const [tone,label]=valid?(labels[cow.measurementStatus]||['warn','Periksa sensor']):['muted',cow.hasSensorData?'Periksa waktu':'Belum ada data'];
      row.badge.className=tone; write(row.badge,label);
    }
    const sample=environmentSample;
    const live=connectionState(sample?.recorded_at,'environment')==='Online';
    const t=dataTime(sample?.recorded_at);
    write(node('hbTime'),Number.isFinite(t)?(live?'Terkini':'Data terakhir · tidak terkini')+' · '+new Date(t).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})+' WIB':'Belum ada data lingkungan');
    for(const [id,key,unit,digits] of [['hbTemp','temperature','°C',1],['hbHumidity','humidity','% RH',1],['hbGas','ammonia_ppm','ppm',2]]){
      const v=sample?.[key];write(node(id),Number.isFinite(v)?v.toLocaleString('id-ID',{maximumFractionDigits:digits})+' '+unit:'—');
    }
  }
  draw(); setInterval(draw,1000);
})();
