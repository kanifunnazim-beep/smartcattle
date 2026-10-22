// Run with NODE_PATH pointing to installed playwright; no live VPS/network used.
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let user=null,records=[],sessions=[],saved=0,lastBody=null;
 const settings={hrMin:48,hrMax:84,hrCriticalLow:40,hrCriticalHigh:110,tempMin:36.7,tempMax:39.1,tempCriticalLow:35,tempCriticalHigh:40,nh3Warning:null};
 const root=path.resolve(__dirname,'..');
 await page.route('https://smartcattle.test/**',async route=>{
  const req=route.request(),u=new URL(req.url()),action=u.searchParams.get('action'),body=req.postDataJSON?.();
  const ok=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',...data})});
  if(u.pathname==='/web-api.php'){
   if(action==='session')return ok({user,csrf:'test-csrf'});
   if(action==='login'){user={id:body.username==='pln'?2:1,username:body.username,role:body.username==='pln'?'pln':'petugas'};return ok({user,csrf:'test-csrf'});}
   if(action==='logout'){user=null;return ok({user,csrf:'test-csrf'});}
   if(action==='settings')return ok({data:settings,revision:1});
   if(action==='records'){
    if(req.method()==='POST'){lastBody=body;saved++;const row={...body,id:body.id||saved,source:'manual',revision:(body.revision||0)+1};records=records.filter(x=>x.id!==row.id);records.push(row);return ok({id:row.id});}
    if(req.method()==='DELETE'){records=records.filter(x=>x.id!==body.id);return ok({});}
    return ok({data:records,latest_weights:[],from:u.searchParams.get('from'),to:u.searchParams.get('to')});
   }
   if(action==='scale_sessions'){
    if(req.method()==='POST'){if(body.operation==='cancel'){sessions[0].effective_state='cancelled';}else sessions=[{...body,id:'a'.repeat(32),effective_state:'waiting',state:'waiting'}];return ok({id:'a'.repeat(32)});}
    return ok({data:sessions});
   }
  }
  if(u.pathname==='/api-test.php')return ok({data:[]});
  if(u.pathname==='/api-environment.php')return route.fulfill({contentType:'application/json',body:JSON.stringify({status:'empty',data:null})});
  if(u.pathname==='/api/fan')return ok({data:{fan_status:null,connection:'unknown'}});
  const file=path.join(root,u.pathname==='/'?'index.html':u.pathname.slice(1));
  if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
  const ext=path.extname(file);return route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[ext]||'text/plain'});
 });
 await page.goto('https://smartcattle.test/');await page.waitForFunction(()=>typeof window.scOpenLogin==='function');
 await page.evaluate(()=>showPage('reports'));await page.waitForSelector('#loginDialog[open]');
 await page.fill('#loginForm [name=username]','pln');await page.fill('#loginForm [name=password]','test-password');await page.click('#loginForm [type=submit]');
 await page.waitForSelector('#page-reports.active');assert.equal(await page.locator('#accountSettings').isHidden(),true);
 await page.evaluate(()=>showPage('settings'));assert.equal(await page.locator('#page-settings').evaluate(e=>e.classList.contains('active')),false);
 await page.evaluate(()=>document.getElementById('accountLogout').click());await page.waitForFunction(()=>window.scUser===null);
 await page.evaluate(()=>showPage('settings'));await page.fill('#loginForm [name=username]','petugas');await page.fill('#loginForm [name=password]','test-password');await page.click('#loginForm [type=submit]');await page.waitForSelector('#page-settings.active');
 await page.fill('#recordForm [name=feed_kg]','10.125');await page.selectOption('#recordForm [name=feed_type]','kering');await page.click('#saveRecord');await page.waitForFunction(()=>document.getElementById('recordMessage').textContent.includes('berhasil'));
 assert.equal(lastBody.feed_type,'kering');assert.equal(lastBody.feed_kg,10.125);assert.equal(lastBody.id,0);
 await page.evaluate(()=>showPage('feed'));await page.getByRole('button',{name:'Ubah',exact:true}).click();await page.fill('#recordForm [name=feed_kg]','11');await page.click('#saveRecord');await page.waitForFunction(()=>document.getElementById('recordMessage').textContent.includes('berhasil'));assert.equal(lastBody.id,1);assert.equal(records.length,1);
 await page.selectOption('#scaleCow','C003');await page.waitForFunction(()=>document.getElementById('weightSessionMessage').textContent.includes('Menunggu'));assert.equal(sessions[0].cow_id,'C003');assert.equal(await page.locator('#scaleCow').isDisabled(),true);
 sessions[0]={...sessions[0],effective_state:'completed',state:'completed',result_kg:'325.50'};await page.waitForFunction(()=>document.getElementById('weightSessionMessage').textContent.includes('Berhasil'));assert.equal(await page.locator('#scaleCow').isDisabled(),false);assert.equal(await page.locator('#scaleCow').inputValue(),'');
 await page.screenshot({path:path.join(root,'tests/settings-preview.png'),fullPage:true});
 await page.selectOption('#scaleFeed','combor');await page.waitForFunction(()=>document.getElementById('feedSessionMessage').textContent.includes('Menunggu'));assert.equal(sessions[0].feed_type,'combor');
 page.on('dialog',d=>d.accept());await page.click('#cancelFeed');await page.waitForFunction(()=>document.getElementById('feedSessionMessage').textContent.includes('dibatalkan'));
 await page.evaluate(()=>showPage('feed'));await page.getByRole('button',{name:'Hapus',exact:true}).click();await page.waitForFunction(()=>document.getElementById('feedRows').textContent.includes('Belum ada catatan'));assert.equal(records.length,0);
 assert.deepEqual(errors,[]);console.log('PASS browser: public report gate, PLN role, staff manual create/edit/delete, weight session, feed session/cancel, no JS exceptions.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
