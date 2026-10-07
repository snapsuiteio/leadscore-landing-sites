import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {validateCampaignConfiguration} from '../source-packets/antigua/src/capture.mjs';
import {validateIntegration} from '../source-packets/antigua/src/headless-form-adapter.mjs';

export async function preflight({root=new URL('../',import.meta.url),origin=process.env.PUBLIC_SITE_ORIGIN,fetcher=fetch}={}) {
  assert.equal(origin,'https://leadscore-landing-sites.snapsuite-f2f.workers.dev','Use the existing approved public origin');
  const manifest=JSON.parse(await readFile(new URL('sites/manifest.json',root),'utf8'));
  const receipts=[];
  for(const page of manifest.pages.filter(p=>p.integration?.tracking==='consent-required')) {
    assert.equal(page.tenantSlug,'snapsuite-antigua'); assert.equal(page.pageSlug,'antigua');
    const response=await fetcher(page.integration.configUrl,{headers:{origin},redirect:'error',signal:AbortSignal.timeout(15000)});
    assert.equal(response.status,200); assert.equal(response.headers.get('access-control-allow-origin'),origin);
    const body=await response.json();assert.equal(body.success,true);const config=body.resources;
    validateIntegration(config); validateCampaignConfiguration(config,page.integration.configUrl,origin);
    assert.equal(config.revision,page.integration.revision,'Intake revision changed; prepare a compatible candidate before deployment');
    assert.equal(config.method,'POST');assert.equal(config.contentType,'application/json');
    assert.deepEqual(config.allowedOrigins,[origin]);assert.equal(config.spam.turnstile.required,true);
    const types={full_name:'text',work_email:'email',company_name:'text',phone:'phone',intent:'select',source_angle:'select'};
    for(const field of config.fields){assert.equal(field.type,types[field.id]);assert.equal(field.required,true);}
    assert.deepEqual(config.fields.find(f=>f.id==='source_angle').options,['seminar','snapsuite','ai']);
    const providers=config.tracking.providers;
    assert.equal(providers.clarityProjectId,page.integration.clarityProjectId);
    assert.ok(!providers.googleTagId&&!providers.googleTagManagerId&&!providers.facebookPixelId,'A competing provider requires a reviewed integration update');
    assert.equal(providers.consentMode,'required'); assert.equal(config.tracking.consentRequired,true);
    assert.equal(config.tracking.scriptUrl,config.submitUrl+'/tracker.js');
    const tracker=await fetcher(config.tracking.scriptUrl,{headers:{origin},redirect:'error',signal:AbortSignal.timeout(15000)});
    assert.equal(tracker.status,200);assert.equal(tracker.headers.get('access-control-allow-origin'),origin);
    assert.equal(createHash('sha256').update(Buffer.from(await tracker.arrayBuffer())).digest('hex'),page.integration.trackerSha256,'Tracker changed; review and repin before deployment');
    receipts.push({page:page.pageSlug,revision:config.revision,trackerSha256:page.integration.trackerSha256,compatible:true});
  }
  return receipts;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await preflight(),null,2));
