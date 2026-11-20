(() => {
  const node=id=>document.getElementById(id);
  const rows=new Map();
  const labels={Critical:['urgent','Perlu tindakan'],Warning:['urgent','Perlu tindakan'],'Periksa sensor':['warn','Periksa sensor'],Normal:['ok','Normal']};
  function write(el,text){if(el.textContent!==text)el.textContent=text}
  const clock=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const dateFmt=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',year:'numeric'});
  const gasValue=document.createElement('span');
  const gasBadge=document.createElement('span');
  gasBadge.className='hb-nh3-badge';
  gasBadge.hidden=true;
  node('hbGas').replaceChildren(gasValue,gasBadge);
  function drawGas(value){
    const valid=Number.isFinite(value) && value>=0;
    write(gasValue,valid?value.toLocaleString('id-ID',{maximumFractionDigits:2})+' ppm':'—');
    gasBadge.hidden=!valid;
    if(!valid)return;
    const limit=window.scNh3Warning;
    const known=Number.isFinite(limit) && limit>0;
    const state=!known?'unset':value>=limit?'high':'normal';
    if(gasBadge.dataset.state!==state)gasBadge.dataset.state=state;
    write(gasBadge,state==='high'?'Tinggi':state==='normal'?'Normal':'Ambang belum tersedia');
    const tip=known?'Berdasarkan pembacaan terakhir. Ambang tinggi: '+limit.toLocaleString('id-ID')+' ppm.':'Ambang amonia belum diatur atau belum dimuat.';
    if(gasBadge.title!==tip)gasBadge.title=tip;
  }
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
    drawGas(sample?.ammonia_ppm);
    const live=connectionState(sample?.recorded_at,'environment')==='Online';
    const t=dataTime(sample?.recorded_at);
    write(node('hbTime'),Number.isFinite(t)?(live?'Terkini':'Data terakhir · tidak terkini')+' · '+new Date(t).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})+' WIB':'Belum ada data lingkungan');
    for(const [id,key,unit,digits] of [['hbTemp','temperature','°C',1],['hbHumidity','humidity','% RH',1]]){
      const v=sample?.[key];write(node(id),Number.isFinite(v)?v.toLocaleString('id-ID',{maximumFractionDigits:digits})+' '+unit:'—');
    }
  }
  draw(); setInterval(draw,1000);
})();
