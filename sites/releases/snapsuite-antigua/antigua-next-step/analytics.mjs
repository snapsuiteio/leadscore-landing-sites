import { ChoiceCollector } from './collector.mjs';
/** Existing published-form tracker only. No embedded provider IDs, contact fields or arbitrary event labels. */
const STEPS={entry:'entry',learn:'learn',intro:'intro',employees:'employees',offers:'offers',review:'review',identify:'identify',checking:'checking',emailSent:'email_sent',identityError:'identity_error',ambiguous:'ambiguous'};
const ANALYTICS_SIZES=new Set(['solo','1_4','5_9','10_plus']);
const ANALYTICS_OFFERS=new Set(['solo','group','virtual','onsite','seminar_seat','dinner']);
const FORMS=new Set(['started','invalid','submit','error','request_saved']);
let collector;
export async function recordChoice(code){return collector?collector.capture(code):{status:privateSession?'private':'unavailable'};}
let enabled=false,initialized=false,choice='none',started=false,privateSession=false,sourceMarked=false;
export function suspendPrivateAnalytics(){privateSession=true;enabled=false;void collector?.suspend();document.documentElement.setAttribute('data-leadscore-analytics-private','true');window.LeadScoreTracker?.suspendPrivate();document.querySelector('#analytics-consent')?.setAttribute('hidden','');document.querySelector('#analytics-choices')?.setAttribute('hidden','');}
// Campaign association comes from the server-owned published page, never a raw query campaign label.
export function safeWizardAttribution(url){const touch={};const approved={utm_source:['email','qr','facebook','instagram','google','direct','social'],utm_medium:['email','social','cpc','qr','organic','referral'],source_angle:['seminar','snapsuite','ai','event','onsite','checklist','ai-workflow','snapsuite-fit','question']};for(const [key,values] of Object.entries(approved)){const value=url.searchParams.get(key==='source_angle'?'angle':key);if(values.includes(value))touch[key]=value;}return touch;}
export const analyticsEvent=name=>{if(enabled&&!privateSession)window.LeadScoreTracker?.track(name);};
export const analyticsStep=step=>{if(STEPS[step])analyticsEvent('wizard_step_'+STEPS[step]);};
export const analyticsSize=size=>{if(ANALYTICS_SIZES.has(size))analyticsEvent('wizard_size_'+size);else if(size==='organization')analyticsEvent('wizard_organization');};
export const analyticsOffer=offer=>{if(ANALYTICS_OFFERS.has(offer))analyticsEvent('wizard_offer_'+offer);};
export const analyticsForm=event=>{if(FORMS.has(event))analyticsEvent(event==='request_saved'?'wizard_request_saved':'wizard_form_'+event);};
export async function initializeAnalytics({configured,base,privateVisit=false,attribution={},getStep=()=>null}){
 if(configured&&!collector)collector=new ChoiceCollector({scope:base,privateVisit:privateVisit||privateSession,mirror:name=>window.LeadScoreTracker?.mirrorChoice(name)});
 if(privateVisit)suspendPrivateAnalytics();
 if(privateSession||initialized||!configured||/^\/event-follow-up(?:\/|$)|^\/events\/scan(?:\/|$)/.test(location.pathname))return;
 initialized=true;
 // Query strings and fragments are removed before any third-party script can read location.
 // Do not forward arbitrary UTM/source labels: first-party intake retains its own published attribution contract.
 if(location.search||location.hash)history.replaceState(null,'',location.pathname);
 let config;try{const response=await fetch(base+'/config',{credentials:'omit',cache:'no-store',redirect:'error'});const body=await response.json();if(!response.ok||!body.success||body.resources?.submitUrl!==base||body.resources?.tracking?.scriptUrl!==base+'/tracker.js'||body.resources?.tracking?.eventsUrl!==base+'/events'||!body.resources?.allowedOrigins?.includes(location.origin))return;config=body.resources;}catch{return;}
 if(privateSession){void collector?.suspend();return;}
 const panel=document.querySelector('#analytics-consent'),choices=document.querySelector('#analytics-choices');
 if(!panel||!choices)return;
 collector.configure(config);
 const key='leadscore-wizard-consent:'+config.pageId;choices.hidden=false;
 async function apply(next){
  if(privateSession)return;
  choice=next;enabled=next==='analytics';try{localStorage.setItem(key,next);}catch{}
  panel.hidden=true;
  // Local first-party queue readiness never waits for an SDK or vendor configuration.
  await collector.consent(enabled);
  if(privateSession)return;
  if(!window.LeadScoreTracker&&enabled){const script=document.createElement('script');script.src=config.tracking.scriptUrl;script.referrerPolicy='no-referrer';script.async=true;await new Promise(resolve=>{script.onload=resolve;script.onerror=resolve;document.head.append(script);});}
  if(privateSession){window.LeadScoreTracker?.suspendPrivate();return;}
  window.LeadScoreTracker?.setWizardAttribution(attribution);
  window.LeadScoreTracker?.setConsent({analytics:enabled,marketing:false});
  await window.LeadScoreTracker?.ready?.catch(()=>{});
  if(privateSession){window.LeadScoreTracker?.suspendPrivate();return;}
  if(enabled)analyticsStep(getStep());
  if(enabled&&!sourceMarked&&['email','qr','facebook','instagram','google','direct','social'].includes(attribution.utm_source)){sourceMarked=true;analyticsEvent('wizard_source_'+attribution.utm_source);}
 }
 let previous;try{previous=localStorage.getItem(key);}catch{}
 if(['analytics','none'].includes(previous))await apply(previous);else panel.hidden=false;
 panel.querySelectorAll('[data-tracking-choice]').forEach(button=>button.addEventListener('click',()=>apply(button.dataset.trackingChoice)));
 choices.addEventListener('click',()=>{panel.hidden=false;document.querySelector('#analytics-current').textContent=choice==='analytics'?['storage_unavailable','full'].includes(collector.status)?"Analytics is on, but this browser can't keep a record of your choices, so they aren't being counted.":collector.status==='blocked'||!collector.config?"Analytics is on, but choice counting is unavailable.":'Analytics is on. The options you choose are counted without your answers or contact details.':'Analytics is off. Your choices are not recorded.';});
 addEventListener('storage',event=>{if(event.key===key&&event.newValue!=='analytics'){enabled=false;choice='none';void collector.consent(false);window.LeadScoreTracker?.setConsent({analytics:false,marketing:false});}});
 // Native Clarity handles mouse/tap, heatmaps and replay after consent. We never record coordinates or keystrokes ourselves.
 let depth=0;document.addEventListener('scroll',()=>{if(!enabled)return;const max=document.documentElement.scrollHeight-innerHeight;if(max<=0)return;const next=Math.min(100,Math.floor(scrollY/max*4)*25);while(depth<next){depth+=25;analyticsEvent('wizard_scroll_'+depth);}},{passive:true});
 document.addEventListener('input',event=>{if(!started&&event.target instanceof Element&&event.target.closest('form')){started=true;analyticsForm('started');}});
 document.addEventListener('invalid',()=>analyticsForm('invalid'),true);
}
