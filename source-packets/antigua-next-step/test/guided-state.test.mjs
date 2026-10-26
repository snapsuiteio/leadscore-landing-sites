import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedHistoryState,restoreGuidedHistory} from '../src/guided-state.mjs';
import {offer} from '../src/journey.mjs';
import {verifiedProviderLink} from '../src/native-offers.mjs';
test('refresh retains every public guided branch and its logical Back path',()=>{
 const cases=[['entry',null,'',[]],['work',null,'',['entry']],['learn',null,'',['entry']],['training',null,'',['entry','work']],['review','consultation','',['entry','work']],...['operations','sales','both'].map(track=>['review','group',track,['entry','work','training']])];
 for(const [step,selected,track,historySteps]of cases){const stored=guidedHistoryState({step,selected,track,email:'private@example.invalid',session:'never-store',profile:{name:'Never store'}});const restored=restoreGuidedHistory(stored);assert.deepEqual({...restored,path:undefined},{step,selected,track,historySteps,path:undefined});assert(!JSON.stringify(stored).match(/private|never-store|profile|email|session/i));}
});
test('unknown, expanded, private and legacy states cannot restore a guided checkout',()=>{
 for(const value of [null,[],{}, {antiguaStep:'unknown'},{antiguaStep:'review',offer:'group',track:'unknown'},{antiguaStep:'review',offer:'consultation',email:'private@example.invalid'},{antiguaStep:'work',profile:{}},{antiguaStep:'review',offer:'onsite'},{antiguaStep:'review',offer:'virtual'},{antiguaStep:'review',offer:'seat'},{antiguaStep:'review',offer:'group',track:'sales',amount:1}])assert.equal(restoreGuidedHistory(value),null,JSON.stringify(value));
 assert.equal(guidedHistoryState({step:'identify',email:'private@example.invalid'}),null);
});
test('new future consultation has a separate fixed provider path and no dated product identity',()=>{
 const current=offer('consultation'),legacy=offer('onsite');assert.equal(current.price,'US$949');assert(!Object.hasOwn(current,'productId'));assert.notEqual(current,legacy);assert(!/October 28|8–10|11 a.m./.test(JSON.stringify(current)));assert.match(current.summary,/two virtual follow-up meetings/);assert.match(current.summary,/virtually on Zoom or in person/);assert.equal(verifiedProviderLink('consultation').url,'https://calendly.com/snapsuite/consultation');assert.equal(verifiedProviderLink('consultation').amount,94900);assert.notEqual(verifiedProviderLink('consultation').url,verifiedProviderLink('onsite').url);
});
