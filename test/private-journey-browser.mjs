import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const source=resolve('source-packets/antigua-next-step/src'),output=process.env.REVIEW_IMAGE_ROOT;
const original={name:'Fixture Person',email:'fixture@example.test',company:'Example Works',employeeMin:5,employeeMax:9,priority:'sales'};
const base='https://pages.getleadscore.ai/f/SyntheticFixtureFormKey01',session='a'.repeat(64),token='b'.repeat(64);
const browser=await chromium.launch({headless:true});let assertions=0;
try{for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:1000},isMobile:width===390,hasTouch:width===390});
 const page=await context.newPage(),calls=[],errors=[];let profile={...original},mode='matched',handoff='ok',saveFails=false;
 const capture=async name=>{if(output)await page.screenshot({path:resolve(output,`Antigua ${name} ${width}.png`),fullPage:true});};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin==='https://antigua.test'){
   const path=url.pathname==='/'?'index.html':url.pathname.slice(1);
   if(path==='connection.mjs')return route.fulfill({contentType:'application/javascript',body:`export {providerLinks} from './native-offers.mjs';export const identityConfigured=true;export const identityBase='${base}/identity';`});
   const file=resolve(source,path);if(!file.startsWith(source+'/'))return route.abort();
   try{return route.fulfill({body:await readFile(file),contentType:({'.html':'text/html','.mjs':'application/javascript','.css':'text/css','.JPG':'image/jpeg','.svg':'image/svg+xml'})[extname(file)]||'text/plain'});}catch{return route.fulfill({status:404,body:'Not found'});}
  }
  if(url.origin==='https://pages.getleadscore.ai'){
   const action=url.pathname.split('/').at(-1),body=route.request().method()==='POST'?route.request().postDataJSON():{};calls.push({action,body});
   if(action==='turnstile')return route.fulfill({contentType:'text/html',body:`<p>Synthetic security check</p><script>const reply=()=>parent.postMessage({type:'leadscore-turnstile',token:'synthetic-security-token'},'https://antigua.test');addEventListener('message',e=>{if(e.origin==='https://antigua.test'&&e.data?.type==='leadscore-turnstile-reset')reply()});reply()</script>`});
   if(action==='exchange')return route.fulfill(mode==='expired'?{status:403,json:{error:'Expired private link'}}:{json:{status:mode,profile:mode==='ambiguous'?null:profile,session}});
   if(action==='profile')return route.fulfill({json:{status:mode,profile}});
   if(action==='request')return route.fulfill({status:202,json:{status:'request_received'}});
   if(action==='view')return route.fulfill({json:{recorded:true}});
   if(action==='submit'){
    assert.equal(body.submission.turnstileToken,'synthetic-security-token');assert.equal(body.submission.consent.acknowledgement,true);
    if(saveFails){saveFails=false;return route.fulfill({status:503,json:{error:'Synthetic uncertain result'}});}
    profile={...profile,name:body.submission.answers.first_name,company:body.submission.answers.company_name};mode='matched';
    return route.fulfill({status:202,json:{success:true,resources:{id:'synthetic-enquiry',enquiryStatus:'saved'}}});
   }
   if(action==='handoff')return route.fulfill(handoff==='expired'?{status:403,json:{error:'Expired session'}}:handoff==='review'?{status:409,json:{error:'Existing payment requires review'}}:{json:{url:'https://calendly.com/snapsuite/consultation?email=fixture%40example.test&name=Fixture+Person&utm_content=jh_synthetic',payment:'not_confirmed',booking:'not_confirmed'}});
   if(action==='config')return route.fulfill({json:{success:true,resources:{schemaVersion:1,revision:1,submitUrl:base,configUrl:base+'/config',allowedOrigins:['https://antigua.test'],fields:[{id:'first_name',label:'First name',type:'text',required:true},{id:'email',label:'Email',type:'email',required:true},{id:'company_name',label:'Company',type:'text',required:true},{id:'next_step_offer',label:'Choice',type:'text',required:false}],consent:{marketing:{required:false,text:''},acknowledgement:{required:true,version:'antigua-details-v1',text:'Save these details to my LeadScore enquiry. This does not book an appointment or make a payment.'}},spam:{honeypotField:'website',turnstile:{required:true,bridgeUrl:'https://pages.getleadscore.ai/__leadscore/turnstile?formKey=SyntheticFixtureFormKey01'}}}}});
   return route.fulfill({status:400,json:{error:'Unexpected fixture request'}});
  }
  if(url.origin==='https://calendly.com')return route.fulfill({contentType:'text/html',body:'<h1>Synthetic provider boundary: no booking or charge</h1>'});
  throw Error('Unexpected network origin '+url.origin);
 });
 await page.goto('https://antigua.test/#access='+token);await page.getByRole('heading',{name:'What would you like to do?'}).waitFor();
 assert.equal(new URL(page.url()).hash,'');assert.equal(await page.getByRole('button',{name:'Work with Dwain',exact:true}).count(),1);assert.match(await page.locator('#screen').innerText(),/Welcome back, Fixture/);assert.equal(await page.locator('input[type=email]').count(),0);assertions+=4;await capture('saved details entrance');
 await page.getByRole('button',{name:'Work with Dwain',exact:true}).click();await page.getByRole('button',{name:/One-on-one consultation/}).click();await page.locator('.saved-details').waitFor();
 assert.equal(await page.locator('.saved-details').getAttribute('open'),null);assert.equal(await page.locator('[data-handoff]').count(),1);assert.equal(await page.locator('[data-provider]').count(),0);assertions+=3;await capture('saved details collapsed');
 await page.locator('.saved-details summary').click();assert.equal(await page.locator('input[name=first_name]').inputValue(),'Fixture');assert.equal(await page.locator('input[name=company_name]').inputValue(),'Example Works');assert.equal(await page.locator('input[name=email]').count(),0);assertions+=3;
 await page.frameLocator('#save-security-check').getByText('Synthetic security check').waitFor();await capture('saved details review');
 await page.locator('input[name=company_name]').fill('Changed Works');await page.locator('input[name=acknowledgement]').check();saveFails=true;await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Try saving again'}).waitFor();await capture('saved details save pending');
 await page.getByRole('button',{name:'Try saving again'}).click();await page.waitForFunction(()=>document.activeElement?.id==='saved-details-summary');assert.equal(await page.locator('input[name=company_name]').inputValue(),'Changed Works');assert.equal(new Set(calls.filter(c=>c.action==='submit').map(c=>c.body.submission.submissionId)).size,1);assertions+=2;await capture('saved details saved');
 handoff='expired';await page.locator('[data-handoff]').click();await page.getByRole('button',{name:'Send a new link',exact:true}).waitFor();await capture('booking session expired');assertions++;
 handoff='review';await page.locator('[data-handoff]').click();await page.getByText('This choice needs confirmation before you pay.',{exact:false}).waitFor();assert.equal(new URL(page.url()).origin,'https://antigua.test');assertions++;await capture('payment needs review');
 handoff='ok';await page.locator('[data-handoff]').click();await page.waitForURL('https://calendly.com/**');assert.equal(calls.filter(c=>c.action==='handoff').length,3);assert.equal(new Set(calls.filter(c=>c.action==='handoff').map(c=>c.body.requestId)).size,1);assert.equal(calls.filter(c=>c.action==='view').length,3);assertions+=3;
 await page.goto('https://antigua.test/');await page.getByRole('button',{name:'Work with Dwain',exact:true}).click();await capture('work email option');await page.getByRole('button',{name:'Continue with email',exact:true}).click();await capture('email entry');await page.getByRole('textbox',{name:'Your email address'}).fill('fixture@example.test');await page.getByRole('button',{name:/Send my private link/}).click();await page.getByRole('heading',{name:'Check your inbox'}).waitFor();assert.doesNotMatch(await page.locator('#screen').innerText(),/Fixture Person|Example Works/);assertions++;await capture('email verification');
 await page.getByRole('button',{name:'Continue without saved details',exact:true}).click();await page.getByRole('button',{name:/One-on-one consultation/}).click();await page.getByRole('button',{name:'Continue with email',exact:true}).click();await page.getByRole('button',{name:'Continue without saved details',exact:true}).click();assert.equal(await page.locator('a[data-provider=consultation]').count(),1);assertions++;
 mode='ambiguous';await page.goto('https://antigua.test/#access='+token);await page.getByRole('heading',{name:'We need to check one detail'}).waitFor();assert.doesNotMatch(await page.locator('#screen').innerText(),/Fixture Person|Changed Works/);assertions++;await capture('identity review');
 mode='expired';await page.goto('https://antigua.test/#access='+token);await page.getByRole('heading',{name:'This link has expired or was already used'}).waitFor();assert.equal(await page.getByRole('button',{name:'Send a new link',exact:true}).count(),1);assertions++;await capture('private link expired');
 mode='new';profile={email:original.email,name:'',company:'',employeeMin:null,employeeMax:null,priority:null};await page.goto('https://antigua.test/#access='+token);await page.getByRole('heading',{name:'What would you like to do?'}).waitFor();await page.getByRole('button',{name:'Work with Dwain',exact:true}).click();await page.getByRole('button',{name:/One-on-one consultation/}).click();await page.locator('input[name=first_name]').waitFor();assert.equal(await page.locator('input[name=first_name]').inputValue(),'');assert.equal(await page.locator('input[name=email]').count(),0);assertions+=2;await capture('missing details');
 await page.locator('input[name=first_name]').fill('New Person');await page.locator('input[name=company_name]').fill('New Works');await page.locator('input[name=acknowledgement]').check();await page.frameLocator('#save-security-check').getByText('Synthetic security check').waitFor();await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.locator('[data-handoff]').waitFor();assert.equal(await page.locator('input[name=company_name]').inputValue(),'New Works');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage})), '{}');assert.equal(errors.length,0);assertions+=4;
 await context.close();
 }if(output)await writeFile(resolve(output,'Antigua private journey browser checks.json'),JSON.stringify({synthetic:true,assertions,viewports:[390,1440],customerMessages:0,bookings:0,payments:0},null,2)+'\n');console.log(JSON.stringify({pass:true,synthetic:true,assertions,viewports:[390,1440]}));}finally{await browser.close();}
