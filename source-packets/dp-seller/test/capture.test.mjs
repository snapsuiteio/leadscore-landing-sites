import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTACT_FIELDS,QUALIFICATION_QUESTIONS,BOROUGH_FIELD,ACKNOWLEDGEMENT_TEXT,ACKNOWLEDGEMENT_VERSION,MARKETING_NOTICE} from '../src/contract.mjs';
import {validateSellerConfiguration,sellerAnswers,SELLER_FIELD_MAP} from '../src/capture.mjs';
import {validateFieldMapping,mapAnswers} from '../src/field-mapping.mjs';
import {trackingChoices} from '../src/tracking.mjs';
const origins=['https://first.example.test','https://second.example.test'];
function config() {return {schemaVersion:1,pageId:'synthetic-page',revision:2,submitUrl:'https://pages.getleadscore.ai/f/SyntheticFormKey12345',configUrl:'https://pages.getleadscore.ai/f/SyntheticFormKey12345/config',allowedOrigins:origins,
  fields:[{id:'first_name',type:'text',required:true},{id:'last_name',type:'text',required:false},...CONTACT_FIELDS.filter(f=>f.id!=='full_name'),...QUALIFICATION_QUESTIONS,BOROUGH_FIELD].map(f=>({...f,id:SELLER_FIELD_MAP[f.id]||f.id})),
  consent:{marketing:{required:false,text:MARKETING_NOTICE},acknowledgement:{required:true,text:ACKNOWLEDGEMENT_TEXT,version:ACKNOWLEDGEMENT_VERSION}},spam:{honeypotField:'website',turnstile:{required:true}},tracking:{consentRequired:true,providers:{consentMode:'required'}}};}
const validate=(c,origin=origins[0])=>validateSellerConfiguration(c,{configUrl:c.configUrl,pageId:c.pageId,revision:2,origin});
test('one published form accepts several approved hostnames but rejects a different origin',()=>{
  for(const origin of origins)assert.equal(validate(config(),origin).revision,2);
  assert.throws(()=>validate(config(),'https://other.example.test'),/not configured/);
});
test('seller answers map exactly to published controls without sending routing or investor intent',()=>{
  const mapped=sellerAnswers({full_name:'Sam Lee Jones',work_email:'sam@example.test',borough:'Outside New York City',property_type:'Other',intent:'investor',source_angle:'A01',phone:'+12025550100'});
  assert.equal(mapped.first_name,'Sam');assert.equal(mapped.last_name,'Lee Jones');assert.equal(mapped.email,'sam@example.test');
  assert.equal(mapped.which_new_york_city_borough_is_the_prope,'Outside New York City');
  assert.equal(mapped.what_type_of_property_are_you_looking_to,'Other');
  assert.equal(mapped.intent,undefined);assert.equal(mapped.source_angle,undefined);
});
test('compatible published revisions retain working capture after tracking settings change',()=>{const c=config();c.revision=3;c.tracking.providers.googleTagId='G-NEWSETTING';assert.equal(validate(c).revision,3);});
test('new required fields and changed options block stale website mappings',()=>{
  const c=config();c.fields.push({id:'required-new-field',type:'text',required:true});assert.throws(()=>validate(c),/missing a required/);
  const d=config();d.fields.find(f=>f.id===SELLER_FIELD_MAP.borough).options=['Brooklyn'];assert.throws(()=>validate(d),/no longer match/);
});
test('shared mapping works with an unrelated tenant form and does not assume seller field IDs',()=>{
  const fields=[{id:'contact',type:'email'}],c={fields:[{id:'reply_to',type:'email',required:true},{id:'note',type:'textarea',required:false}]};
  validateFieldMapping(c,fields,{contact:'reply_to'});assert.deepEqual(mapAnswers({contact:'other@example.test'},{contact:'reply_to'}),{reply_to:'other@example.test'});
  assert.throws(()=>validateFieldMapping(c,fields,{contact:'wrong'}));
});
test('optional provider settings are configured per form while consent and security remain required',()=>{
  const c=config();c.tracking.providers.googleTagId='G-TESTOTHER';validate(c);
  c.tracking.consentRequired=false;assert.throws(()=>validate(c),/consent controls/);
  assert.deepEqual(trackingChoices(),{analytics:false,marketing:false});
  assert.deepEqual(trackingChoices({analytics:true,marketing:true},true),{analytics:true,marketing:false});
});
