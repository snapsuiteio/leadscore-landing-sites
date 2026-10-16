import assert from 'node:assert/strict';
import {cpSync,mkdirSync,readFileSync,rmSync,writeFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateSellerConfiguration} from './src/capture.mjs';
const root=fileURLToPath(new URL('.',import.meta.url)),source=join(root,'src'),output=join(root,'dist');
const origin='https://leadscore-landing-sites.snapsuite-f2f.workers.dev';
const publicRoute='/p/dp-value-partners/sell-as-is/';
const configFile=process.env.DP_SELLER_CONFIG_EXPORT_FILE,reviewFile=process.env.DP_SELLER_ROUTING_RECEIPT_FILE;
assert.equal(Boolean(configFile),Boolean(reviewFile),'Both actual published integration and authenticated seller-routing receipt are required.');
let html=readFileSync(join(source,'index.html'),'utf8'),capture='disabled';
assert.ok(html.includes('data-leadscore-capture="disabled"')&&!/<form[^>]+action=/i.test(html));
if(configFile){
  const exported=JSON.parse(readFileSync(resolve(configFile),'utf8'));
  const config=exported.resources || exported,review=JSON.parse(readFileSync(resolve(reviewFile),'utf8'));
  // Read the authenticated inspection result; never put its routing data in the export.
  assert.equal(review.routingReview?.tenantId,review.page?.tenantId);
  assert.ok(review.page?.tenantId && review.routingReview?.ownerId);
  assert.equal(review.page?.templateId,'external-form');assert.equal(review.page?.status,'published');
  assert.equal(review.page?.id,config.pageId);
  assert.equal(review.page?.publishedRevision,config.revision);
  assert.deepEqual(review.configuration,config,'Review must describe the exact published public contract');
  assert.equal(review.routingReview.triggerPlaybooks,false);
  assert.ok(Array.isArray(review.routingReview.tags));
  validateSellerConfiguration(config,{configUrl:config.configUrl,pageId:config.pageId,revision:config.revision,origin});
  assert.match(process.env.LEADSCORE_TRACKER_INTEGRITY || '',/^sha256-[A-Za-z0-9+/]{43}=$/,'Reviewed tracker integrity is required');
  capture='enabled';
  html=html.replace('data-leadscore-capture="disabled"','data-leadscore-capture="enabled"')
    .replace('<form id="property-form"',`<form id="property-form" data-config-url="${config.configUrl}" data-config-revision="${config.revision}" data-page-id="${config.pageId}" data-tracker-integrity="${process.env.LEADSCORE_TRACKER_INTEGRITY || ''}"`)
    .replace('<p class="preview-notice" id="preview-notice">Preview · No information is sent or saved.</p>','')
    .replace('Check details — preview only','Send my property request')
    .replace('<p class="preview-form-note">Preview: nothing is submitted or saved.</p>','')
    .replace('<p class="privacy-preview">In this preview, entries stay in the page’s memory and are cleared on reload. Nothing is sent or saved.</p>','')
    .replace('The planned request flow is processed through LeadScore.','Requests are processed through LeadScore.')
    .replace('JavaScript is required for form validation. No request can be submitted from this preview.','JavaScript and the security check are required to send your property request.');
}
rmSync(output,{recursive:true,force:true});mkdirSync(output,{recursive:true});
for(const file of readdirSync(source))if(file!=='index.html'&&file!=='questions-source.json')cpSync(join(source,file),join(output,file),{recursive:true});
writeFileSync(join(output,'index.html'),html);
writeFileSync(join(output,'packet-receipt.json'),JSON.stringify({capture,publicRoute,origin,
  intake:'Existing LeadScore headless external-form adapter; no investor portal endpoint',
  realCapture:'Not exercised by this build',optionalTracking:capture==='enabled'?'consent-required':'none',payments:'none',automatedOutreach:'disabled',
  publication:'Not registered or deployed by this build'},null,2)+'\n');
if(capture==='disabled'){
  // A reviewable offline HTML preview with inline CSS/JS. It never loads capture code.
  const contract=readFileSync(join(source,'contract.mjs'),'utf8').replace(/^export /gm,'');
  const page=readFileSync(join(source,'page.mjs'),'utf8').replace(/^import[^\n]+\n/,'');
  const css=readFileSync(join(source,'fonts.css'),'utf8')+'\n'+readFileSync(join(source,'styles.css'),'utf8');
  const preview=html.replace(/  <link rel="stylesheet"[^>]+>\n/g,'').replace('  <script type="module" src="./page.mjs"></script>',
    `<style>${css}</style>\n<script type="module">${contract}\n${page}</script>`);
  writeFileSync(join(output,'preview.html'),preview);
}
console.log(JSON.stringify({output,capture,publicRoute,registered:false,deployed:false}));
