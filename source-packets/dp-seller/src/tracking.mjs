/** Consent UI for any published LeadScore form. IDs and destinations come from its configuration. */
export function trackingChoices(value, globalPrivacyControl = false) {
  return {analytics:value?.analytics===true,marketing:value?.marketing===true&&!globalPrivacyControl};
}
export async function connectTracking(config, {document:doc=document,window:win=window}={}) {
  const panel=doc.getElementById('tracking-choices');
  if(!panel||config.tracking?.consentRequired!==true)return;
  const source=new URL(config.tracking.scriptUrl);
  if(source.origin!==new URL(config.submitUrl).origin||source.href!==config.submitUrl+'/tracker.js')throw Error('Invalid tracking endpoint.');
  const key='leadscore-privacy:'+config.pageId,age=180*24*60*60*1000;
  let choices=trackingChoices();
  try {const saved=JSON.parse(win.localStorage.getItem(key));if(saved?.savedAt<=Date.now()&&Date.now()-saved.savedAt<age)choices=trackingChoices(saved,win.navigator.globalPrivacyControl);}catch{}
  const analytics=doc.getElementById('tracking-analytics'),marketing=doc.getElementById('tracking-marketing'),note=doc.getElementById('tracking-note');
  analytics.checked=choices.analytics;marketing.checked=choices.marketing;panel.hidden=false;
  let tracker;
  function save(next) {
    choices=trackingChoices(next,win.navigator.globalPrivacyControl);
    try {win.localStorage.setItem(key,JSON.stringify({...choices,savedAt:Date.now()}));}catch{}
    analytics.checked=choices.analytics;marketing.checked=choices.marketing;
    tracker?.setConsent(choices);note.textContent='Your privacy choices have been saved.';
  }
  doc.getElementById('tracking-save').addEventListener('click',()=>save({analytics:analytics.checked,marketing:marketing.checked}));
  doc.getElementById('tracking-decline').addEventListener('click',()=>save({}));
  const script=doc.createElement('script');script.src=source.href;script.async=true;script.crossOrigin='anonymous';script.referrerPolicy='origin';
  if(config.trackerIntegrity)script.integrity=config.trackerIntegrity;
  await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('Optional statistics could not load. You can still send your property request.'));doc.head.append(script);});
  tracker=win.LeadScoreTracker;
  if(!tracker)throw Error('Optional statistics are unavailable.');
  await tracker.ready;
  tracker.setConsent(choices);
}
