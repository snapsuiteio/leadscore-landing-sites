import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ANGLES,QUALIFICATION_QUESTIONS} from '../src/contract.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const artifacts=resolve(process.env.DP_SELLER_QA_OUTPUT||'dp-seller-qa');mkdirSync(artifacts,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain','.json':'application/json'};
const server=createServer((request,response)=>{
  if(request.method!=='GET'){response.writeHead(405).end();return;}
  const pathname=new URL(request.url,'http://localhost').pathname;
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+sep)||!existsSync(file)||!statSync(file).isFile()){response.writeHead(404).end();return;}
  response.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream',
    'content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'none'; frame-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'"});
  response.end(readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium'}),results=[];
try {
  for(const width of [1440,390])for(const angle of Object.keys(ANGLES)){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[],external=[],mutations=[];
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('**/*',route=>{
      const req=route.request(),url=new URL(req.url());
      if(url.origin!==origin){external.push(req.url());return route.abort();}
      if(req.method()!=='GET'){mutations.push(req.method());return route.abort();}
      return route.continue();
    });
    await page.goto(origin+'/?angle='+angle);
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('#hero-title').textContent(),ANGLES[angle].headline);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Horizontal overflow');
    assert.equal(await page.locator('select').count(),5);
    assert.equal(await page.locator('#property-form').getAttribute('data-config-url'),null);
    assert.equal(await page.locator('#requestConsent').isChecked(),false);
    assert.equal(await page.locator('#hero-image').evaluate(image=>image.complete&&image.naturalWidth===1080),true);
    for(const question of QUALIFICATION_QUESTIONS){
      assert.deepEqual(await page.locator('#'+question.id+' option').allTextContents(),['Choose one',...question.options]);
    }
    if(angle==='A01')await page.screenshot({path:artifacts+`/seller-${width}-full.png`,fullPage:true});
    else await page.screenshot({path:artifacts+`/${angle}-${width}-opening.png`,fullPage:false});
    await page.getByRole('link',{name:'Get a no-obligation offer',exact:false}).click();
    await page.waitForFunction(()=>location.hash==='#property');
    await page.locator('#request-submit').click();
    assert.equal(await page.locator('#error-summary').isVisible(),true);
    assert.equal(await page.locator('[aria-invalid=true]').count(),10);
    await page.locator('#full_name').fill('QA Example');await page.locator('#email').fill('qa@example.invalid');
    await page.locator('#phone').fill('+12025550100');await page.locator('#property_address').fill('QA fixture address');
    for(const question of QUALIFICATION_QUESTIONS)await page.locator('#'+question.id).selectOption(question.options[0]);
    await page.locator('#requestConsent').check();await page.locator('#request-submit').click();
    assert.match(await page.locator('#form-status').textContent(),/nothing submitted/);
    assert.equal(await page.locator('#form-status').getAttribute('data-submission-id'),null);
    assert.equal(await page.locator('#property-form').evaluate(form=>form.dataset.configUrl||null),null);
    const privacy=page.locator('.privacy-copy a');await privacy.click();
    assert.equal(await page.evaluate(()=>location.hash),'#privacy');
    await page.locator('.faq-list summary').first().click();
    assert.equal(await page.locator('.faq-list details').first().getAttribute('open'),'');
    const next=angle==='A01'?'A02':'A01';await page.locator(`[data-angle="${next}"]`).click();
    assert.equal(await page.locator('#hero-title').textContent(),ANGLES[next].headline);
    await page.goBack();assert.equal(await page.locator('#hero-title').textContent(),ANGLES[angle].headline);
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(mutations,[]);
    results.push({width,angle,rendered:true,exactQuestions:true,navigation:true,validation:true,
      noOverflow:true,externalRequests:external.length,submissionRequests:mutations.length,actualLeadCreated:false});
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:900}}),page=await context.newPage();
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin&&route.request().method()==='GET'?route.continue():route.abort());
  await page.goto(origin+'/preview.html');await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('#hero-title').textContent(),ANGLES.A01.headline);
  assert.equal(await page.locator('#property-form').getAttribute('data-config-url'),null);
  await context.close();
  writeFileSync(artifacts+'/receipt.json',JSON.stringify({checkedAt:new Date().toISOString(),
    runner:process.env.RUNNER_NAME||null,source:process.env.DP_SELLER_PUBLIC_COMMIT||null,results,
    previewMode:'No capture endpoint, no POST, no external provider requests, no test lead or synthetic provider receipt.',
    offlinePreviewVerified:true},null,2)+'\n');
  console.log(JSON.stringify({checks:results.length,passed:true,actualSubmission:false,artifacts}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
