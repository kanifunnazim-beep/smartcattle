(() => {
  const node=id=>document.getElementById(id);
  const rows=new Map();
  const labels={Critical:['urgent','Segera periksa'],Warning:['warn','Perlu perhatian'],'Periksa sensor':['warn','Periksa sensor'],Normal:['ok','Normal']};
  function write(el,text){if(el.textContent!==text)el.textContent=text}
  function draw(){
    if(document.hidden || !node('page-overview').classList.contains('active'))return;
    for(const cow of cattle){
      let badge=rows.get(cow.id);
      if(!badge){
        const btn=document.createElement('button'), tag=document.createElement('strong');
        badge=document.createElement('span'); tag.textContent=window.scCowLabel(cow.id);
        btn.type='button'; btn.append(tag,badge);
        btn.onclick=()=>{showPage('cattle'); selectCow(cow.id)};
        node('hbRows').append(btn); rows.set(cow.id,badge);
      }
      const current=cow.hasSensorData && connectionState(cow.recordedAt,'health')==='Online';
      const [tone,label]=current && labels[cow.measurementStatus] || ['muted',cow.hasSensorData?'Data tidak terkini':'Belum ada data'];
      badge.className=tone; write(badge,label);
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
