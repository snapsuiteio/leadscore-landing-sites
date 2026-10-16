import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function verifyRelease(base,{releaseFile='dist/release.json',fetcher=fetch}={}) {
  const expected=JSON.parse(await readFile(releaseFile,'utf8'));
  const response=await fetcher(base+'/release.json',{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200);assert.deepEqual(await response.json(),expected,'Exact public release must be served');
  for(const page of expected.pages) {
    const response=await fetcher(base+page.route,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);
    const csp=response.headers.get('content-security-policy')||'';assert.match(csp,/form-action 'none'/);assert.doesNotMatch(csp,/unsafe-eval/);
    if(page.capture==='enabled') {assert.match(csp,/connect-src [^;]*https:\/\/pages\.getleadscore\.ai/);assert.match(csp,/frame-src [^;]*https:\/\/pages\.getleadscore\.ai/);}
    else assert.match(csp,/connect-src 'none'/);
    for(const [name,hash] of Object.entries(page.files)) {
      const response=await fetcher(base+page.route+name,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);
      assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),hash,'Unexpected published file: '+page.route+name);
    }
  }
  assert.equal((await fetcher(base+'/p/unregistered-tenant/unregistered-page/')).status,404);
  assert.ok([404,405].includes((await fetcher(base+'/api/submit',{method:'POST',body:'{}'})).status));
  return {publicCommit:expected.publicCommit,pages:expected.pages.map(page=>({route:page.route,capture:page.capture,revision:page.integration?.revision})),verified:true};
}
