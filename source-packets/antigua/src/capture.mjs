import { CONSENT_VERSION, INTENTS, MARKETING_CONSENT, REQUEST_CONSENT } from './campaign.mjs';
import { createHeadlessClient, connectTurnstileBridge } from './headless-form-adapter.mjs';

export const FIELD_MAP = { full_name: 'name', work_email: 'email', company_name: 'company', phone: 'phone', message: 'pain', intent: 'intent', source_angle: 'source_angle' };
const required = ['full_name', 'work_email', 'company_name', 'phone', 'message', 'intent'];
export const SUCCESS_MESSAGE = 'Your enquiry has been received by SnapSuite. No seat has been reserved or paid for. The team will review your request; payment and booking are separate.';

// Reject a different published form instead of changing the approved visible fields or wording.
export function validateCampaignConfiguration(config, configUrl, origin) {
  if (config?.configUrl !== configUrl || !config.allowedOrigins?.includes(origin)) throw new Error('This enquiry form is not configured for this website.');
  if (config.consent?.marketing?.required !== false || config.consent.marketing.text !== MARKETING_CONSENT || config.consent?.acknowledgement?.required !== true || config.consent.acknowledgement.text !== REQUEST_CONSENT || config.consent.acknowledgement.version !== CONSENT_VERSION) throw new Error('The published request acknowledgement does not match this form.');
  if (config.fields.length !== Object.keys(FIELD_MAP).length || config.fields.some(field => !Object.hasOwn(FIELD_MAP, field.id))) throw new Error('The published fields do not match this form.');
  if (required.some(id => !config.fields.some(field => field.id === id && field.required === true))) throw new Error('Required enquiry fields are missing.');
  const question = config.fields.find(field => field.id === 'message');
  const intent = config.fields.find(field => field.id === 'intent');
  if (question.label !== 'What is one task you would like to improve in your business?' || intent.options?.length !== INTENTS.size || intent.options.some(value => !INTENTS.has(value))) throw new Error('The published questions do not match this form.');
  return config;
}

export function enquiryAnswers(values, angle) {
  return { full_name: values.name, work_email: values.email, company_name: values.company, phone: values.phone, message: values.pain, intent: values.intent, source_angle: angle };
}

export async function loadCapture(form, { fetcher = globalThis.fetch.bind(globalThis), origin = location.origin } = {}) {
  const configUrl = form.dataset.configUrl;
  if (!configUrl) return null;
  const endpoint = new URL(configUrl);
  if (endpoint.origin !== 'https://pages.getleadscore.ai' && !(['127.0.0.1', 'localhost'].includes(endpoint.hostname) && endpoint.protocol === 'http:')) throw new Error('Use the published LeadScore form endpoint.');
  const response = await fetcher(configUrl, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  if (!response.ok || body.success !== true) throw new Error('The enquiry form is temporarily unavailable. Please try again later.');
  const config = validateCampaignConfiguration(body.resources, configUrl, origin);
  if (!/^[1-9]\d*$/.test(form.dataset.configRevision || '') || Number(form.dataset.configRevision) !== config.revision) throw new Error('This enquiry form has changed. Please try again after the site has been updated.');
  // Keep personal answers, attribution and retry state only in this page's memory.
  const client = createHeadlessClient(config, { fetch: fetcher, storage: null });
  let bridge;
  if (config.spam.turnstile.required) {
    const frame = document.createElement('iframe');
    frame.title = 'Enquiry security check';
    frame.className = 'enquiry-security-check';
    frame.style.cssText = 'width:100%;max-width:340px;height:100px;border:0';
    form.querySelector('#preview-submit').before(frame);
    bridge = connectTurnstileBridge(frame, config);
  }
  return {
    async submit(values, { angle, marketing, attribution }) {
      try {
        return await client.submit({ answers: enquiryAnswers(values, angle), marketing, acknowledgement: true, acknowledgementVersion: CONSENT_VERSION, website: form.elements.namedItem('website')?.value || '', turnstileToken: bridge?.getToken(), attribution: { first: attribution, latest: attribution } });
      } finally { bridge?.reset(); }
    },
  };
}
