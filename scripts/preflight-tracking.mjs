import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {validateIntegration} from '../source-packets/dp-seller/src/headless-form-adapter.mjs';
export const configurationHash=config=>createHash('sha256').update(JSON.stringify(config)).digest('hex');
/** Every reviewed page has its own exact contract and optional tracker; no tenant/provider IDs are baked in. */
export async function preflight({root=new URL('../',import.meta.url),origin=process.env.PUBLIC_SITE_ORIGIN,fetcher=fetch,manifestFile=process.env.RELEASE_MANIFEST || 'sites/release-manifest.json'}={}) {
  const url=new URL(origin);assert.equal(url.protocol,'https:');assert.equal(url.origin,origin);
  const manifest=JSON.parse(await readFile(new URL(manifestFile,root),'utf8'));
  const receipts=[];
  for(const page of manifest.pages.filter(p=>p.capture==='enabled')) {
    const expected=page.integration;
    assert.match(expected.configurationSha256 || '',/^[a-f0-9]{64}$/,'Reviewed public configuration hash is required');
    const response=await fetcher(expected.configUrl,{headers:{origin},redirect:'error',signal:AbortSignal.timeout(15000)});
    assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),origin);
    const body=await response.json();assert.equal(body.success,true);const config=body.resources;
    validateIntegration(config);
    assert.equal(configurationHash(config),expected.configurationSha256,'Published configuration changed; review a new compatible release');
    assert.equal(config.revision,expected.revision);assert.equal(config.configUrl,expected.configUrl);
    assert.ok(config.allowedOrigins.includes(origin));assert.equal(config.spam.turnstile.required,true);
    assert.equal(config.method,'POST');assert.equal(config.contentType,'application/json');
    assert.equal(config.consent.marketing.required,false);assert.equal(config.consent.acknowledgement.required,true);
    assert.equal(expected.payments,'disabled');assert.equal(expected.automatedOutreach,'disabled');
    if(expected.tracking==='consent-required') {
      assert.equal(config.tracking.consentRequired,true);assert.equal(config.tracking.providers.consentMode,'required');
      assert.equal(config.tracking.scriptUrl,config.submitUrl+'/tracker.js');
      const tracker=await fetcher(config.tracking.scriptUrl,{headers:{origin},redirect:'error',signal:AbortSignal.timeout(15000)});
      assert.equal(tracker.status,200);assert.equal(tracker.headers.get('access-control-allow-origin'),origin);
      assert.equal(createHash('sha256').update(Buffer.from(await tracker.arrayBuffer())).digest('hex'),expected.trackerSha256,'Published tracker changed; review and repin');
    }
    receipts.push({tenant:page.tenantSlug,page:page.pageSlug,revision:config.revision,compatible:true});
  }
  return receipts;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await preflight(),null,2));
