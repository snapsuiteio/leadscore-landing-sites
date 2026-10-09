import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APPLICATION_FIELDS, HEROES, REQUEST_CONSENT, attributionFrom, resolveAngle, validateInterest } from '../src/campaign.mjs';

const valid = { name: '  Sample Owner  ', company: ' Sample Business ', email: 'Sample@Example.test', intent: 'event', phone: '+1 (268) 555-0123', business_type: 'Construction', operating_status: 'Operating', attendee_role: 'Owner or founder', registration_status: 'Registered', years_operating: '0', team_size: '1', main_challenge: 'Prepare job details for billing.', requestConsent: true };
test('invalid and unknown angles fall back without reflecting URL input', () => {
  for (const value of ['', '?angle=constructor', '?angle=__proto__', '?angle=%3Cscript%3E']) assert.equal(resolveAngle(value), 'seminar');
  assert.equal(resolveAngle('?angle=snapsuite'), 'snapsuite');
  assert.equal(resolveAngle('?angle=ai'), 'ai');
});
test('only allowed bounded attribution fields are retained, independently of intent', () => {
  const result = attributionFrom(`?angle=ai&utm_source=facebook&ad_id=123&utm_content=${'x'.repeat(300)}&email=ignore@example.test&tenant_id=evil`);
  assert.deepEqual(Object.keys(result).sort(), ['ad_id', 'source_angle', 'utm_content', 'utm_source']);
  assert.equal(result.source_angle, 'ai');
  assert.equal(result.utm_content.length, 200);
});
test('screens applications with required business and contact answers and manual-review acknowledgement', () => {
  const result = validateInterest(valid);
  assert.equal(result.valid, true);
  assert.equal(result.values.email, 'sample@example.test');
  assert.equal(result.values.name, 'Sample Owner');
  assert.equal(result.values.intent, 'event');
  assert.equal(result.values.years_operating, '0');
  assert.equal(Object.hasOwn(result.values, 'paid'), false);
  assert.deepEqual(Object.keys(validateInterest({}).errors).sort(), [...APPLICATION_FIELDS.filter(field => !['intent', 'source_angle'].includes(field.id)).map(field => field.name), 'requestConsent'].sort());
});
test('accepts all operating and registration statuses without approval thresholds', () => {
  for (const operating_status of APPLICATION_FIELDS.find(field => field.id === 'operating_status').options) {
    for (const registration_status of APPLICATION_FIELDS.find(field => field.id === 'registration_status').options) assert.equal(validateInterest({ ...valid, operating_status, registration_status, years_operating: '0', team_size: '0' }).valid, true);
  }
  assert.equal(validateInterest({...valid, years_operating: '150', team_size: '20000', intent: 'onsite'}).valid, true);
  assert.equal(validateInterest({...valid, intent: 'onsite'}).values.intent, 'event');
});
test('rejects missing challenges, invalid options, unsafe counts and oversized input', () => {
  for (const years_operating of ['-1', '1.5', 'abc', '9007199254740992']) assert.ok(validateInterest({...valid, years_operating}).errors.years_operating);
  for (const team_size of ['-1', '1.5', 'abc']) assert.ok(validateInterest({...valid, team_size}).errors.team_size);
  assert.ok(validateInterest({...valid, operating_status: 'invented'}).errors.operating_status);
  assert.ok(validateInterest({...valid, registration_status: 'invented'}).errors.registration_status);
  assert.ok(validateInterest({...valid, main_challenge: ' '}).errors.main_challenge);
  assert.ok(validateInterest({...valid, main_challenge: 'x'.repeat(1001)}).errors.main_challenge);
  assert.ok(validateInterest({...valid, business_type: 'x'.repeat(151)}).errors.business_type);
  assert.ok(validateInterest({...valid, requestConsent: 'true'}).errors.requestConsent);
});
test('all three angles share a free screened application with truthful provisional venue and no paid copy', () => {
  const html = readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');
  for (const field of APPLICATION_FIELDS.filter(field => !['intent', 'source_angle'].includes(field.id))) {
    assert.ok(html.includes(`id="${field.name}"`));
    assert.ok(html.includes(`id="${field.name}-error"`));
  }
  assert.ok(html.includes(REQUEST_CONSENT));
  assert.match(html, /Request a free seat/);
  assert.match(html, /no confirmed hold/i);
  assert.match(html, /data-leadscore-capture="disabled"/);
  assert.match(html, /Signup is not available yet/);
  assert.doesNotMatch(html, /US\$249|paid October|before payment|trade-winds\.jpg/);
  for (const hero of Object.values(HEROES)) assert.match(hero.short, /free/);
});
