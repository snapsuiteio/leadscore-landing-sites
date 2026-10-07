function initialiseTracking() {
// Reviewed static GA4 binding, independent of the form contract revision.
// Existing LeadScoreTracker remains responsible for Clarity and first-party events.
const GOOGLE_TAG = 'G-9T3RDM7NKZ';
const CLARITY_PROJECT = 'yu2abnu53o';
const STORAGE_KEY = 'antigua-cookie-choices-v1';
const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
const form = document.getElementById('interest-form');
if (!form?.dataset.configUrl) { document.getElementById('cookie-open')?.setAttribute('hidden', ''); return; }
const panel = document.getElementById('cookie-choices');
const analyticsInput = document.getElementById('cookie-analytics');
const marketingInput = document.getElementById('cookie-marketing');
const note = document.getElementById('cookie-note');
const status = document.getElementById('form-status');
const angles = new Set(['seminar', 'ai', 'snapsuite']);
const allowedQuery = new Set(['angle', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'ad_id']);
let choices = { analytics: false, marketing: false };
let tracker;
let configuration;
let gaStarted = false;
let formStarted = false;
let lastAngle;
const conversions = new Set();

function readChoices() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version === 1 && Number.isFinite(saved.savedAt) && saved.savedAt <= Date.now() && Date.now() - saved.savedAt < MAX_AGE && typeof saved.analytics === 'boolean' && typeof saved.marketing === 'boolean') return saved;
  } catch { /* A blocked preference store never grants consent. */ }
  return null;
}
function normalize(value) {
  return { analytics: value?.analytics === true, marketing: value?.marketing === true && navigator.globalPrivacyControl !== true };
}
function safePage() {
  return [...new URL(location.href).searchParams].every(([key, value]) => allowedQuery.has(key) && /^[a-zA-Z0-9._~-]{1,100}$/.test(value));
}
function angle() {
  const value = new URL(location.href).searchParams.get('angle');
  return angles.has(value) ? value : 'seminar';
}
function internalVisit() {
  return new URL(location.href).searchParams.get('utm_source') === 'setup_verification';
}
function metadata() {
  // Never read form controls or send arbitrary URL query strings or hashes.
  const params = new URL(location.href).searchParams;
  const data = { send_to: GOOGLE_TAG, page_location: location.origin + location.pathname + '?angle=' + angle(), page_title: 'SnapSuite Antigua — ' + angle(), page_referrer: '', source_angle: angle(), traffic_type: internalVisit() ? 'internal' : 'external', traffic_class: internalVisit() ? 'setup_verification' : 'visitor' };
  if (internalVisit()) data.debug_mode = true;
  for (const [query, key] of [['utm_source','campaign_source'],['utm_medium','campaign_medium'],['utm_campaign','campaign_name'],['utm_content','campaign_content'],['utm_term','campaign_term']]) {
    const value = params.get(query);
    if (value && /^[a-zA-Z0-9._~-]{1,100}$/.test(value)) data[key] = value;
  }
  return data;
}
function event(name) {
  if (choices.analytics && gaStarted && safePage()) window.gtag('event', name, metadata());
}
function loadGoogle() {
  if (gaStarted || !choices.analytics || !safePage()) return;
  gaStarted = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  window.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  window.gtag('set', { ads_data_redaction: true, url_passthrough: false });
  window.gtag('js', new Date());
  window.gtag('config', GOOGLE_TAG, { ...metadata(), send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GOOGLE_TAG;
  script.referrerPolicy = 'origin';
  script.onerror = () => { note.textContent = 'Some optional analytics could not load. You can still send your enquiry.'; };
  document.head.append(script);
}
function view(initial = false) {
  if (!tracker || !choices.analytics || !safePage()) return;
  const current = angle();
  if (lastAngle === current) return;
  lastAngle = current;
  event('page_view');
  window.clarity?.('set', 'source_angle', current);
  window.clarity?.('set', 'traffic_class', internalVisit() ? 'setup_verification' : 'visitor');
  if (!initial) tracker.track('page_viewed');
}
function conversion() {
  // Only the existing durable-save success path sets this attribute.
  const id = status.dataset.submissionId;
  if (!choices.analytics || !gaStarted || !safePage() || !/^[a-zA-Z0-9._:-]{8,120}$/.test(id || '') || conversions.has(id)) return;
  const key = 'antigua-ga4-conversion:' + id;
  try { if (sessionStorage.getItem(key)) return; } catch { /* In-memory dedup still applies. */ }
  conversions.add(id);
  try { sessionStorage.setItem(key, '1'); } catch { /* No form answers are stored. */ }
  event('generate_lead');
}
function forgetGoogleCookies() {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if (!/^_ga(?:_|$)/.test(name)) continue;
    document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
    const labels = location.hostname.split('.');
    for (let i = 0; i < labels.length - 1; i++) document.cookie = name + '=; Max-Age=0; Path=/; Domain=.' + labels.slice(i).join('.') + '; SameSite=Lax';
  }
}
function apply() {
  if (!tracker || !configuration) return;
  // The current shared tracker has no documented provider override. A future
  // configured Google tag/container must be reviewed instead of double-loading.
  const p = configuration.tracking.providers;
  if (configuration.revision !== Number(form.dataset.configRevision) || p.googleTagId || p.googleTagManagerId || p.facebookPixelId || p.clarityProjectId !== CLARITY_PROJECT) {
    note.textContent = 'Optional analytics are unavailable. You can still use the enquiry form.';
    return;
  }
  const initial = lastAngle === undefined;
  tracker.setConsent(choices);
  if (choices.analytics) { loadGoogle(); view(initial); conversion(); }
}
function save(next) {
  const prior = choices;
  choices = normalize(next);
  // Persist withdrawal before shared tracker unloads the provider SDKs by reload.
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...choices, savedAt: Date.now() })); } catch { /* Session choice only. */ }
  analyticsInput.checked = choices.analytics;
  marketingInput.checked = choices.marketing;
  panel.hidden = true;
  if (prior.analytics && !choices.analytics && gaStarted) {
    window['ga-disable-' + GOOGLE_TAG] = true;
    window.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    forgetGoogleCookies();
  }
  apply();
}

const prior = readChoices();
choices = normalize(prior);
analyticsInput.checked = choices.analytics;
marketingInput.checked = choices.marketing;
marketingInput.disabled = navigator.globalPrivacyControl === true;
panel.hidden = Boolean(prior);
document.getElementById('cookie-open').addEventListener('click', () => { panel.hidden = false; document.getElementById('cookie-title').focus(); });
document.getElementById('cookie-reject').addEventListener('click', () => save({ analytics: false, marketing: false }));
document.getElementById('cookie-accept-analytics').addEventListener('click', () => save({ analytics: true, marketing: false }));
document.getElementById('cookie-save').addEventListener('click', () => save({ analytics: analyticsInput.checked, marketing: marketingInput.checked }));
form.setAttribute('data-leadscore-form', '');
form.setAttribute('data-clarity-mask', 'true');
document.querySelectorAll('[data-intent]').forEach(node => node.setAttribute('data-leadscore-cta', ''));
form.addEventListener('input', () => { if (choices.analytics && gaStarted && !formStarted) { formStarted = true; event('form_start'); } });
document.addEventListener('click', e => { if (e.target instanceof Element && e.target.closest('[data-intent]')) event('cta_clicked'); });
document.querySelectorAll('[data-angle]').forEach(node => node.addEventListener('click', e => { if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) queueMicrotask(() => view()); }));
window.addEventListener('popstate', () => queueMicrotask(() => view()));
new MutationObserver(conversion).observe(status, { attributes: true, attributeFilter: ['data-submission-id'] });

const shared = document.createElement('script');
shared.src = form.dataset.configUrl.replace(/\/config$/, '/tracker.js');
shared.referrerPolicy = 'origin';
shared.crossOrigin = 'anonymous';
shared.integrity = 'sha256-OhXnCFWgi+mRQ5f/qVeAeAfTkjgxND042xP6nTBIpw4=';
shared.onload = async () => {
  try {
    tracker = window.LeadScoreTracker;
    configuration = await tracker.ready;
    if (configuration.configUrl !== form.dataset.configUrl) throw new Error('Unexpected tracking configuration');
    apply();
  } catch { note.textContent = 'Optional analytics are unavailable. You can still send your enquiry.'; }
};
shared.onerror = () => { note.textContent = 'Optional analytics are unavailable. You can still send your enquiry.'; };
document.head.append(shared);

}
initialiseTracking();
