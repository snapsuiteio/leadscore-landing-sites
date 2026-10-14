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
  const config=JSON.parse(readFileSync(resolve(configFile),'utf8')),review=JSON.parse(readFileSync(resolve(reviewFile),'utf8'));
  assert.equal(review.tenantId,'de6b781c-e755-4a99-b841-ae5222325993');
  assert.equal(review.destinationKind,'seller');assert.equal(review.routingVerified,true);
  assert.equal(review.automatedOutreach,'disabled');assert.equal(review.actualPublishedRevision,config.revision);
  assert.equal(review.pageId,config.pageId);
  assert.equal(review.privatePublishedPage?.tenantId,review.tenantId);
  assert.equal(review.privatePublishedPage?.id,config.pageId);
  assert.equal(review.privatePublishedPage?.listId,review.listId);
  assert.equal(review.privatePublishedPage?.publishedRevision,config.revision);
  assert.equal(review.publicConfigurationSha256,createHash('sha256').update(JSON.stringify(config)).digest('hex'));
  assert.ok(review.listId&&review.leadStage&&review.leadStatus&&Array.isArray(review.tags));
  assert.equal(review.privatePublishedConfig?.routing?.triggerPlaybooks,false);
  assert.equal(review.privatePublishedConfig?.routing?.leadStage,review.leadStage);
  assert.equal(review.privatePublishedConfig?.routing?.leadStatus,review.leadStatus);
  assert.equal(review.privatePublishedConfig?.routing?.pipelineType,review.pipelineType);
  assert.deepEqual(review.privatePublishedConfig?.routing?.tags,review.tags);
  assert.ok(!review.privatePublishedConfig?.hostedCheckout&&!review.privatePublishedConfig?.agreement&&!review.privatePublishedConfig?.webinar);
  validateSellerConfiguration(config,{configUrl:config.configUrl,pageId:config.pageId,revision:config.revision,origin});
  capture='enabled';
  html=html.replace('data-leadscore-capture="disabled"','data-leadscore-capture="enabled"')
    .replace('<form id="property-form"',`<form id="property-form" data-config-url="${config.configUrl}" data-config-revision="${config.revision}" data-page-id="${config.pageId}"`)
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
  realCapture:'Not exercised by this build',optionalTracking:'none',payments:'none',automatedOutreach:'disabled',
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
