import assert from 'node:assert/strict';
import test from 'node:test';
import {employeeBand,profileAnswers,nextAfterProfile,recommend,OFFERS,SIZES,sizePath,seatSalesOpen,SEAT_SALES_CLOSE_AT} from '../src/journey.mjs';
import {providerLinks,verifiedProviderLink} from '../src/native-offers.mjs';
test('known CRM facts skip repeated questions and ambiguous sizes stay unknown',()=>{
 assert.equal(nextAfterProfile(profileAnswers({employeeMin:5,employeeMax:9,priority:'sales'})),'offers');
 assert.equal(nextAfterProfile(profileAnswers({priority:'ai'})),'employees');
 for(const profile of [{},{employeeMin:0,employeeMax:null},{employeeMin:3,employeeMax:8},{employeeMin:-1,employeeMax:0}]) assert.equal(employeeBand(profile),null);
 assert.equal(recommend('10_plus','operations'),'onsite');
 assert.equal(recommend('solo','sales'),'solo');
});
test('only exact approved USD provider destinations activate',()=>{
 assert.ok(verifiedProviderLink('seminar_seat'));assert.ok(verifiedProviderLink('onsite'));assert.equal(verifiedProviderLink('onsite',{onsite:{...providerLinks.onsite,enabled:false}}),null);
 assert.equal(verifiedProviderLink('group'),null);
 const bad={...providerLinks,seminar_seat:{...providerLinks.seminar_seat,url:providerLinks.seminar_seat.url+'?amount=1'}};
 assert.equal(verifiedProviderLink('seminar_seat',bad),null);
 assert.match(OFFERS.find(x=>x.id==='onsite').terms.join(' '),/no extra charge and no expiry date/);assert.equal(verifiedProviderLink('virtual').amount,47900);assert.match(OFFERS.find(x=>x.id==='virtual').terms.join(' '),/48 hours/);
});

test('size paths preserve thresholds and the confirmed noon cutoff',()=>{
 assert.deepEqual(SIZES.map(row=>row[0]),['10_plus','5_9','1_4','solo']);
 assert.deepEqual(sizePath('solo').offers,['solo']);
 assert.deepEqual(sizePath('10_plus').offers,['onsite','virtual']);
 assert.equal(seatSalesOpen(SEAT_SALES_CLOSE_AT-1),true);
 assert.equal(seatSalesOpen(SEAT_SALES_CLOSE_AT),false);
 assert.equal(new Date(SEAT_SALES_CLOSE_AT).toISOString(),'2026-10-27T16:00:00.000Z');
});

test('three fixed-date training choices use separate one-time prices and the approved refund cutoff',()=>{
 for(const [id,amount] of [['group_operations',24900],['group_sales',24900],['group_both',39840]]){assert.equal(verifiedProviderLink(id).amount,amount);assert.equal(verifiedProviderLink(id,{[id]:{...providerLinks[id],amount:1}}),null)}
 assert.match(OFFERS.find(x=>x.id==='group').terms.join(' '),/November 3, 2026/);assert.match(OFFERS.find(x=>x.id==='onsite').included.join(' '),/Two virtual follow-up meetings/);
});
