import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attributionFrom, resolveAngle, validateInterest } from '../src/campaign.mjs';

const valid = { name: '  Sample Owner  ', company: ' Sample Business ', email: 'Sample@Example.test', intent: 'event', pain: 'Prepare job details for billing.', phone: '+1 (268) 555-0123', requestConsent: true };
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
test('requested seminar response requires four contact values and acknowledgement', () => {
  const result = validateInterest(valid);
  assert.equal(result.valid, true);
  assert.equal(result.values.email, 'sample@example.test');
  assert.equal(result.values.name, 'Sample Owner');
});
test('blank, whitespace-only and invalid requests expose field errors', () => {
  assert.deepEqual(Object.keys(validateInterest({}).errors).sort(), ['company', 'email', 'name', 'phone', 'requestConsent']);
  const result = validateInterest({ ...valid, name: ' ', email: 'x@y', phone: 'abc', requestConsent: 'true' });
  assert.deepEqual(Object.keys(result.errors).sort(), ['email', 'name', 'phone', 'requestConsent']);
});
test('caller intent cannot change the fixed seminar request', () => {
  const result = validateInterest({ ...valid, intent: 'onsite', phone: '+1 (268) 555-0123' });
  assert.equal(result.valid, true);
  assert.equal(result.values.intent, 'event');
  assert.equal(Object.hasOwn(result.values, 'pain'), false);
  assert.equal(Object.hasOwn(result.values, 'paid'), false);
});
test('oversized contact values are rejected', () => {
  const result = validateInterest({ ...valid, name: 'x'.repeat(101), company: 'x'.repeat(151), pain: 'x'.repeat(1001) });
  assert.deepEqual(Object.keys(result.errors).sort(), ['company', 'name']);
});
test('blank or whitespace phone cannot pass shared validation', () => {
  for (const value of ['', '   ']) {
    const result = validateInterest({ ...valid, phone: value, pain: value });
    assert.deepEqual(Object.keys(result.errors).sort(), ['phone']);
  }
});
test('published visual page exposes required fields and inactive capture without the uncleared photo', () => {
  const html = readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /id="pain"|id="intent"|id="marketingConsent"|checklist|free job-to-invoice|snapsuite-fit/i);
  assert.match(html, /Please email me details about the paid October 27 seminar/);
  assert.match(html, /id="phone"[^>]*required/);
  assert.match(html, /data-leadscore-capture="disabled"/);
  assert.match(html, /Signup is not available yet/);
  assert.doesNotMatch(html, /trade-winds\.jpg|not published/);
  assert.match(html, /assets\/seminar-preview\.png/);
});
