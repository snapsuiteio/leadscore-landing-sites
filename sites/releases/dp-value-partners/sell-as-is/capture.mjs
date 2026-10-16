import {CONTACT_FIELDS,QUALIFICATION_QUESTIONS,BOROUGH_FIELD,ACKNOWLEDGEMENT_TEXT,ACKNOWLEDGEMENT_VERSION,MARKETING_NOTICE,SUCCESS_MESSAGE} from './contract.mjs';
import {createHeadlessClient,connectTurnstileBridge,validateIntegration} from './headless-form-adapter.mjs';
import {connectTracking} from './tracking.mjs';
import {validateFieldMapping,mapAnswers} from './field-mapping.mjs';
export const SELLER_FIELD_MAP = {work_email:'email',property_type:'what_type_of_property_are_you_looking_to',property_condition:'what_is_the_current_condition_of_the_pro',selling_timeline:'how_soon_are_you_looking_to_sell',selling_reason:'what_is_your_reason_for_selling',occupancy_status:'is_the_property_currently_occupied',borough:'which_new_york_city_borough_is_the_prope'};
const publishedFields = [{id:'first_name',type:'text'},{id:'last_name',type:'text'},...CONTACT_FIELDS.filter(f=>f.id!=='full_name'),...QUALIFICATION_QUESTIONS,BOROUGH_FIELD];
export function sellerAnswers(answers) {
  const {full_name,intent,source_angle,...fields}=answers;
  const [first_name,...last] = String(full_name || '').trim().split(/\s+/);
  return mapAnswers({...fields,first_name,last_name:last.join(' ')},SELLER_FIELD_MAP);
}
export function validateSellerConfiguration(config,{configUrl,pageId,revision,origin}) {
  validateIntegration(config);
  if(config.configUrl!==configUrl||config.pageId!==pageId||config.revision<revision||
    !config.allowedOrigins.includes(origin)) throw Error('This seller form is not configured for this website.');
  if(config.consent.marketing.required!==false||config.consent.marketing.text!==MARKETING_NOTICE||
    config.consent.acknowledgement?.required!==true||config.consent.acknowledgement.version!==ACKNOWLEDGEMENT_VERSION||
    config.consent.acknowledgement.text!==ACKNOWLEDGEMENT_TEXT) throw Error('The seller request wording has changed.');
  validateFieldMapping(config,publishedFields,SELLER_FIELD_MAP);
  if(!config.spam.turnstile.required||config.tracking.consentRequired!==true)
    throw Error('The form security and tracking consent controls must stay enabled.');
  return config;
}
export async function loadSellerCapture(form,fetcher=fetch) {
  const configUrl=form.dataset.configUrl;
  if(!configUrl)return null;
  const url=new URL(configUrl);
  if(url.origin!=='https://pages.getleadscore.ai'||!/^\/f\/[A-Za-z0-9]{16,64}\/config$/.test(url.pathname)||url.search||url.hash||url.username||url.password)
    throw Error('Use the published seller form configuration.');
  const response=await fetcher(configUrl,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});
  const body=await response.json();
  if(!response.ok||body.success!==true)throw Error('The seller request form is unavailable. Please try again later.');
  const config=validateSellerConfiguration(body.resources,{configUrl,pageId:form.dataset.pageId,
    revision:Number(form.dataset.configRevision),origin:location.origin});
  // Optional statistics never prevent a property enquiry.
  void connectTracking({...config,trackerIntegrity:form.dataset.trackerIntegrity}).catch(error=>{
    const note=document.getElementById('tracking-note');if(note)note.textContent=error.message;
  });
  const client=createHeadlessClient(config,{fetch:fetcher,storage:null});
  const frame=document.createElement('iframe');frame.title='Property request security check';frame.className='security-check';
  form.querySelector('#request-submit').before(frame);
  const bridge=connectTurnstileBridge(frame,config);
  return {async submit(answers,attribution) {
    try {
      const result=await client.submit({answers:sellerAnswers(answers),marketing:false,acknowledgement:true,
        acknowledgementVersion:ACKNOWLEDGEMENT_VERSION,website:form.elements.namedItem('website')?.value||'',
        turnstileToken:bridge.getToken(),attribution:{first:{...attribution,source_angle:answers.source_angle.toLowerCase()},latest:{...attribution,source_angle:answers.source_angle.toLowerCase()}}});
      if(!result?.id)throw Error('Your request could not be verified as saved. Please retry this same request.');
      client.reset();
      return {id:result.id,message:SUCCESS_MESSAGE};
    }finally{bridge.reset();}
  }};
}
