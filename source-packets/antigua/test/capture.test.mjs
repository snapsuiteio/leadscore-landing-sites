import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSENT_VERSION, INTENTS, MARKETING_CONSENT, REQUEST_CONSENT } from '../src/campaign.mjs';
import { enquiryAnswers, loadCapture, SUCCESS_MESSAGE, validateCampaignConfiguration } from '../src/capture.mjs';

const origin = 'https://leadscore-landing-sites.snapsuite-f2f.workers.dev';
const configUrl = 'https://pages.getleadscore.ai/f/SyntheticFixtureFormKey01/config';
function configuration() {
  return { schemaVersion: 1, revision: 3, pageId: 'synthetic-page', configUrl, submitUrl: configUrl.slice(0, -7),
    fields: [
      { id: 'full_name', label: 'Your name', type: 'text', required: true },
      { id: 'work_email', label: 'Email', type: 'email', required: true },
      { id: 'company_name', label: 'Company', type: 'text', required: true },
      { id: 'phone', label: 'Phone', type: 'phone', required: true },
      { id: 'intent', label: 'Interest', type: 'select', required: true, options: [...INTENTS] },
      { id: 'source_angle', label: 'Opening', type: 'select', required: true, options: ['seminar', 'snapsuite', 'ai'] },
    ], allowedOrigins: [origin], attributionKeys: [], consent: { marketing: { required: false, text: MARKETING_CONSENT }, acknowledgement: { required: true, text: REQUEST_CONSENT, version: CONSENT_VERSION } }, spam: { honeypotField: 'website', turnstile: { required: false } } };
}
const values = { name: 'Synthetic Owner', email: 'synthetic@example.test', company: 'Synthetic Capture QA', phone: '+1 268 555 0123', pain: 'SYNTHETIC TEST — verify the required business-improvement answer.', intent: 'event' };
test('maps every required answer and preserves each angle without public tenant routing', () => {
  for (const angle of ['seminar', 'snapsuite', 'ai']) {
    const answers = enquiryAnswers(values, angle);
    assert.equal(answers.phone, values.phone);
    assert.equal(Object.hasOwn(answers, 'message'), false);
    assert.equal(answers.intent, 'event');
    assert.equal(answers.source_angle, angle);
    assert.deepEqual(Object.keys(answers).sort(), configuration().fields.map(field => field.id).sort());
  }
  assert.match(SUCCESS_MESSAGE, /No seat has been reserved or paid for/);
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
  assert.equal(Object.hasOwn(posts[1].answers, 'message'), false);
  assert.equal(posts[1].answers.intent, 'event');
  for (const key of ['tenant_id', 'routing', 'paid', 'campaign_id', 'owner_id']) assert.equal(Object.hasOwn(posts[1], key), false);
});
test('refuses a republished revision so draft routing changes cannot alter a released form', async () => {
  await assert.rejects(loadCapture({ dataset: { configUrl, configRevision: '2' } }, { origin, fetcher: async () => Response.json({ success: true, resources: configuration() }) }), /has changed/);
});
