import {FIELDS,ACKNOWLEDGEMENT_TEXT,ACKNOWLEDGEMENT_VERSION,MARKETING_NOTICE,SUCCESS_MESSAGE} from './contract.mjs';
import {createHeadlessClient,connectTurnstileBridge,validateIntegration} from './headless-form-adapter.mjs';
export function validateSellerConfiguration(config,{configUrl,pageId,revision,origin}) {
  validateIntegration(config);
  if(config.configUrl!==configUrl||config.pageId!==pageId||config.revision!==revision||
    JSON.stringify(config.allowedOrigins)!==JSON.stringify([origin])) throw Error('This seller form is not configured for this website.');
  if(config.consent.marketing.required!==false||config.consent.marketing.text!==MARKETING_NOTICE||
    config.consent.acknowledgement?.required!==true||config.consent.acknowledgement.version!==ACKNOWLEDGEMENT_VERSION||
    config.consent.acknowledgement.text!==ACKNOWLEDGEMENT_TEXT) throw Error('The seller request wording has changed.');
  if(config.fields.length!==FIELDS.length||new Set(config.fields.map(f=>f.id)).size!==FIELDS.length) throw Error('The seller questions have changed.');
  for(const {name,...expected} of FIELDS) {
    const field=config.fields.find(f=>f.id===expected.id);
    if(!field||field.type!==expected.type||field.label!==expected.label||field.required!==expected.required||
      JSON.stringify(field.options)!==JSON.stringify(expected.options)) throw Error('The seller questions have changed.');
  }
  if(!config.spam.turnstile.required||config.tracking.consentRequired!==true||
    Object.entries(config.tracking.providers).some(([key,value])=>key!=='consentMode'&&!!value))
    throw Error('Seller security or optional tracking settings are not approved.');
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
  const client=createHeadlessClient(config,{fetch:fetcher,storage:null});
  const frame=document.createElement('iframe');frame.title='Property request security check';frame.className='security-check';
  form.querySelector('#request-submit').before(frame);
  const bridge=connectTurnstileBridge(frame,config);
  return {async submit(answers,attribution) {
    try {
      const result=await client.submit({answers,marketing:false,acknowledgement:true,
        acknowledgementVersion:ACKNOWLEDGEMENT_VERSION,website:form.elements.namedItem('website')?.value||'',
        turnstileToken:bridge.getToken(),attribution:{first:attribution,latest:attribution}});
      if(!result?.id)throw Error('Your request could not be verified as saved. Please retry this same request.');
      return {id:result.id,message:SUCCESS_MESSAGE};
    }finally{bridge.reset();}
  }};
}
