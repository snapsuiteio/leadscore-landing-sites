import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {offer} from '../src/journey.mjs';
import {verifiedProviderLink} from '../src/native-offers.mjs';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('US949 appointment supports the verified two delivery modes with preserved duration and follow-ups',()=>{
 const item=offer('onsite');assert.equal(item.price,'US$949');
 assert.match(item.summary,/virtually on Zoom or in person/);
 assert.match(item.included.join(' '),/Two hours with Dwain/);
 assert.match(item.included.join(' '),/Two virtual follow-up meetings/);
 assert.match(item.terms.join(' '),/choice of Zoom or an in-person meeting/);
 assert.equal(verifiedProviderLink('onsite').amount,94900);
 assert.equal(verifiedProviderLink('onsite').url,'https://calendly.com/snapsuite/antigua-onsite-october-28-2026');
});
test('legacy US479 virtual package and existing group subscription terms are unchanged',()=>{
 // Fingerprints of the complete settled offer objects in the prior live source, not just their prices.
 assert.equal(digest(offer('onsite')),'6f9209c38f8e72dbcfb49049b2c8a41aa13fe971433760c132d28cbbc66627ed');
 assert.equal(digest(offer('seminar_seat')),'03bf79e66cddbdc5f5abc27b29a620ae253fec96238aaa23c35baabe1dd9254d');
 assert.equal(digest(offer('virtual')),'45a4cd53459660ed85b11327dba4b8f176f9337515069014c87b97357a7a407b');
 assert.equal(digest(offer('group')),'12f438209ebe93322b283740c9837f2fa7c92b97ff2c0319d1c462bd57ec2f65');
 assert.equal(verifiedProviderLink('virtual').amount,47900);
 assert.equal(verifiedProviderLink('virtual').url,'https://calendly.com/snapsuite/two-hour-private-virtual-meeting-with-dwain');
});
