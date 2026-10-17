const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req,res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end(); return;}
  try {res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}
  catch {res.writeHead(404).end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser=await chromium.launch({headless:true, channel:"chrome"});
    const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/New_York'});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    let rows=[{id:'11111111-1111-4111-8111-111111111111',title:'Current saved plan',starts_at:'2027-11-06T23:00:00Z',ends_at:'2027-11-07T01:00:00Z',mode:'in-person',location:'Cafe',note:'Dinner',proposer:'nick',recipient:'kalilu',status:'proposed',response_message:'',alternative_date:null,photo_url:null,updated_at:'2026-10-17T00:00:00Z'}];
    for(let i=0;i<14;i++) rows.push({...rows[0],id:`history-${i}`,starts_at:`2025-01-${String(28-i).padStart(2,'0')}T19:00:00Z`,ends_at:`2025-01-${String(28-i).padStart(2,'0')}T21:00:00Z`,status:'accepted'});
    let failRead=false, stale=false, dropCreate=false, requests=[];
    await context.route(`${base}/**`,route=>{
      const file=path.join(root,new URL(route.request().url()).pathname);
      route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file)});
    });
    await context.route('**/supabase-config.js',route=>route.fulfill({contentType:'text/javascript',body:'window.DateAppConfig={supabaseUrl:"https://data.test",supabaseAnonKey:"test",coupleKey:"test"};'}));
    await context.route('https://fonts.googleapis.com/**',route=>route.abort());
    await context.route('https://data.test/**',async route=>{
      const req=route.request(),url=new URL(req.url()),q=url.searchParams;
      requests.push({method:req.method(),url});
      if(failRead && req.method()==='GET') return route.fulfill({status:503,body:'unavailable'});
      if(req.method()==='PATCH'){
        if(stale) return route.fulfill({json:[]});
        const row=rows.find(r=>`eq.${r.id}`===q.get('id'));
        if(q.has('updated_at')&&q.get('updated_at')!==`eq.${row.updated_at}`) return route.fulfill({json:[]});
        Object.assign(row,req.postDataJSON(),{updated_at:new Date().toISOString()});
        return route.fulfill({json:[row]});
      }
      if(req.method()==='POST'){const row={...req.postDataJSON(),updated_at:new Date().toISOString()};rows.unshift(row);if(dropCreate){dropCreate=false;return route.abort('failed');}return route.fulfill({json:[row]});}
      let found=rows.slice();
      if(q.has('id')) found=found.filter(r=>q.get('id').startsWith('neq.')?`neq.${r.id}`!==q.get('id'):`eq.${r.id}`===q.get('id'));
      if(q.get('status')==='eq.accepted') found=found.filter(r=>r.status==='accepted');
      if(q.get('status')==='eq.declined') found=found.filter(r=>r.status==='declined');
      if(q.get('status')==='in.(proposed,accepted)') found=found.filter(r=>['proposed','accepted'].includes(r.status));
      for(const key of ['starts_at','ends_at']) if(q.has(key)){
        const [op,...rest]=q.get(key).split('.');const v=rest.join('.');
        found=found.filter(r=>op==='gt'?r[key]>v:op==='lt'?r[key]<v:op==='lte'?r[key]<=v:true);
      }
      const off=Number(q.get('offset')||0);found=found.slice(off,off+Number(q.get('limit')||1000));
      return route.fulfill({json:found});
    });
    const id=rows[0].id;
    await page.goto(`${base}/index.html?event=${id}&title=Stale`);
    await page.locator('[data-plan-title]').filter({hasText:'Current saved plan'}).waitFor();
    await page.locator('.history-card').nth(11).waitFor();
    assert.equal(await page.locator('.history-card').count(),12);
    await page.click('#more-history');await page.locator('.history-card').nth(13).waitFor();
    assert.equal(await page.locator('.history-card').count(),14);
    const ics=decodeURIComponent((await page.locator('[data-calendar]').getAttribute('href')).split(',')[1]);
    assert.match(ics,/DTSTART:20271106T230000Z/);assert.match(ics,new RegExp(`UID:${id}@our-date`));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.click('#edit-plan');await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
    assert.equal(await page.inputValue('#title'),'Current saved plan');
    await page.fill('#title','Draft dinner');await page.reload();
    await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
    assert.equal(await page.inputValue('#title'),'Draft dinner');
    await page.click('[type=submit]');await page.locator('#link-result').waitFor();
    assert.match(await page.inputValue('#share-link'),new RegExp(`event=${id}$`));
    assert.equal(rows.find(r=>r.id===id).title,'Draft dinner');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.goto(`${base}/response.html?event=${id}&answer=no`);
    await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
    await page.fill('#free-date','2027-11-08');await page.fill('#message','Monday works');
    await page.click('[type=submit]');await page.locator('#reply-result').waitFor();
    assert.equal(rows.find(r=>r.id===id).alternative_date,'2027-11-08');
    await page.goto(`${base}/response.html?event=${id}&view=1&answer=yes&message=old`);
    await page.locator('[data-response-message]').filter({hasText:'Monday works'}).waitFor();
    assert.equal(await page.textContent('[data-response-heading]'),'Maybe another time');
    await page.goto(`${base}/setup.html?event=${id}`);await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
    await page.fill('#title','Changed again');stale=true;await page.click('[type=submit]');
    await page.waitForFunction(()=>document.querySelector('#form-status').textContent.includes('Nothing was saved'));
    assert.equal(await page.locator('#link-result').isVisible(),false);stale=false;
    failRead=true;await page.goto(`${base}/index.html`);await page.locator('#retry-plan').waitFor();
    assert.equal(await page.locator('[data-empty-plan]').isVisible(),false);
    failRead=false;await page.click('#retry-plan');await page.locator('[data-empty-plan]').waitFor();
    await page.goto(`${base}/setup.html`);await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
    await page.fill('#title','New plan');await page.fill('#date','2027-12-01');await page.fill('#time','19:00');await page.fill('#location','Home');
    await page.click('[type=submit]');await page.locator('#link-result').waitFor();
    const count=rows.length;
    await page.click('[type=submit]');await page.locator('#link-result').waitFor();assert.equal(rows.length,count);
    const createdId=rows[0].id;
    await page.goto(`${base}/response.html?event=${createdId}&answer=yes`);
    await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
    await page.click('[type=submit]');await page.locator('#reply-result').waitFor();
    assert.equal(rows[0].status,'accepted');
    await page.goto(`${base}/setup.html?event=${createdId}`);
    await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
    // Postgres normally returns offset timestamps, not the JS Z spelling.
    rows[0].starts_at=rows[0].starts_at.replace('Z','+00:00');
    rows[0].ends_at=rows[0].ends_at.replace('Z','+00:00');
    await page.reload();await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
    await page.click('[type=submit]');await page.locator('#link-result').waitFor();
    assert.equal(rows[0].status,'accepted');
    await page.goto(`${base}/setup.html`);await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
    await page.fill('#title','Overlapping');await page.fill('#date','2027-12-01');await page.fill('#time','19:30');await page.fill('#location','Home');
    await page.click('[type=submit]');await page.waitForFunction(()=>document.querySelector('#form-status').textContent.includes('Choose another time'));
    assert.equal(await page.locator('#link-result').isVisible(),false);
    await page.fill('#date','2027-12-03');dropCreate=true;
    await page.click('[type=submit]');await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
    assert.equal(await page.locator('#link-result').isVisible(),false);
    const afterLost=rows.length;
    await page.reload();await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
    await page.click('[type=submit]');await page.locator('#link-result').waitFor();
    assert.equal(rows.length,afterLost);
    assert.match(await page.textContent('#form-status'),/Recovered/);
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(`${base}/index.html`);await page.locator('[data-plan-card]').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    if (process.env.SCREENSHOT_PATH) await page.screenshot({path:process.env.SCREENSHOT_PATH,fullPage:true});
    const validation=await page.evaluate(()=>({bad:DateApp.dateOnly('2027-02-30'),good:DateApp.dateOnly('2028-02-29'),folded:DateApp.calendar({dateTime:'2027-12-01T23:00:00Z',duration:2,title:'é'.repeat(100),note:'one\ntwo',location:'A,B'})}));
    assert.equal(validation.bad,false);assert.equal(validation.good,true);
    for(const line of validation.folded.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
    assert.equal(errors.length,0,errors.join('\n'));
    assert.ok(requests.filter(r=>r.method==='GET'&&r.url.pathname.endsWith('/dates')).every(r=>r.url.searchParams.has('limit')||r.url.searchParams.has('starts_at')));
    console.log('PASS: acceptance; unchanged save preserves reply; overlap rejection; lost-response recovery; desktop layout;  saved invite freshness; paginated history; UTC calendar; mobile overflow; draft restore; edit; decline and alternative date; current reply view; stale-write rejection; load retry; create and repeat-save without duplicates; date validation and UTF-8 calendar folding.');
  } finally {if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
