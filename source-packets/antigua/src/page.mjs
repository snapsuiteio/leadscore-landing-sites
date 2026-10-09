import { APPLICATION_FIELDS, HEROES, attributionFrom, resolveAngle, validateInterest } from './campaign.mjs';
import { loadCapture, SUCCESS_MESSAGE } from './capture.mjs';

const byId = (id) => document.getElementById(id);
let angle = resolveAngle(location.search);
let attribution = attributionFrom(location.search);

function applyHero() {
  const hero = HEROES[angle];
  byId('hero-first').textContent = hero.first;
  byId('hero-last').textContent = hero.last;
  byId('hero-short').textContent = hero.short;
  byId('hero-description').textContent = hero.description;
  byId('hero-audience').textContent = hero.audience;
  hero.pains.forEach((pain, index) => { byId(`hero-pain-${index + 1}`).textContent = pain; });
  document.querySelectorAll('[data-angle]').forEach((link) => {
    const url = new URL(location.href);
    url.searchParams.set('angle', link.dataset.angle);
    url.hash = '';
    link.href = `${url.pathname}${url.search}`;
    if (link.dataset.angle === angle) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
applyHero();

document.querySelectorAll('[data-angle]').forEach((link) => link.addEventListener('click', (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  history.pushState({}, '', link.href);
  angle = resolveAngle(location.search);
  attribution = attributionFrom(location.search);
  applyHero();
  // The review tool sits at the bottom; bring the changed opening into view.
  window.scrollTo(0, 0);
}));
window.addEventListener('popstate', () => {
  angle = resolveAngle(location.search);
  attribution = attributionFrom(location.search);
  applyHero();
});

document.querySelectorAll('[data-intent]').forEach((link) => link.addEventListener('click', () => {
  clearStatus();
}));
const form = byId('interest-form');
function clearStatus() { byId('form-status').hidden = true; }
form.addEventListener('input', clearStatus);
form.addEventListener('change', clearStatus);
let capture;
let captureError;
if (form.dataset.configUrl) {
  try { capture = await loadCapture(form); }
  catch (error) { captureError = error.message; }
}
byId('preview-submit').disabled = Boolean(captureError);
byId('no-script-note').hidden = true;
if (captureError) {
  byId('form-status').textContent = captureError;
  byId('form-status').hidden = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStatus();
  const input = Object.fromEntries(new FormData(form));
  input.requestConsent = byId('requestConsent').checked;
  const { valid, errors } = validateInterest(input);
  for (const key of [...APPLICATION_FIELDS.filter(field => !['intent', 'source_angle'].includes(field.id)).map(field => field.name), 'requestConsent']) {
    byId(key).setAttribute('aria-invalid', errors[key] ? 'true' : 'false');
    byId(`${key}-error`).textContent = errors[key] || '';
  }
  const summary = byId('error-summary');
  summary.hidden = valid;
  if (!valid) {
    summary.textContent = `Please check ${Object.keys(errors).length} field${Object.keys(errors).length === 1 ? '' : 's'} below. Nothing has been submitted or saved.`;
    byId(Object.keys(errors)[0]).focus();
    return;
  }
  if (form.dataset.configUrl) {
    const status = byId('form-status');
    const button = byId('preview-submit');
    if (!capture || button.disabled) return;
    button.disabled = true;
    status.textContent = 'Sending your application…';
    status.hidden = false;
    try {
      const touch = Object.fromEntries(Object.entries(attribution).filter(([key]) => ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ad_id', 'source_angle'].includes(key)));
      try { const referrer = new URL(document.referrer); if (referrer.hostname !== location.hostname) touch.referrer = referrer.hostname; } catch { /* No external referrer. */ }
      const result = await capture.submit(validateInterest(input).values, { angle, marketing: false, attribution: touch });
      status.textContent = SUCCESS_MESSAGE;
      status.dataset.submissionId = result.id;
      form.querySelectorAll('input, textarea, select').forEach(control => { control.disabled = true; });
    } catch (error) {
      status.textContent = error.message;
      button.disabled = false;
    }
    status.focus();
    return;
  }
  // Deliberately no fetch, storage, console logging, lead creation or analytics.
  // Attribution is held only in memory for future verified intake wiring.
  const status = byId('form-status');
  const intent = 'October 27 free seat application';
  status.textContent = `Details checked — nothing submitted. Your selected request is “${intent}” (source: ${attribution.source_angle}). No information was sent or saved, no email will be sent, and no seat is confirmed.`;
  status.hidden = false;
  status.focus();
});
