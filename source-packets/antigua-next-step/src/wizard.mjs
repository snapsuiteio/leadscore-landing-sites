import { EMPLOYEES, SIZES, OFFERS, SEMINAR, FREE, sizePath, profileAnswers, nextAfterProfile, offer, seatSalesOpen, SEAT_SALES_CLOSE_AT, SEMINAR_ENDS_AT } from './journey.mjs';
import { initialAnswer, choiceField, isEmailField, formReady, publishedAnswers } from './submission.mjs';
import { verifiedProviderLink } from './native-offers.mjs';
import { identityBase, identityConfigured, providerLinks } from './connection.mjs';

const nativeLink=id=>verifiedProviderLink(id,providerLinks);
const nativeLive=!!nativeLink('seminar_seat')||!!nativeLink('onsite');
function currentOffer(id){const item=offer(id);if(id==='onsite'&&nativeLive&&!nativeLink(id))return {...item,pending:['Online booking is not open yet.'],timing:'The US$949 onsite consultation is planned for October 28, with all taxes and fees included, but online booking is not open while we complete a check of our payment account.'};return nativeLink(id)?{...item,pending:[],timing:id==='seminar_seat'?'Five paid places total. Stripe shows whether payment is available; one named seat per payment. Free entry remains first come, subject to space. Paid seats are held until 7:15 p.m. Antigua time. Cancel by October 26, 7 p.m. Antigua time for a refund of the amount paid minus actual processing fees; later cancellations receive no refund. The US$249 already includes fees; an eligible refund deducts only the actual processing fee retained by Stripe.':item.timing}:item;}
const $ = selector => document.querySelector(selector);
const screen = $('#screen');
// sizeSource: 'verified' = band read from a verified profile (never changeable here); 'chosen' = picked on a size card.
const state = { step: 'intro', employees: null, priority: null, selected: null, track: '', course: false, profile: null, email: '', session: '', verified: false, error: '', sizeSource: null };
let historySteps = [], freeTrigger;
let formConfig=null,savePayload=null,savePayloadChoice='',savedReceipt=null,savedChoice='';
const choiceKey=()=>JSON.stringify([state.selected,state.track,state.course,state.employees,state.priority]);
const knownSize=()=>state.verified&&state.sizeSource==='verified';
// Client hiding only. The provider/backend must close the Stripe link itself.
const seatClosedNow=()=>state.selected===SEMINAR.id&&!seatSalesOpen();
const formBase=()=>identityBase.replace(/\/identity$/,'');
async function loadPublishedForm(){
 if(!identityConfigured||!state.verified)return;
 try {const response=await fetch(formBase()+'/config',{credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});const result=await response.json();if(response.ok&&formReady(result.resources))formConfig=result.resources;}catch{/* Missing setup never falls back to a permissive submission. */}
}
function saveSection(){
 if(!identityConfigured||!state.verified||!formReady(formConfig,state))return '';
 if(savedReceipt&&savedChoice===choiceKey())return `<section class="detail" data-leadscore-private><h2 id="saved-heading" tabindex="-1">Your choice is saved.</h2><p>Saved: ${escape(currentOffer(state.selected).title)}${state.track?' · '+escape(state.track):''}${state.course?' · Course requested':''}</p><p>Reference: ${escape(savedReceipt.id)}</p><p>This is not a booking or a payment. Nothing has been charged and no seat or appointment is reserved. ${nativeLink(state.selected)?'Book or pay with '+nativeLink(state.selected).provider+' below.':'Booking and payment are not open yet.'}</p><p class="small">Saved enquiry · CRM delivery pending</p></section>`;
 const fields=formConfig.fields.filter(f=>!isEmailField(f)&&!choiceField(f)).map(field=>({field,value:field.type==='select'&&!field.options?.includes(initialAnswer(field,state.profile,state))?'':initialAnswer(field,state.profile,state)})).sort((a,b)=>Number(!!a.value)-Number(!!b.value));
 const input=({field:f,value:v})=>{const id='save-'+f.id,label=escape(f.label)+(f.required?' (required)':'');const attrs=`id="${escape(id)}" name="${escape(f.id)}" ${f.required?'required':''}`;let control;if(f.type==='select')control=`<select ${attrs}><option value="">Choose one</option>${(f.options||[]).map(o=>`<option ${v===o?'selected':''}>${escape(o)}</option>`).join('')}</select>`;else if(f.type==='textarea')control=`<textarea ${attrs}>${escape(v)}</textarea>`;else control=`<input ${attrs} type="${f.type==='phone'?'tel':f.type==='number'?'number':'text'}" value="${escape(v)}" ${f.type==='phone'?'autocomplete="tel" inputmode="tel"':['company','company_name','business_name'].includes(f.id)?'autocomplete="organization"':'autocomplete="name"'} maxlength="${f.type==='phone'?40:500}">`;const content=`<label class="field" for="${escape(id)}"><span>${label}</span>${control}</label>`;return v?`<details><summary>${escape(f.label)}: ${escape(v)} · Edit</summary>${content}</details>`:content;};
 const marketing=formConfig.consent.marketing,ack=formConfig.consent.acknowledgement;
 return `<section aria-labelledby="save-title"><h2 id="save-title">Save this choice</h2><p class="small">Save your choice to your enquiry. Saving does not book or pay.</p><div class="detail" data-leadscore-private><dl class="profile-grid"><dt>Email · Verified</dt><dd>${escape(state.profile.email)}</dd></dl><button type="button" class="text-button" data-go="identify">Not your email? Start with your email to get a fresh private link.</button></div><form id="save-choice-form" data-leadscore-private><fieldset class="save-fields"><legend>Your details</legend>${fields.map(input).join('')}</fieldset>${marketing.text?`<label class="check"><input type="checkbox" name="marketing"><span>${escape(marketing.text)}<small> Optional. Not needed to save your choice.</small></span></label>`:''}${ack?`<label class="check"><input type="checkbox" name="acknowledgement" ${ack.required?'required':''}><span>${escape(ack.text)}</span></label>`:''}<button class="primary" type="submit">Save my choice</button><div id="save-status" role="status" aria-live="polite"></div></form></section>`;
}
const incoming = new URL(location.href);
let accessToken = new URLSearchParams(incoming.hash.slice(1)).get('access');
// Clean credentials and contact data before any API call, image, tracker or navigation can reuse them.
// A raw ?email= is discarded and never used to look anything up.
if (accessToken || incoming.searchParams.has('email') || incoming.searchParams.has('code')) {
  incoming.searchParams.delete('email'); incoming.searchParams.delete('code'); incoming.hash = '';
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
function resetIdentity() { state.session='';state.profile=null;state.verified=false;state.sizeSource=null;state.employees=null;state.priority=null;state.selected=null;state.track='';state.course=false;formConfig=null;savePayload=null;savedReceipt=null; }
function go(step, remember = true, error = '') {
  // "Loading your saved details" is transient; Back never returns to it.
  if (remember && state.step !== step && state.step !== 'checking') historySteps.push(state.step);
  state.step = step; state.error = error; render();
  screen.querySelector('h1,h2')?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
// Four big size cards. A tap goes straight to the matching offers; "Not sure" stays a small secondary action.
function sizeCards() {
  return `<div class="size-grid" role="group" aria-labelledby="size-question">${SIZES.map(([id,title,sub])=>`<button type="button" class="size-card${state.employees===id?' current':''}" data-size="${id}"><strong>${title}</strong><small>${sub}</small>${state.employees===id?'<span class="sr-only"> · your current answer</span>':''}</button>`).join('')}</div><button type="button" class="text-button not-sure" data-size="unknown">Not sure</button>`;
}
// The recurring charge is spelled out on the card itself, never left to the review screen.
const cadenceLine = item => item.id==='free' ? 'No purchase needed' : `${item.cadence==='Monthly'?'Charged monthly':item.cadence} · taxes and fees included`;
function cardStatus(item) {
  const link=nativeLink(item.id);
  if(link) return item.id===SEMINAR.id ? 'Pay with Stripe after review' : `Book with ${link.provider} after review`;
  if(item.id==='solo') return 'Limited plan · terms pending · no checkout yet';
  return 'Booking not open yet';
}
// Compact card: title and price on one row, charge basis, 2–3 benefits, status and one direct review action.
// Sized so two primary cards fit on a 390×844 phone. Full terms live on review only.
function offerCard(item, featured=false) {
  const id=item.id,title=escape(item.title);
  const cta=id==='free'?`<button class="card-cta secondary" type="button" data-free>Explore free resources</button>`
    :id==='group'?`<div class="track-ctas" role="group" aria-label="Choose a training focus"><button class="card-cta" type="button" data-review="group:operations" aria-label="Review ${title}: Operations · SnapSuite"><span>Operations</span><small>SnapSuite →</small></button><button class="card-cta" type="button" data-review="group:sales" aria-label="Review ${title}: Sales · LeadScore"><span>Sales</span><small>LeadScore →</small></button></div>`
    :`<button class="card-cta" type="button" data-review="${id}" aria-label="Review details: ${title}">Review details →</button>`;
  return `<article class="offer-card${featured?' featured':''}" aria-labelledby="offer-${id}-title"><div class="card-head"><h3 class="offer-title" id="offer-${id}-title">${title}</h3><span class="price">${item.price}</span></div><p class="cadence">${cadenceLine(item)}</p><ul class="benefits">${item.points.slice(0,3).map(s=>`<li>${s}</li>`).join('')}</ul>${id==='free'?'':`<p class="card-status">${featured?'<span class="chip recommended">Suggested for you</span>':''}<span class="chip">${cardStatus(item)}</span></p>`}${cta}</article>`;
}
// Optional attendance, kept separate from support offers. Paid seat card disappears at the confirmed cutoff.
function seminarSection() {
  const now=Date.now();
  if(now>=SEMINAR_ENDS_AT) return '';
  const open=seatSalesOpen(now);
  return `<section class="seminar-option" aria-labelledby="seminar-title"><p class="eyebrow">OPTIONAL · SEMINAR</p><h2 id="seminar-title">Come to the seminar.</h2><p class="seminar-when">Tuesday, October 27, 2026 · 7–9 p.m. Antigua time (UTC−4)</p><ul class="benefits"><li><strong>Free to attend</strong>, subject to space</li>${open?'<li>A paid seat is optional, not required</li>':''}</ul>${open?offerCard(currentOffer(SEMINAR.id)):'<p class="small">Paid seat reservations closed at noon on October 27, Antigua time. Free attendance remains first come, subject to space.</p>'}<details class="loom-note"><summary>Dwain’s seminar update</summary><p><a href="https://www.loom.com/share/de9b7db400b940038c1e58f518ed2aff" target="_blank" rel="noreferrer">Dwain’s Antigua seminar update ↗</a></p><p>Since recording: free attendance remains first come, subject to space. A named reserved seat is optional and separate from US$249 group training. Consultations and dinner do not include a seminar seat.</p></details></section>`;
}
function offerDetail(item) {
  return `<div class="detail"><h3>${item.title}</h3><span class="price">${item.price}</span><span class="billing">${item.billing}</span><p>${item.summary}</p><strong>Included</strong><ul>${item.included.map(s=>`<li>${s}</li>`).join('')}</ul><strong>Not included</strong><ul>${item.excluded.map(s=>`<li>${s}</li>`).join('')}</ul><p class="small">${item.timing}</p>${item.pending.length?`<strong>To be confirmed</strong><ul>${item.pending.map(s=>`<li>${s}</li>`).join('')}</ul>`:''}</div>`;
}
const helpFootnote = '<p class="small help-footnote">If you have already paid elsewhere, do not pay again. Use the contact details on your receipt to ask for help. A payment still being checked must be reconciled before another charge.</p>';
function render() {
  $('#back').hidden = !historySteps.length;$('#back').disabled=!!savePayload;
  // The first screen's step label repeats the question below it; drop the row unless Back is needed.
  $('.stepbar').hidden = state.step==='intro' && !historySteps.length;
  $('#progress').textContent = ({ intro: 'A practical next step', identify: 'Continue with your email', checking: 'Loading your saved details', emailSent: 'Check your inbox', employees: 'Your business', offers: 'Your options', review: 'Review your choice', identityError: 'Your personal link', ambiguous: 'A detail needs checking' })[state.step];
  const heading = (eyebrow,title,copy='',id='') => `<p class="eyebrow">${eyebrow}</p><h1 tabindex="-1"${id?` id="${id}"`:''}>${title}</h1>${copy ? `<p class="intro-copy">${copy}</p>` : ''}`;
  const sizeQuestion = '<h2 id="size-question" class="size-question">How many employees, not counting you?</h2>';
  // One short question is the whole first screen: no portrait, eyebrow or promotional headline above the cards.
  const sizeTitle = '<h1 tabindex="-1" id="size-question" class="size-title">How many employees, not counting you?</h1>';
  // QR / anonymous entry. The email option only appears when the verified email adapter is connected,
  // and it only ever sends a private link; typing an email never reveals or skips anything.
  if(state.step === 'intro') screen.innerHTML = sizeTitle + sizeCards() + (identityConfigured?'<div class="known-visitor"><p><strong>Shared your details before?</strong> We email you a private link first.</p><button class="secondary" type="button" data-go="identify">Continue with my email</button></div>':'');
  if(state.step === 'identify') screen.innerHTML = heading('LET’S PICK UP WHERE YOU LEFT OFF', 'Continue with your email.', 'Use the email you gave us before. We will send a private link to continue.') + `<form id="identify-form"><label class="field"><span>Your email address</span><input name="email" type="email" autocomplete="email" value="${escape(state.email)}" required maxlength="254"></label><p class="small">We verify the email before showing any saved business information.</p><button class="primary" type="submit">Send my private link →</button></form>${!identityConfigured?'<div class="notice"><strong>Identity connection is pending</strong><p>This draft cannot send verification emails or load real LeadScore records yet.</p></div>':''}<button class="text-button" type="button" id="explore-anonymously">Explore the offers without looking up my details</button>`;
  if(state.step === 'checking') screen.innerHTML = heading('YOUR PERSONAL LINK', 'Loading your saved details…', 'We are checking your private link.');
  if(state.step === 'emailSent') screen.innerHTML = heading('CONTINUE PRIVATELY', 'Check your inbox.', 'Your link request has been saved. If a link arrives, open it to continue. No saved business details are shown here.') + `<p class="small">Email delivery is separate from saving this request. If nothing arrives, contact the event team before requesting another.</p><button class="secondary" data-go="identify">Use a different email</button>`;
  if(state.step === 'identityError') screen.innerHTML = heading('YOUR PERSONAL LINK', state.error === 'expired' ? 'This private link is unavailable or has expired.' : 'We cannot load your details right now.', state.error === 'expired' ? 'Continue with your email to request a fresh private link.' : 'Your saved information has not been loaded. You can try again or explore the offers without it.') + `${accessToken&&state.error!=='expired'?'<button class="primary" id="retry-identity">Try loading my details again</button>':''}<button class="secondary" data-go="identify">Continue with my email</button><button class="text-button" data-go="employees">Explore the offers</button>`;
  if(state.step === 'ambiguous') screen.innerHTML = heading('A DETAIL NEEDS CHECKING', 'We need to check one detail before continuing.', 'More than one record needs review. None of their details have been displayed. Please ask the event team to help identify the correct record.') + `<button class="text-button" data-go="employees">Explore the offers while this is checked</button>`;
  // Minimal qualification: only when size is unknown, or an anonymous visitor asked to change it.
  if(state.step === 'employees') screen.innerHTML = state.verified
    ? `<div class="private-head" data-leadscore-private><h1 tabindex="-1" class="welcome">${state.profile?.name ? `Welcome back, ${escape(state.profile.name)}.` : 'Your email is verified.'}</h1></div>` + sizeQuestion + sizeCards()
    : sizeTitle + sizeCards();
  if(state.step === 'offers') {
    const path=sizePath(state.employees),known=knownSize(),p=state.profile;
    const primary=path.offers.map(id=>id==='free'?FREE:currentOffer(id));
    const others=[...OFFERS.filter(o=>!path.offers.includes(o.id)).map(o=>currentOffer(o.id)),...(path.offers.includes('free')?[]:[FREE])];
    // Compact head: one heading plus one line, so both primary cards stay on the first phone screen.
    const head=known
      ? `<div class="private-head path-head" data-leadscore-private><h1 tabindex="-1">${p?.name ? `Welcome back, ${escape(p.name)}.` : 'Your next step.'}</h1>${p?.company ? `<p class="path-line">Support that fits ${escape(p.company)}.</p>` : ''}</div>`
      : `<div class="path-head"><h1 tabindex="-1">${path.title}</h1><p class="path-line"><span>Team: ${label(EMPLOYEES,state.employees)}</span><button class="text-button change-size" type="button" data-go="employees">Change team size</button></p></div>`;
    // "path-offers", never "primary": .primary is the red pill button style and would paint the whole wrapper.
    screen.innerHTML = head + `<div class="offer-cards path-offers">${primary.map(item=>offerCard(item,item.id===path.featured)).join('')}</div><details class="more-options"><summary>Explore other options</summary><div class="offer-cards compact">${others.map(item=>offerCard(item)).join('')}</div></details>${seminarSection()}${known&&p?.email?`<button class="text-button" type="button" data-go="identify" data-leadscore-private>Not ${escape(p.email)}? Use a different email</button>`:''}`;
  }
  if(state.step === 'review' && seatClosedNow()) screen.innerHTML = heading('SEMINAR · OCTOBER 27', 'Paid seat reservations have closed.', 'Seat sales closed at noon on October 27, Antigua time. Nothing has been booked or charged on this page. Free attendance remains first come, subject to space.') + `<button class="primary" type="button" data-go="offers" ${savePayload?'disabled':''}>See my other options</button>${helpFootnote}`;
  else if(state.step === 'review') {
    const item = currentOffer(state.selected), link = nativeLink(state.selected);
    screen.innerHTML = heading('REVIEW YOUR CHOICE', 'Your next step, clearly laid out.') + `<div class="notice" role="status"><strong>${link?'Continue with '+link.provider:'Details are still being finalised.'}</strong><p>${link?'Nothing has been booked or paid on this page. The provider will show your current booking or payment result.':'This offer is available for review. Its payment opens after inclusions and terms are confirmed.'}</p></div>${knownSize()?'':`<div class="summary-line"><span>Team size: ${label(EMPLOYEES,state.employees)}</span><button class="text-button" data-go="employees">Change</button></div>`}${state.selected==='group'?`<p>Training focus: ${state.track==='operations'?'Operations · SnapSuite':'Sales · LeadScore'}</p><p class="small">Software access is confirmed separately from training.</p>`:''}${offerDetail(item)}${state.selected==='solo'?`<label class="check"><input type="checkbox" id="course" ${state.course?'checked':''}><span>Optional US$97 course add-on<br><small>Contents and billing basis to be confirmed. Optional and unselected by default.</small></span></label><p id="course-status" class="small">${state.course?'Requested in this draft only; no course charge has been authorized.':'Course not added.'}</p><p class="small">Website and email add-ons: scope, limits and pricing to be confirmed.</p>`:''}<p class="small">${'Listed price includes all taxes and processing fees.'}${state.selected==='solo'?' Start date, renewal date and recurring terms must be shown before you subscribe.':''}</p>${saveSection()}${link?`<a class="primary" href="${link.url}" rel="noreferrer" data-provider="${state.selected}">${state.selected==='seminar_seat'?'Continue to Stripe to pay US$249':'Choose a time and pay US$949 on Calendly'} →</a><p class="small">Card details are entered on the provider’s secure page. This page cannot confirm payment or booking. Keep your provider confirmation; do not pay again if a result is pending.</p>${state.selected==='seminar_seat'?'<p class="small">Prices are in US dollars. A local-currency price includes Stripe’s conversion cost. Choose USD $249 to pay exactly US$249.</p>':''}`:`<div class="notice"><strong>Booking: not open yet</strong><p>No seat or appointment is reserved. Actual availability and the full terms must be confirmed before payment.</p></div><button class="primary" type="button" disabled aria-disabled="true" aria-describedby="checkout-help">Booking and payment not open</button><p id="checkout-help" class="small">When checkout opens, card details will be entered on Stripe’s secure page. Please do not enter card details here.</p>`}<button class="secondary" data-go="offers" ${savePayload?'disabled':''}>Change my support</button>${helpFootnote}`;
  }
  // The static native page is not identity-connected, so it never claims details can be brought along.
  $('#companion-copy').textContent=nativeLive&&!identityConfigured?(nativeLink('onsite')?'Choose your support. Booking and payment take place with Stripe and Calendly.':'Choose your support. Seminar seat payment takes place with Stripe.'):state.verified?'Your options are matched to your business. Nothing is booked or paid until you choose.':identityConfigured?'Already shared your details? Continue with your email.':'Choose your team size to see the support that fits.';
  $('#summary').innerHTML = [state.employees && `<p><strong>Your team</strong><br>${label(EMPLOYEES,state.employees)}</p>`,state.selected&&!seatClosedNow()&&`<p><strong>Your choice</strong><br>${escape(currentOffer(state.selected).title)}</p>`].filter(Boolean).join('');
  screen.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>go(button.dataset.go)));
  screen.querySelectorAll('[data-free]').forEach(button=>button.addEventListener('click',openFree));
  screen.querySelectorAll('[data-size]').forEach(button=>button.addEventListener('click',()=>{
    if(state.employees!==button.dataset.size){state.selected=null;state.track='';state.course=false;}
    state.employees=button.dataset.size;state.sizeSource='chosen';go('offers');
  }));
  screen.querySelectorAll('[data-review]').forEach(button=>button.addEventListener('click',async()=>{
    const [id,track='']=button.dataset.review.split(':');
    if(id===SEMINAR.id&&!seatSalesOpen()){render();return;}
    if(state.selected!==id||state.track!==track)state.course=false;
    state.selected=id;state.track=track;button.disabled=true;
    await loadPublishedForm();go('review');
  }));
  // A page left open past the cutoff must not hand off to Stripe from a stale render.
  screen.querySelectorAll('[data-provider="seminar_seat"]').forEach(link=>link.addEventListener('click',event=>{if(!seatSalesOpen()){event.preventDefault();render();screen.querySelector('h1')?.focus();}}));
  $('#explore-anonymously')?.addEventListener('click',()=>{resetIdentity();go('employees');});
  $('#retry-identity')?.addEventListener('click',redeem);
  $('#course')?.addEventListener('change',e=>{state.course=e.target.checked;$('#course-status').textContent=state.course?'Requested in this draft only; no course charge has been authorized.':'Course not added.';});
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
function openFree(event) { freeTrigger=event?.currentTarget;$('#free-dialog').showModal();$('#close-free').focus(); }
document.querySelectorAll('[data-free]').forEach(button=>button.addEventListener('click',openFree));
$('#close-free').addEventListener('click',()=>$('#free-dialog').close());
$('#free-dialog').addEventListener('close',()=>freeTrigger?.isConnected&&freeTrigger.focus());
$('#back').addEventListener('click',()=>go(historySteps.pop()||'intro',false));
// A verified, recognised visitor's home is their offers; the size cards are never offered back to them.
$('.brand').addEventListener('click',event=>{event.preventDefault();if(!savePayload)go(knownSize()?'offers':'intro');});
if(nativeLive)$('.review-banner').textContent=nativeLink('onsite')?'ANTIGUA · SEMINAR SEATS AND ONSITE CONSULTATIONS · OTHER OFFERS IN REVIEW':'Seminar seats are available now for US$249, with all taxes and fees included; other packages are currently in review.';
// Re-render once when the seat cutoff passes on an open page (timer, or on return to a sleeping tab).
let seatCutoffRendered=!seatSalesOpen();
function refreshSeatCutoff(){if(seatCutoffRendered||seatSalesOpen())return;seatCutoffRendered=true;if(!savePayload&&(state.step==='offers'||state.step==='review'&&state.selected===SEMINAR.id))render();}
const untilSeatCutoff=SEAT_SALES_CLOSE_AT-Date.now();
if(untilSeatCutoff>0&&untilSeatCutoff<2147483647)setTimeout(refreshSeatCutoff,untilSeatCutoff+50);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshSeatCutoff();});
render();
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
      historySteps=[];go(nextAfterProfile(state),false);
    }
  } catch(error) {go('identityError',true,[403,410].includes(error.status)?'expired':'unavailable');}
}
if(accessToken) await redeem();
