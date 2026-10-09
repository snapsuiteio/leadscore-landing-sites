import test from 'node:test';
import assert from 'node:assert/strict';
import { APPLICATION_FIELDS, CONSENT_VERSION, INTENTS, MARKETING_CONSENT, REQUEST_CONSENT } from '../src/campaign.mjs';
import { enquiryAnswers, loadCapture, SUCCESS_MESSAGE, validateCampaignConfiguration } from '../src/capture.mjs';

const origin = 'https://leadscore-landing-sites.snapsuite-f2f.workers.dev';
const configUrl = 'https://pages.getleadscore.ai/f/SyntheticFixtureFormKey01/config';
function configuration() {
  return { schemaVersion: 1, revision: 3, pageId: 'synthetic-page', configUrl, submitUrl: configUrl.slice(0, -7),
    fields: APPLICATION_FIELDS.map(({ name, ...field }) => structuredClone(field)), allowedOrigins: [origin], attributionKeys: [], consent: { marketing: { required: false, text: MARKETING_CONSENT }, acknowledgement: { required: true, text: REQUEST_CONSENT, version: CONSENT_VERSION } }, spam: { honeypotField: 'website', turnstile: { required: false } } };
}
const values = { name: '  Sample Owner  ', company: ' Sample Business ', email: 'Sample@Example.test', intent: 'event', phone: '+1 (268) 555-0123', business_type: 'Construction', operating_status: 'Operating', attendee_role: 'Owner or founder', registration_status: 'Registered', years_operating: '0', team_size: '1', main_challenge: 'Prepare job details for billing.', requestConsent: true };
test('maps every required answer and preserves each angle without public tenant routing', () => {
  for (const angle of ['seminar', 'snapsuite', 'ai']) {
    const answers = enquiryAnswers(values, angle);
    assert.equal(answers.phone, values.phone);
    assert.equal(answers.main_challenge, values.main_challenge);
    assert.equal(answers.intent, 'event');
    assert.equal(answers.source_angle, angle);
    assert.deepEqual(Object.keys(answers).sort(), configuration().fields.map(field => field.id).sort());
  }
  assert.match(SUCCESS_MESSAGE, /Application received/);
});
test('rejects an unapproved origin, optional phone, wrong question or compulsory marketing', () => {
  const good = configuration();
  assert.equal(validateCampaignConfiguration(good, configUrl, origin), good);
  assert.throws(() => validateCampaignConfiguration(good, configUrl, 'https://other.test'), /website/);
  for (const mutate of [c => { c.fields.find(f => f.id === 'phone').required = false; }, c => { c.consent.marketing.required = true; }, c => { c.consent.acknowledgement.version = 'different'; }, c => { c.fields.find(f => f.id === 'intent').options = ['onsite']; }, c => { c.fields.push({ id: 'tenant_id' }); }]) {
    const candidate = configuration(); mutate(candidate);
    assert.throws(() => validateCampaignConfiguration(candidate, configUrl, origin));
  }
});
test('preview performs no network requests, and failed public configuration cannot activate capture', async () => {
  let calls = 0;
  assert.equal(await loadCapture({ dataset: {} }, { origin, fetcher: async () => { calls++; } }), null);
  assert.equal(calls, 0);
  await assert.rejects(loadCapture({ dataset: { configUrl } }, { origin, fetcher: async () => Response.json({ success: false }, { status: 503 }) }), /unavailable/);
});
test('sends a versioned enquiry with independent consent and reuses its ID after a network failure', async () => {
  const posts = [];
  const form = { dataset: { configUrl, configRevision: '3' }, elements: { namedItem: () => ({ value: '' }) } };
  const client = await loadCapture(form, { origin, fetcher: async (url, options) => {
    if (url === configUrl) return Response.json({ success: true, resources: configuration() });
    posts.push(JSON.parse(options.body));
    assert.equal(url, configuration().submitUrl);
    if (posts.length === 1) throw new Error('synthetic interrupted network');
    return Response.json({ success: true, resources: { id: 'synthetic-accepted-id', duplicate: true } }, { status: 200 });
  } });
  const options = { angle: 'ai', marketing: true, attribution: { utm_source: 'synthetic-qa' } };
  await assert.rejects(client.submit(values, options), /ID has been kept/);
  const reply = await client.submit(values, options);
  assert.equal(reply.id, 'synthetic-accepted-id');
  assert.equal(posts[0].submissionId, posts[1].submissionId);
  assert.equal(posts[1].revision, 3);
  assert.deepEqual(posts[1].consent, { marketing: false, acknowledgement: true, acknowledgementVersion: CONSENT_VERSION });
  assert.equal(posts[1].answers.main_challenge, values.main_challenge);
  assert.equal(posts[1].answers.intent, 'event');
  for (const key of ['tenant_id', 'routing', 'paid', 'campaign_id', 'owner_id']) assert.equal(Object.hasOwn(posts[1], key), false);
});
test('refuses a republished revision so draft routing changes cannot alter a released form', async () => {
  await assert.rejects(loadCapture({ dataset: { configUrl, configRevision: '2' } }, { origin, fetcher: async () => Response.json({ success: true, resources: configuration() }) }), /has changed/);
});

test('rejects a duplicate or missing screening field and any option or field-label change', () => {
  for (const mutate of [c => { c.fields.pop(); }, c => { c.fields[4] = c.fields[0]; }, c => { c.fields.find(f => f.id === 'registration_status').options.push('Rejected'); }, c => { c.fields.find(f => f.id === 'main_challenge').label = 'Changed'; }]) {
    const config = configuration(); mutate(config); assert.throws(() => validateCampaignConfiguration(config, configUrl, origin));
  }
});
