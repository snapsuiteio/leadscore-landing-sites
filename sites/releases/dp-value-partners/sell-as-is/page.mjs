import {ANGLES,angleFromUrl,boundedAttribution,validateSeller} from './contract.mjs';
const byId=id=>document.getElementById(id);
let angle=angleFromUrl(location.href),capture=null;
const attribution=boundedAttribution(location.href);
function opening() {
  const current=ANGLES[angle];
  byId('hero-title').textContent=current.headline;
  byId('hero-lead').textContent=current.lead;
  byId('hero-image').src='./assets/'+current.image;
  byId('hero-photo').dataset.creative=angle;
  byId('image-disclosure').textContent=current.caption+' The pictured property is not presented as a DP Value Partners acquisition or listing.';
  document.querySelectorAll('[data-angle]').forEach(link=>{
    const url=new URL(location.href);url.searchParams.set('angle',link.dataset.angle.toLowerCase());url.hash='';link.href=url.pathname+url.search;
    if(link.dataset.angle===angle)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
}
opening();
document.querySelectorAll('[data-angle]').forEach(link=>link.addEventListener('click',event=>{
  if(event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();history.pushState(null,'',link.href);angle=link.dataset.angle;opening();window.LeadScoreTracker?.track('page_viewed');
}));
window.addEventListener('popstate',()=>{angle=angleFromUrl(location.href);opening();});
const form=byId('property-form'),status=byId('form-status'),summary=byId('error-summary'),button=byId('request-submit');
const preview=!form.dataset.configUrl;
if(!preview) {
  button.disabled=true;
  import('./capture.mjs').then(module=>module.loadSellerCapture(form)).then(value=>{
    if(!value)throw Error('The seller form is not available.');capture=value;button.disabled=false;
  }).catch(error=>{status.hidden=false;status.textContent=error.message;});
}
form.addEventListener('submit',async event=>{
  event.preventDefault();status.hidden=true;summary.hidden=true;
  const values={};new FormData(form).forEach((value,key)=>{values[key]=value;});
  values.requestConsent=form.elements.namedItem('requestConsent').checked;
  const result=validateSeller(values,angle);
  document.querySelectorAll('.field-error').forEach(node=>{node.textContent='';});
  form.querySelectorAll('[aria-invalid]').forEach(node=>node.removeAttribute('aria-invalid'));
  for(const [key,message] of Object.entries(result.errors)) {
    form.elements.namedItem(key)?.setAttribute('aria-invalid','true');
    const target=byId(key+'-error');if(target)target.textContent=message;
  }
  if(!result.valid) {
    const keys=Object.keys(result.errors);summary.replaceChildren();
    const title=document.createElement('strong');title.textContent=`Please check ${keys.length} ${keys.length===1?'answer':'answers'} below.`;summary.append(title);
    const list=document.createElement('ul');for(const key of keys){const li=document.createElement('li'),link=document.createElement('a');
      link.href='#'+(key==='email'?'email':key);link.textContent=result.errors[key];li.append(link);list.append(li);}summary.append(list);
    summary.hidden=false;summary.focus();return;
  }
  if(preview) {
    status.textContent='Details checked — nothing submitted. This preview does not send or save information, create a lead, or send a message.';
    status.hidden=false;status.focus();return;
  }
  if(!capture)return;
  button.disabled=true;
  try {const saved=await capture.submit(result.answers,attribution);status.dataset.submissionId=saved.id;status.textContent=saved.message;form.reset();}
  catch(error){status.textContent=error.message||'Your request could not be saved. Please try again.';}
  finally{button.disabled=false;status.hidden=false;status.focus();}
});
