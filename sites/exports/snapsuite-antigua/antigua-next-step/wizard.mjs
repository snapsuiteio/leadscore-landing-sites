import { initializeAnalytics, analyticsStep, analyticsSize, analyticsOffer, analyticsForm, analyticsEvent, suspendPrivateAnalytics, safeWizardAttribution, recordChoice } from './analytics.mjs';
import { ORGANIZATION_QUESTIONS, organizationReady, organizationAnswers, organizationContactLike } from './organization.mjs';
import { EMPLOYEES, SIZES, ORGANIZATION, OFFERS, SEMINAR, FREE, TRACKS, track, sizePath, profileAnswers, nextAfterProfile, offer, seatSalesOpen, seatOffered, SEAT_SALES_CLOSE_AT, SEMINAR_ENDS_AT } from './journey.mjs';
import { initialAnswer, choiceField, isEmailField, formReady, publishedAnswers } from './submission.mjs';
import { verifiedProviderLink } from './native-offers.mjs';
import { identityBase, identityConfigured, providerLinks } from './connection.mjs';

const nativeLink=id=>verifiedProviderLink(id,providerLinks);
const nativeLive=!!nativeLink('seminar_seat')||!!nativeLink('onsite');
// Booking is offered only when a verified provider link exists AND the offer has its pre-payment terms.
// (A future verified virtual link stays closed here until its terms are added; nothing is invented.)
// Group training checks out per choice: provider id group_<track> (root configures each verified URL).
const linkIdFor=(id,trackId='')=>id==='group'?(trackId?`group_${trackId}`:''):id;
const bookable=(id,trackId='')=>{const link=nativeLink(linkIdFor(id,trackId));return link&&offer(id)?.terms?.length?link:null;};
// The offer as shown for the current choice: group takes its flat price from the chosen track.
const priced=(item,trackId)=>item.id==='group'&&track(trackId)?{...item,price:track(trackId)[4]}:item;
function currentOffer(id){const item=offer(id);if(id==='onsite'&&nativeLive&&!nativeLink(id))return {...item,terms:[],pending:['Online booking is not open yet.'],status:'Online booking for the onsite consultation is not open right now while we finish checking our payment account. The price is US$949, with all taxes and processing fees included.'};return nativeLink(id)?{...item,pending:[]}:item;}
const $ = selector => document.querySelector(selector);
const screen = $('#screen');
// Claude focus-clearance fix: form controls stay above the fixed free bar/visual keyboard viewport.
const freeBar=document.querySelector('.free-bar'),FOCUS_GAP=12;
function revealAboveBar(el){
 if(!el?.isConnected||!freeBar||getComputedStyle(freeBar).display==='none')return;
 const vv=window.visualViewport,visibleTop=vv?vv.offsetTop:0,visibleBottom=vv?vv.offsetTop+vv.height:innerHeight;
 const limit=Math.min(freeBar.getBoundingClientRect().top,visibleBottom)-FOCUS_GAP,r=el.getBoundingClientRect(),room=limit-visibleTop-FOCUS_GAP;
 const delta=r.height>room?r.top-visibleTop-FOCUS_GAP:r.bottom>limit?r.bottom-limit:r.top<visibleTop+FOCUS_GAP?r.top-visibleTop-FOCUS_GAP:0;
 if(Math.abs(delta)>1)window.scrollBy({top:delta,left:0,behavior:'instant'});
}
const isFormControl=el=>el?.closest?.('#screen form')&&el.matches('input,select,textarea,button,summary');
let revealFrame=0;
function scheduleReveal(el){cancelAnimationFrame(revealFrame);revealFrame=requestAnimationFrame(()=>revealAboveBar(el));}
screen.addEventListener('focusin',event=>{if(isFormControl(event.target))scheduleReveal(event.target);});
window.visualViewport?.addEventListener('resize',()=>{const el=document.activeElement;if(isFormControl(el))scheduleReveal(el);});
function focusOrgHeading(){const heading=screen.querySelector('h2');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start',behavior:'instant'});}

// sizeSource: 'verified' = band read from a verified profile (never changeable here); 'chosen' = picked on a size card.
// segment: 'organization' only when the visitor taps "I Work for an Organization"; employees stays null, so no band is sent.
const state = { step: 'entry', path: null, employees: null, segment: null, priority: null, selected: null, track: '', course: false, profile: null, email: '', session: '', verified: false, error: '', sizeSource: null };
let historySteps = [], freeTrigger;
let orgActionBusy=false;
let orgStep=0,orgDraft={},orgPending=null,orgReceipt=null,orgError='';
let formConfig=null,savePayload=null,savePayloadChoice='',savedReceipt=null,savedChoice='';
const choiceKey=()=>JSON.stringify([state.selected,state.track,state.course,state.employees,state.priority,state.segment]);
const org=()=>state.segment==='organization';
const audienceLabel=()=>org()?'Works for an organization':label(EMPLOYEES,state.employees);
const knownSize=()=>state.verified&&state.sizeSource==='verified';
const workStep=()=>org()||knownSize()?'offers':state.verified?nextAfterProfile(state):'intro';
// One physical control cannot create two logical choices while IDB persistence is pending.
let choiceBusy=false;
async function choose(code,action){if(choiceBusy)return;choiceBusy=true;try{await recordChoice(code);await action?.();}finally{choiceBusy=false;}}
// Client hiding only. The provider/backend must close the Stripe link itself.
const seatClosedNow=()=>state.selected===SEMINAR.id&&!seatSalesOpen();
const formBase=()=>identityBase.replace(/\/identity$/,'');
async function loadPublishedForm(){
 if(!identityConfigured)return;
 try {const response=await fetch(formBase()+'/config',{credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});const result=await response.json();if(response.ok&&(formReady(result.resources)||organizationReady(result.resources)))formConfig=result.resources;}catch{/* Missing setup never falls back to a permissive submission. */}
}
function saveSection(){
 if(!identityConfigured||!state.verified||!formReady(formConfig,state))return '';
 if(savedReceipt&&savedChoice===choiceKey())return `<section class="detail" data-leadscore-private data-clarity-mask="true"><h2 id="saved-heading" tabindex="-1">Your choice is saved.</h2><p>Saved: ${escape(currentOffer(state.selected).title)}${state.track?' · '+escape(track(state.track)?.[1]||state.track):''}${state.course?' · Course requested':''}</p><p>Reference: ${escape(savedReceipt.id)}</p><p>This is not a booking or a payment. Nothing has been charged and no seat or appointment is reserved. ${bookable(state.selected,state.track)?'Book or pay with '+bookable(state.selected,state.track).provider+' below.':'Booking and payment are not open yet.'}</p></section>`;
 const fields=formConfig.fields.filter(f=>!isEmailField(f)&&!choiceField(f)).map(field=>({field,value:field.type==='select'&&!field.options?.includes(initialAnswer(field,state.profile,state))?'':initialAnswer(field,state.profile,state)})).sort((a,b)=>Number(!!a.value)-Number(!!b.value));
 const input=({field:f,value:v})=>{const id='save-'+f.id,label=escape(f.label)+(f.required?' (required)':'');const attrs=`id="${escape(id)}" name="${escape(f.id)}" ${f.required?'required':''}`;let control;if(f.type==='select')control=`<select ${attrs}><option value="">Choose one</option>${(f.options||[]).map(o=>`<option ${v===o?'selected':''}>${escape(o)}</option>`).join('')}</select>`;else if(f.type==='textarea')control=`<textarea ${attrs}>${escape(v)}</textarea>`;else control=`<input ${attrs} type="${f.type==='phone'?'tel':f.type==='number'?'number':'text'}" value="${escape(v)}" ${f.type==='phone'?'autocomplete="tel" inputmode="tel"':['company','company_name','business_name'].includes(f.id)?'autocomplete="organization"':'autocomplete="name"'} maxlength="${f.type==='phone'?40:500}">`;const content=`<label class="field" for="${escape(id)}"><span>${label}</span>${control}</label>`;return v?`<details><summary>${escape(f.label)}: ${escape(v)} · Edit</summary>${content}</details>`:content;};
 const marketing=formConfig.consent.marketing,ack=formConfig.consent.acknowledgement;
 return `<section aria-labelledby="save-title"><h2 id="save-title">Save this choice</h2><p class="small">Save your choice to your enquiry. Saving does not book or pay.</p><div class="detail" data-leadscore-private data-clarity-mask="true"><dl class="profile-grid"><dt>Email · Verified</dt><dd>${escape(state.profile.email)}</dd></dl><button type="button" class="text-button" data-go="identify">Not your email? Start with your email to get a fresh private link.</button></div><form id="save-choice-form" data-leadscore-private data-clarity-mask="true"><fieldset class="save-fields"><legend>Your details</legend>${fields.map(input).join('')}</fieldset>${marketing.text?`<label class="check"><input type="checkbox" name="marketing"><span>${escape(marketing.text)}<small> Optional. Not needed to save your choice.</small></span></label>`:''}${ack?`<label class="check"><input type="checkbox" name="acknowledgement" ${ack.required?'required':''}><span>${escape(ack.text)}</span></label>`:''}<button class="primary" type="submit">Save my choice</button><div id="save-status" role="status" aria-live="polite"></div></form></section>`;
}
const incoming = new URL(location.href);
let accessToken = new URLSearchParams(incoming.hash.slice(1)).get('access');
const publicQueryKeys=new Set(['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','ad_id','angle']);
const privateVisit=!!incoming.hash||Array.from(incoming.searchParams.keys()).some(key=>!publicQueryKeys.has(key))||/\/(?:private|prefill|profile)(?:\/|$)/.test(incoming.pathname);
const wizardAttribution=safeWizardAttribution(incoming);
if(privateVisit)suspendPrivateAnalytics();
// Clean credentials and contact data before any API call, image, tracker or navigation can reuse them.
// A raw ?email= is discarded and never used to look anything up.
if (incoming.search || incoming.hash) {
  incoming.search = ''; incoming.hash = '';
  history.replaceState(null, '', incoming.pathname + incoming.search);
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label = (rows, id) => rows.find(([key]) => key === id)?.[1] || 'Not yet provided';
const api = async (action, body) => {
  const response = await fetch(`${identityBase}/${action}`, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(15000), credentials: 'omit', cache: 'no-store', redirect: 'error' });
  const result = await response.json();
  if (!response.ok) { const error = new Error(result.error || 'We cannot load your details right now.'); error.status = response.status; throw error; }
  return result;
};
function resetIdentity() { orgDraft={};orgPending=null;orgReceipt=null;orgStep=0;state.session='';state.profile=null;state.verified=false;state.sizeSource=null;state.employees=null;state.segment=null;state.priority=null;state.selected=null;state.track='';state.course=false;formConfig=null;savePayload=null;savedReceipt=null; }
function go(step, remember = true, error = '') {
  // "Loading your saved details" is transient; Back never returns to it.
  if (remember && state.step !== step && state.step !== 'checking') historySteps.push(state.step);
  if(['identify','checking','emailSent','identityError','ambiguous'].includes(step)||state.verified)suspendPrivateAnalytics();
  analyticsStep(step);
  state.step = step; state.error = error; render();
  screen.querySelector('h1,h2')?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
// Four big size cards, then a separate full-width choice for organization staff. A tap goes straight to the matching offers.
function sizeCards() {
  const current=id=>id==='organization'?org():!org()&&state.employees===id;
  const card=([id,title,sub],cls='')=>`<button type="button" class="size-card${cls}${current(id)?' current':''}" data-size="${id}"><strong>${title}</strong><small>${sub}</small>${current(id)?'<span class="sr-only"> · your current answer</span>':''}</button>`;
  return `<div class="size-grid" role="group" aria-labelledby="size-question">${SIZES.map(row=>card(row)).join('')}</div>${card(ORGANIZATION,' org-card')}<button type="button" class="free-choice" data-free><strong>I'm interested in some free resources</strong><small>Practical guides you can use straight away. No purchase or sign-up.</small></button>`;
}
const learnLine='<p class="courses-line">Prefer to learn AI on your own? <button class="text-button" type="button" data-entry="learn">See courses and free guides</button></p>';
// One plain sentence about how (or whether) this can be booked. The charge basis is item.billing, shown after the price.
function cardStatus(item) {
  // Group: open as soon as any one choice is bookable; each choice's details page shows its own state.
  const link=item.id==='group'?TRACKS.map(([key])=>bookable('group',key)).find(Boolean):bookable(item.id);
  if(link&&item.id==='group') return 'Choose your training to read the terms and book.';
  if(link) return item.id===SEMINAR.id ? 'Pay on Stripe after reading the seat terms.' : `Book on ${link.provider} after reading the terms.`;
  return item.id==='solo' ? 'Sign-up is not open yet.' : 'Booking is not open yet.';
}
// Approved button labels (no "terms" in labels; the full terms still show on the details page before any payment).
const ctaLabel = item => bookable(item.id) ? (item.id===SEMINAR.id ? 'Reserve Seat' : 'See Details and Book Now') : 'See full details';
// Final provider button on the details page: appointments pick a time slot; the seat and the fixed-date group cohort do not.
const providerLabel = id => id===SEMINAR.id ? 'Reserve Seat' : id==='group' ? 'Book and Pay Now' : 'Select Your Time Slot and Pay';
// Group training leads with the benefit; the software name is secondary. Each choice opens review (data-review="group:<track>").
// Operations and Sales are large red-bordered panels; Both is an explicit third choice. Each shows its own flat price after its explanation.
const trackChoices = item => `<div class="track-choices" role="group" aria-labelledby="offer-${item.id}-choose"><p class="track-prompt" id="offer-${item.id}-choose">What would help your business most?</p>${TRACKS.map(([key,name,text,software,price])=>`<button class="track-choice${key==='both'?'':' track-main'}" type="button" data-review="group:${key}"><strong>${name} →</strong><span>${text}</span><small>Software: ${software}</small><b class="track-price">${price}</b></button>`).join('')}</div>`;
// Reading order: red descriptive title, what is included, then price and charge basis, status and one action.
// The price never shares the title row. role 'lead' = the main recommendation; 'secondary' = quieter outline action.
// Full terms live on review, always before any provider link.
function offerCard(item, role='') {
  const id=item.id,title=escape(item.title);
  const action=id==='free'?`<button class="${role==='lead'?'card-cta':'card-cta secondary'}" type="button" data-free>Explore free resources</button>`
    :id==='group'?''
    :`<button class="${role==='secondary'?'card-cta secondary':'card-cta'}" type="button" data-review="${id}" aria-label="${ctaLabel(item)}: ${title}">${ctaLabel(item)}</button>`;
  // Group: the benefit choices come straight after the explanation, so they are reachable first; the price follows them.
  return `<article class="offer-card${role?' '+role:''}" aria-labelledby="offer-${id}-title"><h3 class="offer-title" id="offer-${id}-title">${title}</h3><p class="offer-lede">${item.lede}</p>${id==='group'?trackChoices(item):''}<div class="card-foot${action?'':' no-action'}"><div><p class="price-line">${item.price&&id!=='group'?`<span class="price">${item.price}</span> `:''}<span class="cadence">${item.billing}</span></p>${item.cardNote?`<p class="card-note">${item.cardNote}</p>`:''}${id==='free'?'':`<p class="card-status">${cardStatus(item)}</p>`}</div>${action}</div></article>`;
}
// Seminar: the paid-seat block appears on the 10+ path only; every other path gets one quiet free-attendance line.
// The paid seat card disappears at the confirmed noon cutoff; the whole section after the seminar ends.
function seminarSection() {
  const now=Date.now();
  if(now>=SEMINAR_ENDS_AT) return '';
  const when='Tuesday, October 27, 2026 · 7–9 p.m. Antigua time (UTC−4) · Azure Conference Hall, Trade Winds Hotel';
  if(!seatOffered(state.employees)) return `<p class="seminar-quiet"><strong>Free seminar:</strong> ${when}. Free to attend, first come, subject to space.</p>`;
  const open=seatSalesOpen(now);
  return `<section class="seminar-option" aria-labelledby="seminar-title"><p class="eyebrow">SEMINAR · OCTOBER 27</p><h2 id="seminar-title">Trade Winds Hotel Seminar, October 27th.</h2><p class="seminar-when">${when}</p><p class="seminar-free">The seminar is free to attend, first come, first served, subject to space.${open&&bookable(SEMINAR.id)?' Applications exceed available seating. Reserve a guaranteed seat for US$249.':open?' Paid seat booking is not open on this page right now.':''}</p>${open?offerCard(currentOffer(SEMINAR.id)):'<p class="small">Paid seat reservations closed at noon on October 27, Antigua time. Free attendance is still first come, subject to space.</p>'}</section>`;
}
// What it is and what is included come first; then the price; then what is not included and the booking terms.
// Unsettled facts (item.pending) are guards only and are never listed here.
function offerDetail(item) {
  const list=rows=>`<ul>${rows.map(s=>`<li>${s}</li>`).join('')}</ul>`;
  // item arrives already priced for the chosen track; an offer with no set price shows only its billing sentence.
  const price=`<p class="detail-price">${item.price?`<span class="price">${item.price}</span>`:''}<span class="billing">${item.billing}</span></p>`;
  return `<div class="detail"><h3 class="detail-title">${item.title}</h3><p>${item.summary}</p><h4 class="detail-sub">What is included</h4>${list(item.included)}${price}${item.excluded.length?`<h4 class="detail-sub">What is not included</h4>${list(item.excluded)}`:''}${item.terms?.length?`<h4 class="detail-sub">Before you book</h4>${list(item.terms)}`:''}</div>`;
}
function organizationScreen(){
 const privateAttrs='data-leadscore-private data-clarity-mask="true"';
 if(orgReceipt)return `<section ${privateAttrs}><h1 id="org-saved" tabindex="-1">Your request is saved.</h1><p>Reference: ${escape(orgReceipt.id)}</p><p>It still needs to reach our records and be reviewed by our team. If it's a good fit, we'll be in touch by email about a discovery call.</p><p>Nothing has been booked or paid, and no one else has been contacted.</p></section>`;
 const profile=state.verified?state.profile||{}:{};
 if(!Object.hasOwn(orgDraft,'company_name')&&profile.company)orgDraft.company_name=profile.company;
 if(!Object.hasOwn(orgDraft,'role')&&profile.role)orgDraft.role=profile.role;
 const ranges=[[0,2],[2,4],[4,8]],titles=['About you and your organization','What would you like to improve?','Who would be involved, and when?'];
 const field=([id,label,help,limit])=>{const value=orgDraft[id]||'',attr=`id="org-${id}" name="${id}" required ${orgPending?'disabled':''}`;let control=Array.isArray(limit)?`<select ${attr}><option value="">Choose one</option>${limit.map(o=>`<option ${value===o?'selected':''}>${escape(o)}</option>`).join('')}</select>`:id==='company_name'||id==='role'?`<input ${attr} type="text" autocomplete="${id==='company_name'?'organization':'organization-title'}" maxlength="${limit}" value="${escape(value)}">`:`<textarea ${attr} rows="${id==='org_stakeholders'?2:3}" maxlength="${limit}">${escape(value)}</textarea>`;const content=`<label class="field" for="org-${id}"><span>${escape(label)}</span>${help?`<small>${escape(help)}</small>`:''}${control}</label>`;return orgStep===0&&value&&profile[id==='company_name'?'company':'role']?`<details><summary>${escape(label)}: ${escape(value)} · Edit</summary>${content}</details>`:content;};
 const contact=orgStep===2&&(!state.verified||!profile.name)?`<h3>Your contact details</h3>${!state.verified||!profile.name?`<label class="field"><span>Your name</span><small>So our team knows who to reply to.</small><input name="full_name" type="text" autocomplete="name" maxlength="100" value="${escape(orgDraft.full_name||'')}" required ${orgPending?'disabled':''}></label>`:''}${!state.verified?`<label class="field"><span>Your email</span><small>We'll reply to this address about your request.</small><input name="email" type="email" autocomplete="email" maxlength="254" value="${escape(orgDraft.email||'')}" required ${orgPending?'disabled':''}></label>`:''}<p class="small">Use your own details only.</p>`:'';
 const ready=identityConfigured&&organizationReady(formConfig),ack=formConfig?.consent?.acknowledgement;
 const send=orgStep===2?`${contact}${ack?`<label class="check"><input name="acknowledgement" type="checkbox" ${ack.required?'required':''} ${orgDraft.acknowledgement?'checked':''} ${orgPending?'disabled':''}><span>${escape(ack.text)}</span></label>`:''}${ready?`<button class="primary" type="submit" ${orgPending?.sending?'disabled':''}>${orgPending?.sending?'Sending…':orgPending?'Try sending again':'Send my request'}</button><p class="small">This saves your request for our team to review. It doesn't book a call or take payment, and we won't contact anyone else at your organization.</p>`:`<div class="notice"><strong>Requests can't be sent from this page yet</strong><p>Nothing has been sent or saved.</p></div><button class="primary" type="button" disabled>Sending isn't available yet</button>`}`:'<button class="primary" type="submit">Continue</button>';
 return `<p class="eyebrow">I WORK FOR AN ORGANIZATION</p><h1 tabindex="-1">Bring practical AI and business tools to your organization</h1><p>Answer a few short questions. If it's a good fit, our team will be in touch to arrange a discovery call. Nothing is booked automatically.</p><section ${privateAttrs}><p class="org-step" aria-live="polite">Step ${orgStep+1} of 3</p><h2 tabindex="-1">${titles[orgStep]}</h2>${state.verified&&orgStep===0?`<div class="detail"><dl class="profile-grid"><dt>Name</dt><dd>${escape(profile.name||'Not provided')}</dd><dt>Email · Verified</dt><dd>${escape(profile.email)}</dd></dl><button class="text-button" data-go="identify">Not you? Start with your email to get a fresh private link.</button><p class="small">Leaving this page clears your answers.</p></div>`:''}<form id="organization-form" class="org-form" ${privateAttrs} ${orgPending?'aria-busy="true"':''}><div id="org-error" class="error" role="alert" ${orgError?'':'hidden'}>${escape(orgError)}</div>${ORGANIZATION_QUESTIONS.slice(...ranges[orgStep]).map(field).join('')}${send}${orgStep?'<button class="secondary" type="button" data-org-back>Back</button>':''}<p class="small">Your answers stay on this page only while it's open. If you leave or refresh, they're cleared. Copy your notes first if you need to step away.</p><button class="text-button" type="button" data-org-clear ${orgPending?'disabled':''}>Clear my answers</button></form></section>`;
}
const helpFootnote = '<p class="small help-footnote">Already paid somewhere else? Please do not pay again. Use the contact details on your receipt and we will help. If a payment is still being checked, it must be sorted out before any new charge.</p>';
function render() {
  // Back can land on a review whose selection was reset (for example after "Not your email?" cleared it).
  // Never render a blank review: show the offers, or the size question if no size is chosen yet.
  if(state.step==='review'&&!offer(state.selected))state.step=state.employees||org()?'offers':state.verified?'employees':'entry';
  if(state.verified)suspendPrivateAnalytics();
  $('#back').hidden = !historySteps.length;$('#back').disabled=!!savePayload||!!orgPending;
  // The first screen's step label repeats the question below it; drop the row unless Back is needed.
  $('.stepbar').hidden = state.step==='entry' && !historySteps.length;
  $('#progress').textContent = ({ entry:'A practical next step', learn:'Learn AI', intro: 'A practical next step', identify: 'Continue with your email', checking: 'Loading your saved details', emailSent: 'Check your inbox', employees: 'Your business', offers: 'Your options', review: 'Review your choice', identityError: 'Your personal link', ambiguous: 'A detail needs checking' })[state.step];
  const heading = (eyebrow,title,copy='',id='') => `<p class="eyebrow">${eyebrow}</p><h1 tabindex="-1"${id?` id="${id}"`:''}>${title}</h1>${copy ? `<p class="intro-copy">${copy}</p>` : ''}`;
  const sizeQuestion = '<h2 id="size-question" class="size-question">How many employees are in your business?</h2>';
  // One short question is the whole first screen: no portrait, eyebrow or promotional headline above the cards.
  const sizeTitle = '<h1 tabindex="-1" id="size-question" class="size-title">How many employees are in your business?</h1>';
  // QR / anonymous entry. The email option only appears when the verified email adapter is connected,
  // and it only ever sends a private link; typing an email never reveals or skips anything.
  if(state.step==='entry')screen.innerHTML=(state.verified?`<div class="private-head" data-leadscore-private data-clarity-mask="true"><p>${state.profile?.name?`Welcome back, ${escape(state.profile.name)}.`:'Welcome back.'}</p></div>`:'')+'<h1 tabindex="-1" class="size-title">How would you like to start?</h1>'+`<div class="entry-grid"><button type="button" class="entry-card ${state.path==='work'?'current':''}" data-entry="work"><strong>Work with Dwain</strong><small>Consultations, training and support matched to your business.</small></button><button type="button" class="entry-card ${state.path==='learn'?'current':''}" data-entry="learn"><strong>Learn AI on my own</strong><small>Paid courses and free guides. No questions about your business.</small></button></div>`+(!state.verified&&identityConfigured?'<div class="known-visitor"><p><strong>Shared your details before?</strong> We email you a private link first.</p><button class="secondary" type="button" data-go="identify">Continue with my email</button></div>':'');
  if(state.step==='learn')screen.innerHTML=heading('LEARN AI ON YOUR OWN','Learn practical AI.','Two paid courses, Part 1 and Part 2, each with a one-time price, and free guides you can use today.')+`<div class="offer-cards course-cards">${[['intro','Introduction to AI: Practical First Steps for Your Business','Part 1 · For complete beginners.','Start with the basics and use AI on everyday business work. Afterwards, you can continue to Part 2, or get SnapSuite onboarding and guided training for your operations through Work with Dwain. Proposed outline: 6 lessons, about 2 hours in total (estimate).','US$49'],['org','AI in Your Organization: Build Your First AI Team','Part 2 · Continues from Part 1.','Builds on the basics, with a brief refresher, to set up your first AI team. No software subscription is needed. New to AI? Start with Part 1. Buying it first isn’t required. Proposed outline: 8 modules, about 4 hours in total (estimate).','US$97']].map(([id,title,audience,lede,price])=>`<article class="offer-card"><h2 class="offer-title">${title}</h2><p class="course-audience">${audience}</p><p class="offer-lede">${lede}</p><div class="card-foot"><div><p class="price-line"><span class="price">${price}</span> <span class="cadence">One-time price, including all taxes and processing fees. No monthly charge.</span></p><p class="card-status">Sign-up is not open yet.</p></div><a class="card-cta secondary" href="./courses.html" rel="noreferrer" data-course-details="${id}">See course details</a></div></article>`).join('')}</div><p class="small">These are separate offers. They are not the US$49-a-month Business Essentials Plan, its optional US$97 SnapSuite course, or the US$249 group training.</p><section class="courses-free"><h2>Start free</h2><a class="download" href="./resources/job-to-invoice.txt" download data-free-download="checklist"><strong>Job-to-invoice checklist</strong><span>Text guide · Download ↓</span></a><a class="download" href="./resources/practical-ai.txt" download data-free-download="ai_workflow"><strong>A practical AI workflow</strong><span>Text guide · Download ↓</span></a><p class="small">A free DIY course, social content and a Friday live Q&A are coming. Their links are not ready yet.</p></section><button type="button" class="text-button" data-entry="work">Prefer to work with Dwain? See support for your business</button>`;
  if(state.step==='intro')screen.innerHTML=sizeTitle+sizeCards()+learnLine;
  if(state.step === 'identify') screen.innerHTML = heading('LET’S PICK UP WHERE YOU LEFT OFF', 'Continue with your email.', 'Use the email you gave us before. We will send a private link to continue.') + `<form id="identify-form"><label class="field"><span>Your email address</span><input name="email" type="email" autocomplete="email" value="${escape(state.email)}" required maxlength="254"></label><p class="small">We verify the email before showing any saved business information.</p><button class="primary" type="submit">Send my private link →</button></form>${!identityConfigured?'<div class="notice"><strong>Identity connection is pending</strong><p>This draft cannot send verification emails or load real LeadScore records yet.</p></div>':''}<button class="text-button" type="button" id="explore-anonymously">Explore the offers without looking up my details</button>`;
  if(state.step === 'checking') screen.innerHTML = heading('YOUR PERSONAL LINK', 'Loading your saved details…', 'We are checking your private link.');
  if(state.step === 'emailSent') screen.innerHTML = heading('CONTINUE PRIVATELY', 'Check your inbox.', 'Your link request has been saved. If a link arrives, open it to continue. No saved business details are shown here.') + `<p class="small">Email delivery is separate from saving this request. If nothing arrives, contact the event team before requesting another.</p><button class="secondary" data-go="identify">Use a different email</button>`;
  if(state.step === 'identityError') screen.innerHTML = heading('YOUR PERSONAL LINK', state.error === 'expired' ? 'This private link is unavailable or has expired.' : 'We cannot load your details right now.', state.error === 'expired' ? 'Continue with your email to request a fresh private link.' : 'Your saved information has not been loaded. You can try again or explore the offers without it.') + `${accessToken&&state.error!=='expired'?'<button class="primary" id="retry-identity">Try loading my details again</button>':''}<button class="secondary" data-go="identify">Continue with my email</button><button class="text-button" data-go="employees">Explore the offers</button>`;
  if(state.step === 'ambiguous') screen.innerHTML = heading('A DETAIL NEEDS CHECKING', 'We need to check one detail before continuing.', 'More than one record needs review. None of their details have been displayed. Please ask the event team to help identify the correct record.') + `<button class="text-button" data-go="employees">Explore the offers while this is checked</button>`;
  // Minimal qualification: only when size is unknown, or an anonymous visitor asked to change it.
  if(state.step === 'employees') screen.innerHTML = state.verified
    ? `<div class="private-head" data-leadscore-private data-clarity-mask="true"><h1 tabindex="-1" class="welcome">${state.profile?.name ? `Welcome back, ${escape(state.profile.name)}.` : 'Your email is verified.'}</h1></div>` + sizeQuestion + sizeCards()
    : sizeTitle + sizeCards();
  if(state.step === 'offers') {
    const path=sizePath(state.employees,state.segment),known=knownSize(),p=state.profile;
    const [lead,...secondary]=path.offers.map(id=>id==='free'?FREE:currentOffer(id));
    // An offer shown as a card or as the small "also" line, or free help shown as the quiet line, is not repeated below.
    const shown=[...path.offers,...(path.also?[path.also]:[])];
    const others=[...OFFERS.filter(o=>!shown.includes(o.id)).map(o=>currentOffer(o.id)),...(path.freeAfter||shown.includes('free')?[]:[FREE])];
    const quiet=(path.also?`<p class="also-line">${path.alsoPrompt||'Would one-to-one help suit you better?'} <button class="text-button" type="button" data-review="${path.also}">See the ${escape(offer(path.also).title)}</button></p>`:'')
      +(path.freeAfter?'<p class="free-after"><span>Prefer to start on your own for free?</span> <button class="text-button" type="button" data-free>Explore free resources</button></p>':'');
    const seminar=seminarSection(),seats=seatOffered(state.employees);
    // Compact head: one heading plus one line, so the lead card starts near the top of a phone screen.
    // No change-size control: the stepbar Back returns to the size question. Known verified visitors have no Back here.
    const intro=path.intro?`<p class="path-intro">${path.intro}${path.introCalendly&&bookable('onsite')?' '+path.introCalendly:''}</p>`:'';
    const head=known
      ? `<div class="private-head path-head" data-leadscore-private data-clarity-mask="true"><h1 tabindex="-1">${p?.name ? `Welcome back, ${escape(p.name)}.` : 'Your next step.'}</h1>${p?.company ? `<p class="path-line">Support that fits ${escape(p.company)}.</p>` : ''}</div>${intro}`
      // The h1 names who the page is for (it already states the team size), so no separate "Team:" line repeats it.
      : `<div class="path-head"><h1 tabindex="-1">${path.title}</h1>${intro}</div>`;
    // "path-offers", never "primary": .primary is the red pill button style and would paint the whole wrapper.
    screen.innerHTML = head + `<div class="offer-cards path-offers">${offerCard(lead,'lead')}${secondary.map(item=>offerCard(item,'secondary')).join('')}</div>${quiet}${seats?seminar:''}<details class="more-options"><summary>Explore other options</summary><div class="offer-cards compact">${others.map(item=>offerCard(item)).join('')}</div></details>${seats?'':seminar}${known&&p?.email?`<button class="text-button" type="button" data-go="identify" data-leadscore-private data-clarity-mask="true">Not ${escape(p.email)}? Use a different email</button>`:''}`;
  }
  if(state.step==='offers'&&org()){screen.innerHTML=organizationScreen();$('#progress').textContent='Your introduction request';}
  if(state.step === 'review' && seatClosedNow()) screen.innerHTML = heading('SEMINAR · OCTOBER 27', 'Paid seat reservations have closed.', 'Seat sales closed at noon on October 27, Antigua time. Nothing has been booked or charged on this page. Free attendance remains first come, subject to space.') + `<button class="primary" type="button" data-go="offers" ${savePayload?'disabled':''}>See my other options</button>${helpFootnote}`;
  else if(state.step === 'review') {
    const item = priced(currentOffer(state.selected),state.track), link = bookable(state.selected,state.track), t = state.selected==='group' ? track(state.track) : null;
    const solo = state.selected==='solo';
    // Order: what you get, price, terms (all inside offerDetail), then how to book. The provider link always comes last.
    // The closed-state status is shown only when there is no bookable link, so it never contradicts an open booking.
    const status = item.status || 'Booking is not open on this page yet.';
    screen.innerHTML = heading('REVIEW YOUR CHOICE', 'Everything you need to know before you book.') + `${knownSize()?'':`<div class="summary-line"><span>${org()?'You work for an organization':'Team size: '+label(EMPLOYEES,state.employees)}</span></div>`}${t?`<p class="track-line">Your choice: <strong>${t[1]}</strong>${t[3]?` · Software: ${t[3]}`:''}</p>`:''}${offerDetail(item)}${solo?`<label class="check"><input type="checkbox" id="course" ${state.course?'checked':''}><span>Add the optional SnapSuite business course (US$97, one-time)<br><small>A guide to running your business with SnapSuite. It covers the challenges of running and growing a business, and shows how each one maps to what SnapSuite does. Course details are sent to you by email; when you will receive them will be confirmed before you can pay. With the course, your first payment is US$146, then US$49 a month. It is not added unless you tick this box. It is separate from the US$49 introductory AI course.</small></span></label><p id="course-status" class="small">${state.course?'Course added on this page only: first payment US$146, then US$49 a month. Nothing has been charged and no course email has been sent.':'Course not added.'}</p><p class="small">Website and email add-ons may be offered later. Their scope, limits and prices have not been set.</p>`:''}${saveSection()}${link?`<div class="notice" role="status"><strong>Book and pay on ${link.provider}</strong><p>Nothing is booked or paid on this page. You enter your card details on ${link.provider}’s secure page. After you pay, ${link.provider} shows your result: keep that confirmation. If a result is still pending, please do not pay again.</p></div><a class="primary" href="${link.url}" rel="noreferrer" data-provider="${state.selected}">${providerLabel(state.selected)}</a>`:`<div class="notice" role="status"><strong>${solo?'Sign-up is not open yet':'Booking is not open yet'}</strong><p>${status}</p></div><button class="primary" type="button" disabled aria-disabled="true" aria-describedby="checkout-help">${solo?'Sign-up is not open yet':'Booking and payment are not open yet'}</button><p id="checkout-help" class="small">Nothing has been booked or charged. Please do not enter card details on this page.</p>`}<button class="secondary" data-go="offers" ${savePayload?'disabled':''}>Back to my options</button>${helpFootnote}`;
  }
  // The static native page is not identity-connected, so it never claims details can be brought along.
  // Name only the providers whose links are actually live.
  $('#companion-copy').textContent=state.step==='entry'?'Work with Dwain, or learn AI on your own.':state.step==='learn'?'Each course has one flat, one-time price. Nothing is charged on this page.':org()?"Tell us about your organization. Nothing is booked or paid on this page.":state.step==='review'&&!bookable(state.selected,state.track)?'Choose your support. Nothing is booked or paid on this page.':nativeLive&&!identityConfigured?(nativeLink('onsite')&&nativeLink('seminar_seat')?'Choose your support. Booking and payment take place with Stripe and Calendly.':nativeLink('onsite')?'Choose your support. Booking and payment for the onsite consultation take place with Calendly.':'Choose your support. Seminar seat payment takes place with Stripe.'):state.verified?'Your options are matched to your business. Nothing is booked or paid until you choose.':identityConfigured?'Already shared your details? Continue with your email.':'Choose your team size to see the support that fits.';
  $('#summary').innerHTML = state.step==='learn'?'':[(state.employees||org()) && `<p><strong>${org()?'You':'Your team'}</strong><br>${audienceLabel()}</p>`,state.selected&&!seatClosedNow()&&`<p><strong>Your choice</strong><br>${escape(currentOffer(state.selected).title)}</p>`].filter(Boolean).join('');
  screen.querySelectorAll('[data-entry]').forEach(button=>button.addEventListener('click',()=>choose(state.path&&state.path!==button.dataset.entry?'path_switch_'+button.dataset.entry:'entry_'+button.dataset.entry,()=>{state.path=button.dataset.entry;go(state.path==='learn'?'learn':workStep());})));
  screen.querySelectorAll('[data-course-details]').forEach(link=>link.addEventListener('click',event=>followCourse(event,'course_details_'+link.dataset.courseDetails)));
  screen.querySelectorAll('[data-free-download]').forEach(link=>link.addEventListener('click',event=>followChoice(event,'free_download_'+link.dataset.freeDownload)));
  screen.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>{if(['identify','checking','emailSent','identityError','ambiguous'].includes(button.dataset.go)){suspendPrivateAnalytics();go(button.dataset.go);return;}void choose('explore_options',()=>go(button.dataset.go));}));
  screen.querySelectorAll('[data-free]').forEach(button=>button.addEventListener('click',openFree));
  screen.querySelectorAll('[data-size]').forEach(button=>button.addEventListener('click',async()=>{
    if(choiceBusy)return;choiceBusy=true;try{await recordChoice('size_'+button.dataset.size);
    const isOrg=button.dataset.size==='organization',employees=isOrg?null:button.dataset.size;
    if(state.employees!==employees||org()!==isOrg){state.selected=null;state.track='';state.course=false;}
    state.employees=employees;state.segment=isOrg?'organization':null;state.sizeSource='chosen';if(isOrg){button.disabled=true;await loadPublishedForm();}go('offers');}finally{choiceBusy=false;}
  }));
  screen.querySelectorAll('[data-review]').forEach(button=>button.addEventListener('click',async()=>{
    if(choiceBusy)return;choiceBusy=true;try{const [id,track='']=button.dataset.review.split(':');await recordChoice(track?'group_'+track:'offer_'+id);
    if(id===SEMINAR.id&&!seatSalesOpen()){render();choiceBusy=false;return;}
    if(state.selected!==id||state.track!==track)state.course=false;
    state.selected=id;state.track=track;button.disabled=true;
    await loadPublishedForm();go('review');}finally{choiceBusy=false;}
  }));
  screen.querySelectorAll('a[data-provider]').forEach(link=>link.addEventListener('click',event=>followChoice(event,link.hostname==='buy.stripe.com'?'outbound_stripe':'outbound_calendly')));
  // A page left open past the cutoff must not hand off to Stripe from a stale render.
  screen.querySelectorAll('[data-provider="seminar_seat"]').forEach(link=>link.addEventListener('click',event=>{if(!seatSalesOpen()){event.preventDefault();render();screen.querySelector('h1')?.focus();}}));
  $('#explore-anonymously')?.addEventListener('click',()=>{resetIdentity();go('employees');});
  $('#retry-identity')?.addEventListener('click',redeem);
  $('#course')?.addEventListener('change',e=>{void recordChoice(e.target.checked?'solo_course_added':'solo_course_removed');state.course=e.target.checked;$('#course-status').textContent=state.course?'Course added on this page only: first payment US$146, then US$49 a month. Nothing has been charged and no course email has been sent.':'Course not added.';});
  $('#organization-form')?.addEventListener('input',event=>{const input=event.target;if(input.name)orgDraft[input.name]=input.type==='checkbox'?input.checked:input.value;input.setCustomValidity('');input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');document.querySelector('#org-contact-guard')?.remove();});
  $('[data-org-back]')?.addEventListener('click',()=>{if(!orgPending){void recordChoice('org_back');orgStep--;orgError='';render();focusOrgHeading();}});
  $('[data-org-clear]')?.addEventListener('click',()=>{if(!orgPending){void recordChoice('org_clear');orgDraft={};orgStep=0;orgError='';render();}});
  $('#organization-form')?.addEventListener('submit',async event=>{
    event.preventDefault();if(orgActionBusy||orgPending?.sending)return;orgActionBusy=true;try{const form=event.target;
    for(const field of form.querySelectorAll('input,select,textarea')){if(field.name)orgDraft[field.name]=field.type==='checkbox'?field.checked:field.value;}
    for(const field of form.querySelectorAll('input[type=text],textarea')){if(organizationContactLike(field.value)){const message=['org_challenge','org_intro_reason'].includes(field.name)?'This looks like an email address or phone number. Please leave contact details out.':'This looks like an email address or phone number. Please describe the role instead.';field.setCustomValidity(message);document.querySelector('#org-contact-guard')?.remove();field.insertAdjacentHTML('afterend',`<span id="org-contact-guard" class="error" role="alert">${message}</span>`);field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby','org-contact-guard');field.focus();scheduleReveal(document.querySelector('#org-contact-guard'));void recordChoice('org_invalid');return;}}
    if(!form.reportValidity())return;
    if(orgStep<2){orgStep++;await recordChoice('org_step_'+(orgStep+1));orgError='';render();focusOrgHeading();return;}
    if(!organizationReady(formConfig)||!identityConfigured)return;
    if(!orgPending){orgPending={payload:{schemaVersion:1,revision:formConfig.revision,submissionId:crypto.randomUUID(),answers:organizationAnswers(formConfig,orgDraft,state.profile,state.verified),consent:{marketing:false,acknowledgement:orgDraft.acknowledgement===true,...(formConfig.consent.acknowledgement?{acknowledgementVersion:formConfig.consent.acknowledgement.version}:{})},website:'',attribution:{latest:wizardAttribution}},sending:false};}
    orgPending.sending=true;await recordChoice('org_submit');orgError='';render();
    try{const response=await fetch(formBase()+'/organization',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...(state.verified?{session:state.session}:{}),submission:orgPending.payload}),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok||result.resources?.enquiryStatus!=='saved'||!result.resources.id)throw Error('Unconfirmed receipt');void recordChoice('org_saved');orgReceipt=result.resources;orgDraft={};orgPending=null;render();$('#org-saved')?.focus();}
    catch{void recordChoice('org_error');orgPending.sending=false;orgError="We couldn't confirm your request was saved. Your answers are still here while this page is open. Please try again.";render();$('#org-error')?.focus();}
    }finally{orgActionBusy=false;}
  });
  $('#save-choice-form')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.target,button=form.querySelector('button[type=submit]'),status=$('#save-status');
    if(!savePayload){savePayloadChoice=choiceKey();const values=new FormData(form);savePayload={schemaVersion:1,revision:formConfig.revision,submissionId:crypto.randomUUID(),answers:publishedAnswers(formConfig,state.profile,state,values),consent:{marketing:values.get('marketing')==='on',acknowledgement:values.get('acknowledgement')==='on',...(formConfig.consent.acknowledgement?{acknowledgementVersion:formConfig.consent.acknowledgement.version}:{})},website:''};}
    button.disabled=true;button.textContent='Saving…';form.setAttribute('aria-busy','true');form.querySelectorAll('input,select,textarea').forEach(input=>input.disabled=true);$('#back').disabled=true;screen.querySelectorAll('[data-go]').forEach(control=>control.disabled=true);
    try{const result=await api('submit',{session:state.session,submission:savePayload});if(result.resources?.enquiryStatus!=='saved'||!result.resources.id)throw Error('Unconfirmed receipt');savedReceipt=result.resources;savedChoice=savePayloadChoice;savePayload=null;render();$('#saved-heading')?.focus();}
    catch(error){status.className='error';status.setAttribute('role','alert');status.textContent=error.status===403?'Your private session is unavailable or has expired. Your result may already have been saved. Open a fresh private link and retry the same details to recover the saved result.':"We could not confirm your choice was saved. Your details are still here. Please try again.";button.disabled=false;button.textContent='Try saving again';form.removeAttribute('aria-busy');if(error.status===403){const restart=document.createElement('button');restart.type='button';restart.className='text-button';restart.textContent='Continue with my email';restart.addEventListener('click',()=>{savePayload=null;go('identify');});status.append(document.createElement('br'),restart);}}
  });
  $('#identify-form')?.addEventListener('submit',async e=>{
    e.preventDefault();resetIdentity();state.email=new FormData(e.target).get('email').trim();const button=e.target.querySelector('button');button.disabled=true;
    try { await api('request',{email:state.email,requestId:crypto.randomUUID()});go('emailSent'); }
    catch(error) { const prior=$('#identity-request-error');prior?.remove();const message=error.status===429?'Please wait before requesting another private link.':'Your verification request could not be confirmed. Check your inbox before requesting another link, or explore the offers below.';e.target.insertAdjacentHTML('afterend',`<div id="identity-request-error" class="error" role="alert">${message}</div>`);button.disabled=false; }
  });
}
const persistedLinks=new WeakSet();
async function followChoice(event,code){
 const link=event.currentTarget;if(persistedLinks.has(link)){persistedLinks.delete(link);return;}event.preventDefault();if(choiceBusy)return;
 if(link.dataset.provider==='seminar_seat'&&!seatSalesOpen()){render();return;}
 // Reserve the user's requested new tab synchronously, before asynchronous local persistence.
 const popup=link.target==='_blank'?window.open('about:blank','_blank'):null;if(popup)popup.opener=null;
 try{await choose(code,()=>{if(link.dataset.provider==='seminar_seat'&&!seatSalesOpen()){popup?.close();render();return;}if(popup)popup.location.replace(link.href);else{persistedLinks.add(link);link.click();}});}catch{popup?.close();}
}
// Course links stay in this tab. Only a finite public step is retained for browser Back.
async function followCourse(event,code){
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();if(choiceBusy||savePayload||orgPending)return;
 const href=event.currentTarget.href;
 // No profile, contact details, answers, access token or session is persisted.
 history.replaceState({antiguaStep:state.step==='learn'?'learn':'entry'},'',location.pathname);
 await choose(code,()=>location.assign(href));
}
function openFree(event){if($('#free-dialog').open)return;return choose('free_open',()=>{freeTrigger=event?.currentTarget;$('#free-dialog').showModal();$('#close-free').focus();});}
document.querySelectorAll('[data-free]').forEach(button=>button.addEventListener('click',openFree));
$('#close-free').addEventListener('click',()=>choose('free_close',()=>$('#free-dialog').close()));
$('#free-dialog').addEventListener('cancel',event=>{event.preventDefault();void choose('free_close',()=>$('#free-dialog').close());});
$('#free-dialog').addEventListener('close',()=>freeTrigger?.isConnected&&freeTrigger.focus());
$('#back').addEventListener('click',()=>choose('nav_back',()=>go(historySteps.pop()||'entry',false)));
document.querySelectorAll('#free-dialog .download').forEach((link,index)=>link.addEventListener('click',event=>followChoice(event,index===0?'free_download_checklist':'free_download_ai_workflow')));
document.querySelectorAll('.courses-link').forEach(link=>link.addEventListener('click',event=>followCourse(event,link.closest('dialog')?'courses_link_dialog':'courses_link_sidebar')));
// Home returns to the entrance; verified profile and organization draft stay in memory.
$('.brand').addEventListener('click',event=>{event.preventDefault();if(!savePayload&&!orgPending)void choose('nav_home',()=>go('entry'));});
// Event facts only: no readiness or availability claim (each card states its own booking status).
if(nativeLive)$('.review-banner').textContent='ANTIGUA · SEMINAR OCTOBER 27 · CONSULTATIONS OCTOBER 28, 2026';
// Re-render once when the seat cutoff passes on an open page (timer, or on return to a sleeping tab).
let seatCutoffRendered=!seatSalesOpen();
function refreshSeatCutoff(){if(seatCutoffRendered||seatSalesOpen())return;seatCutoffRendered=true;if(!savePayload&&(state.step==='offers'||state.step==='review'&&state.selected===SEMINAR.id))render();}
const untilSeatCutoff=SEAT_SALES_CLOSE_AT-Date.now();
if(untilSeatCutoff>0&&untilSeatCutoff<2147483647)setTimeout(refreshSeatCutoff,untilSeatCutoff+50);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshSeatCutoff();});
if(!accessToken&&!privateVisit&&history.state?.antiguaStep==='learn'){state.path='learn';state.step='learn';historySteps=['entry'];}
render();
void initializeAnalytics({configured:identityConfigured,base:formBase(),privateVisit,attribution:wizardAttribution,getStep:()=>state.step});
const exchangeRequestId=crypto.randomUUID();
async function redeem() {
  go('checking');
  try {
    const result=await api('exchange',{token:accessToken,requestId:exchangeRequestId});accessToken=null;
    if(result.status==='ambiguous') go('ambiguous');
    else {
      state.profile=result.profile;state.session=result.session;state.verified=true;
      // Only an explicit verified band skips the question; nothing is guessed from partial ranges.
      Object.assign(state,profileAnswers(result.profile));state.sizeSource=state.employees?'verified':null;
      historySteps=[];go('entry',false);
    }
  } catch(error) {go('identityError',true,[403,410].includes(error.status)?'expired':'unavailable');}
}
if(accessToken) await redeem();
