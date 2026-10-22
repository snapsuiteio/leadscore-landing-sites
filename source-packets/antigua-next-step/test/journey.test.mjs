import assert from 'node:assert/strict';
import test from 'node:test';
import {employeeBand,profileAnswers,nextAfterProfile,recommend,OFFERS} from '../src/journey.mjs';
import {providerLinks,verifiedProviderLink} from '../src/native-offers.mjs';
test('known CRM facts skip repeated questions and ambiguous sizes stay unknown',()=>{
 assert.equal(nextAfterProfile(profileAnswers({employeeMin:5,employeeMax:9,priority:'sales'})),'offers');
 assert.equal(nextAfterProfile(profileAnswers({priority:'ai'})),'employees');
 for(const profile of [{},{employeeMin:0,employeeMax:null},{employeeMin:3,employeeMax:8},{employeeMin:-1,employeeMax:0}]) assert.equal(employeeBand(profile),null);
 assert.equal(recommend('10_plus','operations'),'onsite');
 assert.equal(recommend('solo','sales'),'solo');
});
test('only exact approved USD provider destinations activate',()=>{
 for(const id of ['onsite','seminar_seat']) assert.ok(verifiedProviderLink(id));
 assert.equal(verifiedProviderLink('group'),null);
 const bad={...providerLinks,seminar_seat:{...providerLinks.seminar_seat,url:providerLinks.seminar_seat.url+'?amount=1'}};
 assert.equal(verifiedProviderLink('seminar_seat',bad),null);
 assert.match(OFFERS.find(x=>x.id==='onsite').included.join(' '),/no expiry deadline/);
});
