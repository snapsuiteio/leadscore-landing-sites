import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {configurationHash,preflight} from '../scripts/preflight-tracking.mjs';
import {createHash} from 'node:crypto';
test('release checks are generic across tenants and reject configuration drift',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'landing-release-'));
 try {
  const origin='https://brand.example.test',script='synthetic tracker',configs=new Map();
  const pages=['tenant-one','tenant-two'].map((tenant,i)=>{const submitUrl='https://pages.getleadscore.ai/f/SyntheticPublicForm'+i;
   const c={schemaVersion:1,pageId:'page-'+i,revision:i+1,fields:[{id:'reply',type:'email',required:true}],submitUrl,configUrl:submitUrl+'/config',method:'POST',contentType:'application/json',allowedOrigins:[origin,'https://another.example.test'],consent:{marketing:{required:false},acknowledgement:{required:true}},spam:{honeypotField:'website',turnstile:{required:true}},tracking:{scriptUrl:submitUrl+'/tracker.js',consentRequired:true,providers:{consentMode:'required'}}};configs.set(c.configUrl,c);
   return {tenantSlug:tenant,pageSlug:'offer',capture:'enabled',integration:{configUrl:c.configUrl,revision:c.revision,configurationSha256:configurationHash(c),tracking:'consent-required',trackerSha256:createHash('sha256').update(script).digest('hex'),payments:'disabled',automatedOutreach:'disabled'}};});
  await mkdir(join(dir,'sites'));await writeFile(join(dir,'sites/release-manifest.json'),JSON.stringify({pages}));
  const fetcher=async url=>new Response(url.endsWith('/tracker.js')?script:JSON.stringify({success:true,resources:configs.get(url)}),{headers:{'access-control-allow-origin':origin}});
  const args={root:pathToFileURL(dir+'/'),origin,fetcher};assert.equal((await preflight(args)).length,2);
  configs.values().next().value.revision++;await assert.rejects(()=>preflight(args),/configuration changed/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
