import { APPLICATION_FIELDS, CONSENT_VERSION, INTENTS, MARKETING_CONSENT, REQUEST_CONSENT } from './campaign.mjs';
import { createHeadlessClient, connectTurnstileBridge } from './headless-form-adapter.mjs';

export const FIELD_MAP = Object.fromEntries(APPLICATION_FIELDS.map(field => [field.id, field.name]));
export const SUCCESS_MESSAGE = 'Application received. SnapSuite will review your request for a free seat manually. Acceptance is not guaranteed, and your seat is not confirmed.';

// Fail closed if the published intake differs from the reviewed application contract.
export function validateCampaignConfiguration(config, configUrl, origin) {
  if (config?.configUrl !== configUrl || !config.allowedOrigins?.includes(origin)) throw new Error('This application form is not configured for this website.');
  if (config.consent?.marketing?.required !== false || config.consent.marketing.text !== MARKETING_CONSENT || config.consent?.acknowledgement?.required !== true || config.consent.acknowledgement.text !== REQUEST_CONSENT || config.consent.acknowledgement.version !== CONSENT_VERSION) throw new Error('The published application acknowledgement does not match this form.');
  if (!Array.isArray(config.fields) || config.fields.length !== APPLICATION_FIELDS.length || new Set(config.fields.map(field => field.id)).size !== APPLICATION_FIELDS.length) throw new Error('The published fields do not match this form.');
  for (const expected of APPLICATION_FIELDS) {
    const field = config.fields.find(field => field.id === expected.id);
    if (!field || field.type !== expected.type || field.required !== expected.required || field.label !== expected.label || (expected.options && JSON.stringify(field.options) !== JSON.stringify(expected.options))) throw new Error('The published application questions do not match this form.');
  }
  return config;
}

export function enquiryAnswers(values, angle) {
  return Object.fromEntries(APPLICATION_FIELDS.map(field => [field.id, field.id === 'source_angle' ? angle : field.id === 'intent' ? 'event' : values[field.name]]));
}

export async function loadCapture(form, { fetcher = globalThis.fetch.bind(globalThis), origin = location.origin } = {}) {
  const configUrl = form.dataset.configUrl;
  if (!configUrl) return null;
  const endpoint = new URL(configUrl);
  if (endpoint.origin !== 'https://pages.getleadscore.ai' && !(['127.0.0.1', 'localhost'].includes(endpoint.hostname) && endpoint.protocol === 'http:')) throw new Error('Use the published LeadScore form endpoint.');
  const response = await fetcher(configUrl, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  if (!response.ok || body.success !== true) throw new Error('The application form is temporarily unavailable. Please try again later.');
  const config = validateCampaignConfiguration(body.resources, configUrl, origin);
  if (!/^[1-9]\d*$/.test(form.dataset.configRevision || '') || Number(form.dataset.configRevision) !== config.revision) throw new Error('This application form has changed. Please try again after the site has been updated.');
  // Keep personal answers, attribution and retry state only in this page's memory.
  const client = createHeadlessClient(config, { fetch: fetcher, storage: null });
  let bridge;
  if (config.spam.turnstile.required) {
    const frame = document.createElement('iframe');
    frame.title = 'Application security check';
    frame.className = 'enquiry-security-check';
    frame.style.cssText = 'width:100%;max-width:340px;height:100px;border:0';
    form.querySelector('#preview-submit').before(frame);
    bridge = connectTurnstileBridge(frame, config);
  }
  return {
    async submit(values, { angle, attribution }) {
      try {
        return await client.submit({ answers: enquiryAnswers(values, angle), marketing: false, acknowledgement: true, acknowledgementVersion: CONSENT_VERSION, website: form.elements.namedItem('website')?.value || '', turnstileToken: bridge?.getToken(), attribution: { first: attribution, latest: attribution } });
      } finally { bridge?.reset(); }
    },
  };
}
