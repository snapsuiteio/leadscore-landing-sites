import { HEROES, attributionFrom, resolveAngle, validateInterest } from './campaign.mjs';

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
  byId('intent').value = link.dataset.intent;
  clearStatus();
}));
const form = byId('interest-form');
function clearStatus() { byId('form-status').hidden = true; }
form.addEventListener('input', clearStatus);
form.addEventListener('change', clearStatus);
byId('preview-submit').disabled = false;
byId('no-script-note').hidden = true;

form.addEventListener('submit', (event) => {
  event.preventDefault();
  clearStatus();
  const input = Object.fromEntries(new FormData(form));
  input.requestConsent = byId('requestConsent').checked;
  const { valid, errors } = validateInterest(input);
  for (const key of ['name', 'company', 'email', 'intent', 'pain', 'phone', 'requestConsent']) {
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
  // Deliberately no fetch, storage, console logging, lead creation or analytics.
  // Attribution is held only in memory for future verified intake wiring.
  const status = byId('form-status');
  const intent = byId('intent').selectedOptions[0].textContent;
  status.textContent = `Details checked — nothing submitted. Your selected request is “${intent}” (source: ${attribution.source_angle}). No information was sent or saved, no email will be sent, and you have not reserved or paid for a seat.`;
  status.hidden = false;
  status.focus();
});
