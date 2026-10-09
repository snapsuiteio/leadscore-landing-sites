import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../scripts/build.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=new URL('../',import.meta.url);
const exportRoot=new URL('sites/exports/snapsuite-antigua/antigua/',root);
const fixture=JSON.parse(await readFile(new URL('fixtures/tracking-config.json',import.meta.url),'utf8'));
const trackerScript=await readFile(new URL('fixtures/published-tracker.js',import.meta.url),'utf8');
const origin='https://leadscore-landing-sites.snapsuite-f2f.workers.dev';
const route='/p/snapsuite-antigua/antigua/';
const configUrl=fixture.resources.configUrl;
await build(root.pathname,{publicCommit:'a'.repeat(40)});
const csp=(await readFile(new URL('dist/_headers',root),'utf8')).match(/Content-Security-Policy: ([^\n]+)/)[1];
const browser=await chromium.launch({headless:true});
const results=[];
async function run(name,fn,options={}){
  const context=await browser.newContext({viewport:{width:options.width||1440,height:844}});
  const page=await context.newPage();
  const events=[],submissions=[],providers=[],errors=[],allRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(({stored,gpc})=>{
    if(stored!==undefined&&!sessionStorage.getItem('fixture-seeded')){localStorage.setItem('antigua-cookie-choices-v1',JSON.stringify(stored));sessionStorage.setItem('fixture-seeded','1');}
    if(gpc)Object.defineProperty(navigator,'globalPrivacyControl',{value:true});
  },{stored:options.stored,gpc:options.gpc});
  await context.route('**/*',async r=>{
    const req=r.request(),u=new URL(req.url());allRequests.push({url:req.url(),method:req.method()});
    if(req.url()===configUrl){const data=structuredClone(fixture);options.mutate?.(data.resources);return r.fulfill({json:data,headers:{'access-control-allow-origin':origin}});}
    if(req.url()===fixture.resources.tracking.scriptUrl){
      if(options.blockTracker)return r.abort();
      return r.fulfill({contentType:'text/javascript',body:options.corruptTracker?trackerScript+'\n// unexpected change':trackerScript,headers:{'access-control-allow-origin':origin}});
    }
    if(req.url()===fixture.resources.tracking.eventsUrl){events.push(req.postDataJSON());return r.fulfill({json:{success:true}});}
    if(req.url()===fixture.resources.submitUrl&&req.method()==='POST'){
      submissions.push(req.postDataJSON());
      assert.equal(options.allowFixtureSubmit,true,'No unexpected submission, even in fixture');
      return options.rejectSubmit ? r.fulfill({status:503,json:{success:false,message:'Synthetic temporary intake failure'}}) : r.fulfill({json:{success:true,resources:{id:'synthetic-accepted-enquiry-001'}}});
    }
    if(u.pathname==='/__leadscore/turnstile')return r.fulfill({contentType:'text/html',body:`<!doctype html><script>parent.postMessage({type:'leadscore-turnstile',token:'synthetic-security-fixture'},'${origin}')</script>`});
    if(/(^|\.)(googletagmanager\.com|clarity\.ms|google-analytics\.com|google\.com|bing\.com)$/.test(u.hostname)){
      providers.push(req.url());if(options.blockProviders)return r.abort();
      return r.fulfill({contentType:'text/javascript',body:'// Isolated provider fixture: no external collection.'});
    }
    if(u.origin===origin&&u.pathname.startsWith(route)){
      const name=u.pathname.slice(route.length)||'index.html';
      const types={html:'text/html',mjs:'text/javascript',css:'text/css',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',JPG:'image/jpeg',mp4:'video/mp4',txt:'text/plain'};
      return r.fulfill({path:new URL(name,exportRoot).pathname,contentType:types[name.split('.').pop()],headers:{'content-security-policy':csp}});
    }
    throw new Error('Unexpected external request: '+req.url());
  });
  try{
    await page.goto(origin+route+'?angle='+ (options.angle||'ai')+(options.query||''));
    if(options.expectDisabled)await page.waitForFunction(()=>!document.querySelector('#form-status').hidden);
    else await page.waitForFunction(()=>!document.querySelector('#preview-submit').disabled);
    if(!options.blockTracker&&!options.corruptTracker)await page.waitForFunction(()=>window.LeadScoreTracker?.ready);
    if(!options.blockTracker&&!options.corruptTracker)await page.evaluate(()=>window.LeadScoreTracker.ready);
    await fn({page,context,events,submissions,providers,errors,allRequests});
    assert.deepEqual(errors,[],name);
    results.push({name,passed:true,fixtureEvents:events.length,fixtureSubmissions:submissions.length,providerScripts:providers.length});
  }finally{await context.close();}
}
const queue=page=>page.evaluate(()=>Array.from(window.dataLayer||[],entry=>Array.from(entry)));
const chooseAnalytics=async page=>{await page.locator('#cookie-title').click();await page.locator('#cookie-accept-analytics').click();};
const accepts=async page=>{await chooseAnalytics(page);await page.waitForFunction(()=>window.dataLayer?.some(x=>x[0]==='event'&&x[1]==='page_view'));};
const formReady=async page=>{assert.equal(await page.locator('#preview-submit').isEnabled(),true);assert.equal(await page.locator('#interest-form').getAttribute('data-config-revision'),'6');assert.equal(await page.locator('#requestConsent').isChecked(),false);assert.equal(await page.locator('#marketingConsent').count(),0);};
try{
  for(const width of [1440,390])for(const angle of ['seminar','ai','snapsuite'])await run(`${angle} ${width}: no consent, opt-in, screened application, separate cookie choices`,async({page,events,providers,submissions})=>{
    await formReady(page);assert.equal(await page.locator('#cookie-choices').getAttribute('open'),null);assert.equal(await page.locator('#interest-form input:not([type=checkbox]):not([name=website])').count(),7);assert.equal(await page.locator('#interest-form select,#interest-form textarea').count(),4);assert.equal(providers.length,0);assert.equal(events.length,0);assert.equal((await queue(page)).length,0);
    if(process.env.TRACKING_SCREENSHOT_DIR&&angle==='ai')await page.screenshot({path:process.env.TRACKING_SCREENSHOT_DIR+`/consent-${width}.png`});
    await accepts(page);await formReady(page);
    if(process.env.TRACKING_SCREENSHOT_DIR&&angle==='ai')await page.locator('#interest-form').screenshot({path:process.env.TRACKING_SCREENSHOT_DIR+`/form-${width}.png`});
    await page.waitForFunction(()=>typeof window.clarity==='function');
    assert.equal(providers.filter(u=>u.includes('gtag/js')).length,1);assert.equal(providers.filter(u=>u.includes('/tag/yu2abnu53o')).length,1);
    assert.equal((await queue(page)).filter(x=>x[0]==='event'&&x[1]==='page_view').length,1);
    assert.equal(events.filter(e=>e.type==='page_viewed').length,1);
    assert.equal(events[0].attribution.latest.source_angle,angle);
    assert.equal(await page.locator('#interest-form').getAttribute('data-clarity-mask'),'true');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
    await page.locator('#cookie-title').click();await page.locator('#cookie-save').click();
    assert.equal((await queue(page)).filter(x=>x[0]==='event'&&x[1]==='page_view').length,1);
    assert.equal(submissions.length,0);
  },{angle,width});
  await run('Reject persists across reload; enquiry remains available',async({page,providers,events})=>{
    await page.locator('#cookie-title').click();await page.locator('#cookie-reject').click();await page.reload();await page.evaluate(()=>window.LeadScoreTracker.ready);await formReady(page);
    assert.equal(await page.locator('#cookie-choices').getAttribute('open'),null);assert.equal(providers.length,0);assert.equal(events.length,0);
  });
  await run('Marketing choice alone cannot load analytics or advertising',async({page,providers,events})=>{
    await page.locator('#cookie-title').click();await page.locator('#cookie-marketing').check();await page.locator('#cookie-save').click();await formReady(page);assert.equal(providers.length,0);assert.equal(events.length,0);
  });
  await run('GPC denies marketing while explicit analytics opt-in works',async({page})=>{
    assert.equal(await page.locator('#cookie-marketing').isDisabled(),true);await accepts(page);
    const q=await queue(page);assert.ok(q.filter(x=>x[0]==='consent').every(x=>x[2].ad_storage==='denied'&&x[2].ad_user_data==='denied'));
  },{gpc:true});
  await run('Withdrawal persists before reload and removes analytics cookies',async({page,context,providers,events})=>{
    await accepts(page);await context.addCookies([{name:'_ga',value:'synthetic',url:origin},{name:'_clck',value:'synthetic',url:origin}]);
    await page.locator('#cookie-title').click();const reload=page.waitForEvent('load');await page.locator('#cookie-reject').click();await reload;
    await page.evaluate(()=>window.LeadScoreTracker.ready);await formReady(page);
    const count=providers.length,eventCount=events.length;await page.locator('#name').fill('Synthetic withheld');await page.locator('#cookie-title').click();
    assert.equal(await page.locator('#cookie-analytics').isChecked(),false);assert.equal(providers.length,count);assert.equal(events.length,eventCount);
    assert.ok(!(await context.cookies()).some(c=>/^(_ga|_clck|_clsk)/.test(c.name)));
  });
  await run('Provider failures do not disable the form',async({page})=>{await accepts(page);await formReady(page);},{blockProviders:true});
  for(const failure of ['blockTracker','corruptTracker'])await run(`${failure}: optional tracker fails closed, form remains usable`,async({page,providers,events})=>{
    await chooseAnalytics(page);await formReady(page);assert.equal(providers.length,0);assert.equal(events.length,0);assert.equal((await queue(page)).length,0);
  },{[failure]:true});
  await run('Expired saved permission does not silently grant consent',async({page,providers,events})=>{
    await formReady(page);assert.equal(await page.locator('#cookie-choices').isVisible(),true);assert.equal(await page.locator('#cookie-analytics').isChecked(),false);assert.equal(providers.length,0);assert.equal(events.length,0);
  },{stored:{version:1,analytics:true,marketing:true,savedAt:Date.now()-181*24*60*60*1000}});
  await run('Previously accepted consent loads providers once on return',async({page,providers,events})=>{
    await page.waitForFunction(()=>window.dataLayer?.some(x=>x[1]==='page_view'));await formReady(page);assert.equal(await page.locator('#cookie-choices').getAttribute('open'),null);assert.equal(providers.length,2);assert.equal(events.filter(e=>e.type==='page_viewed').length,1);
  },{stored:{version:1,analytics:true,marketing:false,savedAt:Date.now()}});
  await run('Unsafe query prevents provider loading and PII in first-party events',async({page,providers,events})=>{
    await chooseAnalytics(page);await formReady(page);assert.equal(providers.length,0);assert.ok(!JSON.stringify(events).includes('private@example.test'));
  },{query:'&email=private%40example.test'});
  await run('Variant navigation produces one manual pageview per change with attribution',async({page,events})=>{
    await accepts(page);await page.locator('[data-angle="seminar"]').click();await page.waitForFunction(()=>window.dataLayer.filter(x=>x[0]==='event'&&x[1]==='page_view').length===2);
    const views=(await queue(page)).filter(x=>x[0]==='event'&&x[1]==='page_view');assert.deepEqual(views.map(x=>x[2].source_angle),['ai','seminar']);
    assert.equal(views[0][2].traffic_type,'internal');assert.equal(views[0][2].debug_mode,true);assert.equal(views[0][2].campaign_source,'setup_verification');
    assert.equal(views[0][2].page_location,origin+route+'?angle=ai');assert.ok(events.every(e=>e.attribution.latest.ad_id==='ad-fixture-01'));
  },{query:'&utm_source=setup_verification&utm_medium=internal&utm_campaign=analytics_setup_20261007&ad_id=ad-fixture-01'});
  for(const angle of ['seminar','ai','snapsuite'])await run(angle+': enquiry values never enter analytics; conversion only follows accepted fixture response',async({page,events,submissions})=>{
    await accepts(page);await page.locator('#preview-submit').click();assert.equal((await queue(page)).filter(x=>x[1]==='generate_lead').length,0);
    await page.locator('#name').fill('Synthetic Private Name');await page.locator('#company').fill('Synthetic Private Company');await page.locator('#email').fill('synthetic-private@example.test');await page.locator('#phone').fill('+12685550123');await page.locator('#business_type').fill('Construction');await page.locator('#operating_status').selectOption('Operating');await page.locator('#attendee_role').selectOption('Owner or founder');await page.locator('#registration_status').selectOption('Not registered');await page.locator('#years_operating').fill('0');await page.locator('#team_size').fill('1');await page.locator('#main_challenge').fill('Private sample workflow challenge');await page.locator('#requestConsent').check();
    assert.equal((await queue(page)).filter(x=>x[1]==='generate_lead').length,0);
    await page.locator('#preview-submit').click();await page.waitForFunction(()=>document.querySelector('#form-status').dataset.submissionId);
    assert.equal(submissions.length,1);assert.equal(submissions[0].answers.intent,'event');assert.equal(Object.hasOwn(submissions[0].answers,'message'),false);assert.equal(submissions[0].consent.marketing,false);assert.equal(submissions[0].answers.source_angle,angle);assert.equal(submissions[0].attribution.latest.ad_id,'fixture-ad');assert.equal(submissions[0].revision,5);const q=await queue(page);assert.equal(q.filter(x=>x[1]==='generate_lead').length,1);
    const analytics=JSON.stringify({q,events});for(const value of ['Synthetic Private','synthetic-private@example.test','+12685550123','Synthetic private task'])assert.ok(!analytics.includes(value),value);
    await page.evaluate(()=>document.querySelector('#form-status').setAttribute('data-submission-id','synthetic-accepted-enquiry-001'));
    assert.equal((await queue(page)).filter(x=>x[1]==='generate_lead').length,1);
  },{allowFixtureSubmit:true,angle,query:'&utm_source=setup_verification&utm_medium=internal&ad_id=fixture-ad'});
  await run('Rejected intake response never shows success or emits conversion',async({page,submissions})=>{
    await accepts(page);await page.locator('#name').fill('Synthetic failure');await page.locator('#company').fill('Synthetic company');await page.locator('#email').fill('synthetic@example.test');await page.locator('#phone').fill('+12685550123');await page.locator('#business_type').fill('Construction');await page.locator('#operating_status').selectOption('Operating');await page.locator('#attendee_role').selectOption('Owner or founder');await page.locator('#registration_status').selectOption('Not registered');await page.locator('#years_operating').fill('0');await page.locator('#team_size').fill('1');await page.locator('#main_challenge').fill('Private sample workflow challenge');await page.locator('#requestConsent').check();
    await page.locator('#preview-submit').click();await page.waitForFunction(()=>!document.querySelector('#preview-submit').disabled);
    assert.equal(submissions.length,1);assert.equal(await page.locator('#form-status').getAttribute('data-submission-id'),null);assert.equal((await queue(page)).filter(x=>x[1]==='generate_lead').length,0);
  },{allowFixtureSubmit:true,rejectSubmit:true});
  for(const [reason,mutate] of [
    ['old revision',c=>{c.revision=3;}],
    ['future revision',c=>{c.revision=7;}],
    ['acknowledgement wording',c=>{c.consent.acknowledgement.text='Different request';}],
    ['additional required question',c=>{c.fields.push({id:'message',type:'textarea',required:true,label:'Unexpected question'});}],
    ['non-seminar intent',c=>{c.fields.find(f=>f.id==='intent').options.push('onsite');}],
  ])await run('Incompatible '+reason+' keeps Send disabled without submissions',async({page,submissions})=>{
    assert.equal(await page.locator('#preview-submit').isDisabled(),true);assert.equal(await page.locator('#form-status').isVisible(),true);assert.equal(submissions.length,0);
  },{expectDisabled:true,mutate});
  await run('Competing configured Google ID fails tracking closed without altering capture',async({page,providers,events})=>{
    await chooseAnalytics(page);await formReady(page);assert.equal(providers.length,0);assert.equal(events.length,0);assert.equal((await queue(page)).length,0);
  },{mutate:c=>{c.tracking.providers.googleTagId='G-OTHER12345';}});
}finally{await browser.close();}
const evidence={checkedAt:new Date().toISOString(),trackerSha256:createHash('sha256').update(trackerScript).digest('hex'),results,scope:'All network intercepted. Real compiled form and published tracker fixture; provider SDKs and intake are local fixtures. No production writes or provider events.'};
await writeFile(process.env.TRACKING_EVIDENCE||new URL('../tracking-browser-evidence.json',root),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
