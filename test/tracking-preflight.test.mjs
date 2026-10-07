import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {preflight} from '../scripts/preflight-tracking.mjs';
const root=new URL('../',import.meta.url);
const origin='https://leadscore-landing-sites.snapsuite-f2f.workers.dev';
const fixture=JSON.parse(await readFile(new URL('fixtures/tracking-config.json',import.meta.url),'utf8'));
const tracker=await readFile(new URL('fixtures/published-tracker.js',import.meta.url));
function check(mutate=()=>{},script=tracker){
  const body=structuredClone(fixture);mutate(body.resources);
  return preflight({root,origin,fetcher:async(url,options)=>{
    assert.equal(options.headers.origin,origin);assert.equal(options.redirect,'error');
    return url.endsWith('/config')?Response.json(body,{headers:{'access-control-allow-origin':origin}}):new Response(script,{headers:{'access-control-allow-origin':origin}});
  }});
}
test('prepared revision 3 contract fixture and integrity-pinned tracker pass pre-deployment gate',async()=>{
  assert.equal((await check())[0].compatible,true);
});
for(const [name,mutate] of [
  ['old revision remains published',c=>{c.revision=2;}],
  ['old required workflow question remains',c=>{c.fields.push({id:'message',type:'textarea',required:true,label:'Old question'});}],
  ['intent broadens beyond seminar',c=>{c.fields.find(f=>f.id==='intent').options.push('onsite');}],
  ['acknowledgement text changes',c=>{c.consent.acknowledgement.text='Different purpose';}],
  ['revision advances',c=>{c.revision++;}],
  ['acknowledgement changes',c=>{c.consent.acknowledgement.version='different';}],
  ['required phone changes',c=>{c.fields.find(f=>f.id==='phone').required=false;}],
  ['origin expands',c=>{c.allowedOrigins.push('https://other.invalid');}],
  ['security disabled',c=>{c.spam.turnstile.required=false;}],
  ['competing GA configured',c=>{c.tracking.providers.googleTagId='G-OTHER123';}],
  ['Clarity destination changes',c=>{c.tracking.providers.clarityProjectId='different';}],
])test('pre-deployment gate rejects '+name,async()=>{await assert.rejects(check(mutate));});
test('pre-deployment gate rejects altered shared tracker',async()=>{await assert.rejects(check(()=>{},Buffer.concat([tracker,Buffer.from('\n// changed')])));});
