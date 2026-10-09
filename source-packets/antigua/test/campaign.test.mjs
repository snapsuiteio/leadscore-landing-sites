import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APPLICATION_FIELDS, HEROES, REQUEST_CONSENT, attributionFrom, resolveAngle, validateInterest } from '../src/campaign.mjs';
const valid = { name: ' Sample Owner ', company: ' Sample Business ', email: 'Sample@Example.test', phone: '+1 (268) 555-0123', requestConsent: true };
test('unknown angle cannot reflect URL input', () => {
  for (const value of ['', '?angle=constructor', '?angle=__proto__', '?angle=%3Cscript%3E']) assert.equal(resolveAngle(value), 'seminar');
  for (const angle of ['snapsuite', 'ai']) assert.equal(resolveAngle(`?angle=${angle}`), angle);
});
test('bounded attribution excludes contact details and private routing', () => {
  const result = attributionFrom(`?angle=ai&utm_source=facebook&ad_id=123&utm_content=${'x'.repeat(300)}&email=ignore@example.test&tenant_id=evil`);
  assert.deepEqual(Object.keys(result).sort(), ['ad_id', 'source_angle', 'utm_content', 'utm_source']);
  assert.equal(result.utm_content.length, 200);
});
test('interim request retains four contact inputs and two bounded internal fields', () => {
  assert.equal(APPLICATION_FIELDS.length, 6);
  const result = validateInterest({...valid, intent: 'onsite', main_challenge: 'Unreleased field'});
  assert.equal(result.valid, true);
  assert.equal(result.values.intent, 'event');
  assert.equal(result.values.email, 'sample@example.test');
  assert.deepEqual(Object.keys(result.values).sort(), ['company', 'email', 'intent', 'name', 'phone']);
  assert.deepEqual(Object.keys(validateInterest({}).errors).sort(), ['company', 'email', 'name', 'phone', 'requestConsent']);
});
test('invalid or oversized contact inputs and missing acknowledgement cannot pass', () => {
  const result = validateInterest({...valid, name: 'x'.repeat(101), company: 'x'.repeat(151), phone: 'abc', email: 'x@y', requestConsent: 'true'});
  assert.deepEqual(Object.keys(result.errors).sort(), ['company', 'email', 'name', 'phone', 'requestConsent']);
});
test('three angles retain free manual review, provisional venue and no delivery promise', () => {
  const html = readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');
  for (const field of APPLICATION_FIELDS.filter(field => !['intent', 'source_angle'].includes(field.id))) assert.ok(html.includes(`id="${field.name}"`));
  assert.ok(html.includes(REQUEST_CONSENT));
  assert.match(html, /Request a free seat/);
  assert.match(html, /manual screening/);
  assert.match(html, /no confirmed hold/i);
  assert.doesNotMatch(html, /id="main_challenge"|US\$249|paid October|confirmation email|Google Sheet/);
  for (const hero of Object.values(HEROES)) assert.match(hero.short, /free/);
});
