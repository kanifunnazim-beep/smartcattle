/* Environmental history v8. Public/read-only, no changes to existing app state. */
(() => {
  'use strict';
  const page = document.getElementById('page-environment');
  const form = document.getElementById('ehFilter');
  if (!page || !form) return;
  const from = document.getElementById('ehFrom');
  const to = document.getElementById('ehTo');
  const message = document.getElementById('ehMessage');
  const charts = document.getElementById('ehCharts');
  const latestButton = document.getElementById('ehLatest');
  const dateWib = ms => new Intl.DateTimeFormat('en-CA', {
    timeZone:'Asia/Jakarta', year:'numeric', month:'2-digit', day:'2-digit'
  }).format(ms);
  const stamp = seconds => new Intl.DateTimeFormat('id-ID', {
    timeZone:'Asia/Jakarta', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).format(seconds * 1000) + ' WIB';
  const number = (v, digits=2) => Number.isFinite(v) ? v.toLocaleString('id-ID', {maximumFractionDigits:digits}) : '—';
  const fields = [
    {key:'temperature', name:'Suhu kandang', unit:'°C', color:'#ea580c'},
    {key:'humidity', name:'Kelembapan', unit:'%RH', color:'#2563eb'},
    {key:'ammonia_ppm', name:'Amonia (NH₃)', unit:'ppm', color:'#7c3aed'}
  ];
  let selected = {mode:'24h'}, payload = null, latestDate = null;
  let request = null, sequence = 0, lastLoaded = 0;
  const visible = () => page.classList.contains('active') && !document.hidden;
  const today = () => dateWib(Date.now());
  from.value = to.value = from.max = to.max = today();
  function text(tag, value, className) {
    const el = document.createElement(tag); el.textContent = value;
    if (className) el.className = className;
    return el;
  }
  function svgNode(tag, attrs, value) {
    const el = document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attrs || {}).forEach(([key,val]) => el.setAttribute(key,String(val)));
    if (value !== undefined) el.textContent = value;
    return el;
  }
  function render() {
    charts.replaceChildren();
    if (!payload) return;
    const {start,end,bucket_seconds:step,rows} = payload;
    const map = new Map(rows.map(row => [row.bucket_start,row]));
    const slots = [];
    for (let t=Math.floor(start/step)*step;t<end;t+=step) {
      slots.push({start:Math.max(t,start), end:Math.min(t+step,end), row:map.get(t) || null});
    }
    fields.forEach(field => {
      const card = text('section','', 'eh-card');
      const heading = text('h3',field.name + ' (' + field.unit + ')');
      const swatch = text('span','', 'eh-swatch'); swatch.style.background = field.color;
      swatch.setAttribute('aria-hidden','true'); heading.prepend(swatch); card.append(heading);
      const valid = rows.filter(row => Number.isFinite(row[field.key]) && row[field.key+'_count'] > 0);
      if (!valid.length) {
        card.append(text('p','Tidak ada pembacaan '+field.name.toLowerCase()+' pada periode ini.','eh-note'));
        charts.append(card); return;
      }
      const count = valid.reduce((sum,row)=>sum+row[field.key+'_count'],0);
      const average = valid.reduce((sum,row)=>sum+row[field.key]*row[field.key+'_count'],0)/count;
      const actualMin = Math.min(...valid.map(row=>row[field.key+'_min']));
      const actualMax = Math.max(...valid.map(row=>row[field.key+'_max']));
      card.append(text('p',`Rata-rata ${number(average)} ${field.unit} · Minimum ${number(actualMin)} · Maksimum ${number(actualMax)} ${field.unit} · ${number(count,0)} pembacaan`, 'eh-summary'));
      charts.append(card);
      const width = Math.max(260,card.clientWidth-32), height = 220;
      const left=54, right=16, top=16, bottom=42, plotW=width-left-right, plotH=height-top-bottom;
      const values = valid.map(row=>row[field.key]);
      const low = Math.min(...values), high = Math.max(...values);
      const pad = Math.max((high-low)*0.15,field.key==='ammonia_ppm' ? 0.02 : 0.5);
      let min=low-pad, max=high+pad;
      if (field.key !== 'temperature') min=Math.max(0,min);
      if (field.key === 'humidity') max=Math.min(100,max);
      const x = slot => left + (((slot.start+slot.end)/2-start)/(end-start))*plotW;
      const y = value => top+(max-value)/(max-min)*plotH;
      const svg = svgNode('svg',{viewBox:`0 0 ${width} ${height}`,class:'eh-chart',tabindex:'0',role:'img',
        'aria-label':`Grafik ${field.name}, ${field.unit}. Garis menunjukkan rata-rata per ${step/60} menit. Gunakan tombol panah kiri dan kanan untuk membaca interval.`});
      card.append(svg);
      for (let i=0;i<5;i++) {
        const yy=top+plotH*i/4;
        svg.append(svgNode('line',{x1:left,y1:yy,x2:width-right,y2:yy,stroke:'#e2e8f0'}));
        svg.append(svgNode('text',{x:left-8,y:yy+4,'text-anchor':'end'},number(max-(max-min)*i/4)));
      }
      const ticks=width<450 ? 3 : 5;
      for (let i=0;i<ticks;i++) {
        const timestamp=start+(end-start)*i/(ticks-1);
        const label = new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',hourCycle:'h23',
          ...(end-start>86400 ? {day:'2-digit',month:'2-digit'} : {})}).format(timestamp*1000);
        svg.append(svgNode('text',{x:left+plotW*i/(ticks-1),y:height-13,'text-anchor':i===0?'start':i===ticks-1?'end':'middle'},label));
      }
      let segment=[];
      function flush() {
        if(segment.length>1) svg.append(svgNode('polyline',{points:segment.join(' '),fill:'none',stroke:field.color,'stroke-width':2,'stroke-linejoin':'round'}));
        segment=[];
      }
      slots.forEach(slot=>{
        const value=slot.row?.[field.key];
        if (!Number.isFinite(value)) {flush();return;}
        segment.push(`${x(slot)},${y(value)}`);
        svg.append(svgNode('circle',{cx:x(slot),cy:y(value),r:2,fill:field.color,'data-value':value}));
      }); flush();
      const guide=svgNode('line',{y1:top,y2:top+plotH,stroke:'#64748b','stroke-dasharray':'3 3',visibility:'hidden'}); svg.append(guide);
      const detail=text('p','Arahkan kursor atau sentuh grafik untuk melihat interval. Keyboard: fokus ke grafik, lalu gunakan ← / →.','eh-detail');
      detail.id='ehDetail-'+field.key; detail.setAttribute('aria-live','polite');
      svg.setAttribute('aria-describedby',detail.id); card.append(detail);
      let current=slots.length-1;
      function show(index) {
        current=Math.max(0,Math.min(slots.length-1,index));
        const slot=slots[current], row=slot.row;
        guide.setAttribute('x1',x(slot)); guide.setAttribute('x2',x(slot)); guide.setAttribute('visibility','visible');
        const range=stamp(slot.start)+' – '+stamp(slot.end);
        detail.textContent=Number.isFinite(row?.[field.key])
          ? `${range} · Rata-rata ${number(row[field.key])} ${field.unit} · Min ${number(row[field.key+'_min'])} · Maks ${number(row[field.key+'_max'])} ${field.unit} · ${number(row[field.key+'_count'],0)} pembacaan`
          : range+' · Tidak ada pembacaan; bukan nilai nol.';
      }
      function point(event) {
        const box=svg.getBoundingClientRect();
        const xx=(event.clientX-box.left)/box.width*width;
        const timestamp=start+Math.max(0,Math.min(1,(xx-left)/plotW))*(end-start);
        show(Math.floor(timestamp/step)-Math.floor(start/step));
      }
      svg.addEventListener('pointermove',point); svg.addEventListener('pointerdown',point);
      svg.addEventListener('focus',()=>show(current));
      svg.addEventListener('keydown',event=>{
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault(); show(event.key==='Home'?0:event.key==='End'?slots.length-1:current+(event.key==='ArrowRight'?1:-1));
      });
    });
  }
  async function load(force=false) {
    if (!visible() || (!force && (request || Date.now()-lastLoaded<55000))) return;
    request?.abort(); const controller=new AbortController(); request=controller;
    const id=++sequence;
    message.dataset.error='false'; message.textContent='Memuat riwayat lingkungan…';
    charts.hidden=true; payload=null; lastLoaded=0;
    const timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch('api-environment-history.php?'+new URLSearchParams(selected),{signal:controller.signal});
      const result=await response.json();
      if (!response.ok || result.status!=='success') throw new Error(result.message || 'Riwayat belum dapat dimuat.');
      if (!Array.isArray(result.rows) || result.rows.length>1000 || !Number.isFinite(result.start) ||
          !Number.isFinite(result.end) || result.end<=result.start || result.end-result.start>31*86400 ||
          ![300,900,3600].includes(result.bucket_seconds)) throw new Error('Format riwayat tidak sesuai.');
      if (id!==sequence) return;
      payload=result; lastLoaded=Date.now();
      latestDate=typeof result.latest_at==='string' && /^\d{4}-\d{2}-\d{2}T/.test(result.latest_at) ? result.latest_at.slice(0,10):null;
      latestButton.disabled=!latestDate || latestDate>today();
      const count=result.rows.reduce((sum,row)=>sum+row.samples,0);
      const period=stamp(result.start)+' – '+stamp(result.end);
      const last=result.latest_at ? ' Data terakhir tersimpan: '+stamp(Date.parse(result.latest_at)/1000)+'.' : '';
      message.textContent=count>0
        ? `${period}. ${number(count,0)} catatan, rata-rata per ${result.bucket_seconds/60} menit.${last}`
        : `Tidak ada data pada periode ${period}.${last} Gunakan pilihan tanggal atau tombol “Tanggal data terakhir”.`;
      charts.hidden=count===0;
      if(count>0) render();
    } catch(error) {
      if(id!==sequence) return;
      payload=null; charts.hidden=true; message.dataset.error='true';
      message.textContent=error.name==='AbortError' ? 'Permintaan terlalu lama. Tekan kembali pilihan periode untuk mencoba lagi.' : error.message;
    } finally {
      clearTimeout(timeout); if(id===sequence)request=null;
    }
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const a=Date.parse(from.value+'T00:00:00+07:00'), b=Date.parse(to.value+'T00:00:00+07:00');
    if (!Number.isFinite(a) || !Number.isFinite(b) || a>b || b-a>30*86400000 || from.value<'2020-01-01' || to.value>today()) {
      message.dataset.error='true'; message.textContent='Pilih rentang 1–31 hari yang valid dan tidak di masa depan.';return;
    }
    selected={mode:'dates',from:from.value,to:to.value};load(true);
  });
  document.getElementById('eh24h').addEventListener('click',()=>{selected={mode:'24h'};load(true);});
  latestButton.addEventListener('click',()=>{
    if(!latestDate)return;
    from.value=to.value=latestDate;selected={mode:'dates',from:latestDate,to:latestDate};load(true);
  });
  function visibilityChanged() {
    if (visible()) {from.max=to.max=today();load();}
    else if(request) {++sequence;request.abort();request=null;}
  }
  new MutationObserver(visibilityChanged).observe(page,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',visibilityChanged);
  setInterval(()=>{if(selected.mode==='24h')load();},60000);
  let resizeTimer;
  new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(visible()&&payload&&!charts.hidden)render();},150);}).observe(charts);
  visibilityChanged();
})();
