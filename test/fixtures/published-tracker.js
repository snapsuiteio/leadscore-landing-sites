(function () {
  'use strict';
  if (window.LeadScoreTracker) return;
  var script = document.currentScript;
  if (!script || !script.src) return;
  var source = new URL(script.src), base = source.href.replace(/\/tracker\.js$/, '');
  if (!/\/f\/[a-zA-Z0-9]{16,64}\/tracker\.js$/.test(source.pathname) || source.search || source.hash) return;
  var config, choices = { analytics: false, marketing: false }, loaded = {}, viewSent = false, started = false;
  var pendingConversion;
  var visitor, conversions = new Set(), pending = new Map();
  var signals = new URL(location.href).searchParams;
  var safeProviders = Array.from(signals).every(function (entry) {
    return /^(utm_source|utm_medium|utm_campaign|utm_content|utm_term|gclid|fbclid|ad_id|angle)$/.test(entry[0]) && /^[a-zA-Z0-9._~-]{1,100}$/.test(entry[1]);
  });
  function uuid() { return crypto.randomUUID(); }
  function mask() { document.querySelectorAll('form,input,textarea,select,[role="status"],[role="alert"],#form-status,[data-leadscore-private]').forEach(function (node) { node.setAttribute('data-clarity-mask', 'true'); }); }
  mask(); new MutationObserver(mask).observe(document.documentElement, { childList: true, subtree: true });
  function load(name, url) {
    if (loaded[name] || !safeProviders) return false;
    loaded[name] = true;
    var tag = document.createElement('script'); tag.async = true; tag.src = url; tag.referrerPolicy = 'origin';
    if (script.nonce) tag.nonce = script.nonce;
    document.head.appendChild(tag); return true;
  }
  function google() { window.dataLayer = window.dataLayer || []; window.gtag = window.gtag || function () { window.dataLayer.push(arguments); }; }
  function providerEvent(name, eventId) {
    if (!config || !safeProviders) return;
    var providers = config.tracking.providers;
    // No answers, contact details, full URLs, click IDs or arbitrary labels in provider queues.
    if (choices.analytics && loaded.ga4) window.gtag('event', name === 'conversion' ? 'generate_lead' : name, { send_to: providers.googleTagId, page_location: location.origin + location.pathname, page_referrer: '', page_title: '', leadscore_page_id: config.pageId, leadscore_revision: config.revision, leadscore_variant: attribution().latest.source_angle || 'unspecified' });
    if (choices.analytics && choices.marketing && loaded.gtm) window.dataLayer.push({ event: 'leadscore_' + name, leadscore_page_id: config.pageId, leadscore_revision: config.revision, leadscore_variant: attribution().latest.source_angle || 'unspecified' });
    if (choices.marketing && loaded.meta) window.fbq(name === 'conversion' || name === 'page_viewed' ? 'trackSingle' : 'trackSingleCustom', providers.facebookPixelId, name === 'conversion' ? 'Lead' : name === 'page_viewed' ? 'PageView' : 'leadscore_' + name, {}, eventId ? { eventID: eventId } : undefined);
    if (choices.analytics && loaded.clarity) window.clarity('event', name);
  }
  function providers() {
    if (!config || !safeProviders) return;
    var p = config.tracking.providers;
    var gtm = /^GTM-[A-Z0-9]{4,20}$/.test(p.googleTagManagerId || '');
    if (choices.analytics && /^G-[A-Z0-9]{4,30}$/i.test(p.googleTagId || '') && !(gtm && p.googleTagManagerManagesGa4 !== false)) {
      google();
      if (load('ga4', 'https://www.googletagmanager.com/gtag/js?id=' + p.googleTagId)) {
        window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
        window.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
        window.gtag('js', new Date()); window.gtag('config', p.googleTagId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: location.origin + location.pathname, page_referrer: '', page_title: '' });
        window.gtag('event', 'page_view', { send_to: p.googleTagId, page_location: location.origin + location.pathname, page_referrer: '', page_title: '' });
      }
    }
    // A GTM container can contain advertising tags. Require both categories, plus account-side consent templates.
    if (choices.analytics && choices.marketing && gtm) {
      google();
      if (load('gtm', 'https://www.googletagmanager.com/gtm.js?id=' + p.googleTagManagerId)) {
        window.dataLayer.push({ event: 'leadscore_consent', leadscore_analytics_consent: true, leadscore_marketing_consent: true });
        window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      }
    }
    if (choices.analytics && /^[a-z0-9]{5,30}$/.test(p.clarityProjectId || '')) {
      window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
      if (load('clarity', 'https://www.clarity.ms/tag/' + p.clarityProjectId)) window.clarity('consentv2', { analytics_Storage: 'granted', ad_Storage: 'denied' });
    }
    if (choices.marketing && /^\d{5,30}$/.test(p.facebookPixelId || '')) {
      if (!window.fbq) { var fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); }; fbq.queue = []; fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; window.fbq = fbq; window._fbq = fbq; }
      if (load('meta', 'https://connect.facebook.net/en_US/fbevents.js')) { window.fbq('consent', 'grant'); window.fbq('init', p.facebookPixelId); window.fbq('trackSingle', p.facebookPixelId, 'PageView'); }
    }
  }
  function attribution() {
    var touch = {};
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','ad_id'].forEach(function (key) { var value = signals.get(key); if (value && /^[a-zA-Z0-9._~-]{1,100}$/.test(value)) touch[key] = value; });
    try { var host = new URL(document.referrer).hostname; if (host !== location.hostname) touch.referrer = host; } catch (_) {}
    var angle = new URL(location.href).searchParams.get('angle'); if (angle && /^[a-z0-9_-]{1,60}$/.test(angle)) touch.source_angle = angle; return { latest: touch };
  }
  function visitorId() {
    if (visitor) return visitor;
    try { var key = 'leadscore-visitor:' + config.pageId; visitor = sessionStorage.getItem(key); if (!/^[a-zA-Z0-9._:-]{8,100}$/.test(visitor || '')) { visitor = uuid(); sessionStorage.setItem(key, visitor); } } catch (_) { visitor = uuid(); }
    return visitor;
  }
  function send(payload) {
    if (!choices.analytics) return Promise.resolve(false);
    return fetch(config.tracking.eventsUrl, { method: 'POST', credentials: 'omit', redirect: 'error', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).then(function (response) { if (!response.ok) throw new Error('Tracking unavailable'); pending.delete(payload.eventId); return true; }).catch(function () { if (pending.size < 20) pending.set(payload.eventId, payload); return false; });
  }
  function track(type) {
    if (!config || !choices.analytics || !['page_viewed','form_started','cta_clicked'].includes(type)) return Promise.resolve(false);
    if (type !== 'page_viewed') providerEvent(type);
    return send({ schemaVersion: 1, revision: config.revision, type: type, eventId: uuid(), visitorId: visitorId(), consent: { analytics: true }, attribution: attribution() });
  }
  function apply() {
    if (!config) return;
    providers();
    if (pendingConversion && (choices.analytics || choices.marketing)) { var receipt = pendingConversion; pendingConversion = undefined; conversion(receipt); }
    if (choices.analytics && !viewSent) { viewSent = true; track('page_viewed'); }
  }
  function setConsent(next) {
    var prior = choices;
    choices = { analytics: next && next.analytics === true, marketing: next && next.marketing === true && navigator.globalPrivacyControl !== true };
    var revoked = (prior.analytics && !choices.analytics) || (prior.marketing && !choices.marketing);
    if (revoked) {
      pending.clear();
      if (!choices.analytics) { visitor = undefined; try { sessionStorage.removeItem('leadscore-visitor:' + config.pageId); } catch (_) {} }
      if (loaded.ga4) { window['ga-disable-' + config.tracking.providers.googleTagId] = true; window.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }); }
      if (loaded.clarity) { window.clarity('consentv2', { analytics_Storage: 'denied', ad_Storage: 'denied' }); window.clarity('stop'); }
      if (loaded.meta) window.fbq('consent', 'revoke');
      if (loaded.gtm) window.dataLayer.push({ event: 'leadscore_consent', leadscore_analytics_consent: choices.analytics, leadscore_marketing_consent: choices.marketing });
      document.cookie.split(';').forEach(function (cookie) {
        var name = cookie.split('=')[0].trim();
        if (!/^(_ga(?:_|$)|_gcl_|_fbp$|_fbc$|_clck$|_clsk$)/.test(name)) return;
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
        var labels = location.hostname.split('.');
        for (var i = 0; i < labels.length - 1; i++) document.cookie = name + '=; Max-Age=0; Path=/; Domain=.' + labels.slice(i).join('.') + '; SameSite=Lax';
      });
      // The site's CMP must persist the new choice before calling this method. Reload unloads provider SDKs.
      if (Object.keys(loaded).length) location.reload();
      return;
    }
    apply();
  }
  function conversion(result) {
    if (!config || !result || typeof result.id !== 'string' || !/^[a-zA-Z0-9._:-]{8,120}$/.test(result.id) || conversions.has(result.id)) return false;
    if (!choices.analytics && !choices.marketing) { pendingConversion = result; return false; }
    var key = 'leadscore-conversion:' + config.pageId + ':' + result.id;
    try { if (sessionStorage.getItem(key)) return false; sessionStorage.setItem(key, '1'); } catch (_) {}
    conversions.add(result.id); providerEvent('conversion', result.id); return true;
  }
  var api = { setConsent: setConsent, track: track, confirmConversion: conversion, retry: function () { return Promise.all(Array.from(pending.values()).map(send)); }, ready: null };
  window.LeadScoreTracker = api;
  api.ready = fetch(base + '/config', { credentials: 'omit', redirect: 'error', cache: 'no-store' }).then(function (response) { if (!response.ok) throw new Error('Published tracking configuration unavailable'); return response.json(); }).then(function (body) {
    var value = body.resources;
    if (body.success !== true || value.schemaVersion !== 1 || !Number.isInteger(value.revision) || value.tracking.eventsUrl !== base + '/events' || value.submitUrl !== base || !value.allowedOrigins.includes(location.origin)) throw new Error('Invalid tracking configuration');
    config = value; apply(); return value;
  });
  api.ready.catch(function () { /* Fail closed: no providers, writes or capture on unavailable configuration. */ });
  document.addEventListener('click', function (event) { if (event.target instanceof Element && event.target.closest('[data-leadscore-cta],[data-cta]')) track('cta_clicked'); });
  document.addEventListener('input', function (event) { if (!started && event.target instanceof Element && event.target.closest('[data-leadscore-form]')) { started = true; track('form_started'); } });
})();