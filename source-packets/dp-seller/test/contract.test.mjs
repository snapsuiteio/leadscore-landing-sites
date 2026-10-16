import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {QUALIFICATION_QUESTIONS,FIELDS,ANGLES,validateSeller,angleFromUrl,boundedAttribution} from '../src/contract.mjs';
const source=JSON.parse(readFileSync(new URL('../src/questions-source.json',import.meta.url)));
const values=()=>({full_name:'QA Example',email:'qa@example.invalid',phone:'+12025550100',property_address:'QA fixture address',borough:'Brooklyn',
  requestConsent:true,...Object.fromEntries(QUALIFICATION_QUESTIONS.map(q=>[q.name,q.options[0]]))});
test('five exact approved questions/options are unchanged, with no eligibility thresholds',()=>{
  assert.deepEqual(QUALIFICATION_QUESTIONS,source.questions);
  assert.deepEqual(QUALIFICATION_QUESTIONS.map(q=>q.options.length),[6,5,4,7,4]);
  for(const q of QUALIFICATION_QUESTIONS)for(const option of q.options){
    const answer=validateSeller({...values(),[q.name]:option},'A01');assert.equal(answer.valid,true,option);
  }
  assert.equal(FIELDS.length,12);assert.equal(FIELDS.some(f=>f.icpField),false);
});
test('only the selected four angles map to fixed seller intent; raw attribution is bounded',()=>{
  assert.deepEqual(Object.keys(ANGLES),['A01','A02','A03','A05']);
  for(const angle of Object.keys(ANGLES)){
    const result=validateSeller({...values(),intent:'investor',source_angle:'another'},angle);
    assert.equal(result.answers.intent,'seller_enquiry');assert.equal(result.answers.source_angle,angle);
    assert.equal(angleFromUrl('https://static.invalid/?angle='+angle),angle);
  }
  assert.equal(angleFromUrl('https://static.invalid/?angle=A04'),'A01');
  const attribution=boundedAttribution('https://static.invalid/?utm_source=facebook&email=private@example.invalid&ad_id=123&x=private',()=> 'unit-time');
  assert.deepEqual(attribution,{captured_at:'unit-time',utm_source:'facebook',ad_id:'123'});
});
test('validation requires contact, all five selections and explicit acknowledgement',()=>{
  assert.equal(validateSeller(values(),'A01').valid,true);
  for(const q of QUALIFICATION_QUESTIONS){
    assert.equal(validateSeller({...values(),[q.name]:''},'A01').valid,false);
    assert.equal(validateSeller({...values(),[q.name]:'Unlisted choice'},'A01').valid,false);
  }
  for(const patch of [{email:'invalid'},{phone:'invalid'},{property_address:''},{full_name:''},{requestConsent:false}])
    assert.equal(validateSeller({...values(),...patch},'A01').valid,false);
});
test('preview has no production config or action; privacy is inline and there are no optional trackers',()=>{
  const html=readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
  assert.ok(html.includes('data-leadscore-capture="disabled"'));
  assert.doesNotMatch(html,/<form[^>]+action=|data-config-url=|cookie-choices|investor|accredit|securities|guaranteed offer/i);
  assert.match(html,/href="#privacy"/);assert.match(html,/No information is sent or saved/);
  for(const q of QUALIFICATION_QUESTIONS)for(const option of q.options)assert.ok(html.includes(option),option);
  assert.doesNotMatch(html,/googletagmanager|clarity\.ms|facebook\.com|fonts\.googleapis/);
});
test('existing Antigua headless adapter is byte-for-byte preserved in seller packet and Antigua manifest',()=>{
  const old=readFileSync(new URL('../../antigua/src/headless-form-adapter.mjs',import.meta.url));
  const current=readFileSync(new URL('../src/headless-form-adapter.mjs',import.meta.url));
  assert.equal(createHash('sha256').update(current).digest('hex'),createHash('sha256').update(old).digest('hex'));
  const manifest=JSON.parse(readFileSync(new URL('../../../sites/manifest.json',import.meta.url)));
  assert.ok(manifest.pages.some(page=>page.tenantSlug==='snapsuite-antigua')); // Existing exports are not modified by this source change.
});
