import test from 'node:test';
import assert from 'node:assert/strict';
import {publicOfferIntent,offerReviewState,offerFromReviewState} from '../src/offer-entry.mjs';
const keys=new Set(['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','ad_id','angle']);
const intent=(suffix)=>publicOfferIntent(new URL('https://review.invalid/'+suffix),keys);
test('only three fixed public offer values route; existing onsite and seat meanings stay intact',()=>{
 for(const [value,id]of[['virtual','virtual'],['onsite','onsite'],['seat','seminar_seat']]){assert.equal(intent('?offer='+value),id);assert.equal(intent('?utm_source=whatsapp&offer='+value),id)}
});
test('unknown, duplicate, mixed, contact and private entry inputs cannot choose public detail',()=>{
 for(const suffix of ['', '?offer=', '?offer=Virtual','?offer=seminar_seat','?offer=unknown','?offer=__proto__','?offer=virtual&offer=virtual','?offer=virtual&offer=onsite','?offer=virtual&price=1','?offer=virtual&email=review@example.invalid','?offer=virtual&url=https://other.invalid','?offer=virtual#access=invalid-review-marker','private/?offer=virtual','profile/?offer=virtual'])assert.equal(intent(suffix),null,suffix);
});
test('reload/history can retain only fixed public review state, never identity or arbitrary context',()=>{
 for(const id of ['virtual','onsite','seminar_seat']){const state=offerReviewState(id);assert.ok(Object.isFrozen(state));assert.equal(offerFromReviewState(state),id);assert.deepEqual(Object.keys(state).sort(),['antiguaStep','offer'])}
 for(const state of [null,[],{}, {antiguaStep:'entry',offer:'virtual'},{antiguaStep:'review',offer:'unknown'},{...offerReviewState('virtual'),email:'review@example.invalid'},{...offerReviewState('virtual'),session:'invalid-review-marker'}])assert.equal(offerFromReviewState(state),null);
});
