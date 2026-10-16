export const QUALIFICATION_QUESTIONS = [
  {
    "id": "property_type",
    "name": "property_type",
    "label": "What type of property are you looking to sell?",
    "type": "select",
    "required": true,
    "options": [
      "Single-family home",
      "2–4 family property",
      "Multifamily (5+ units)",
      "Condo / Co-op",
      "Vacant land",
      "Other"
    ]
  },
  {
    "id": "property_condition",
    "name": "property_condition",
    "label": "What is the current condition of the property?",
    "type": "select",
    "required": true,
    "options": [
      "Excellent – Move-in ready",
      "Good – Minor repairs needed",
      "Fair – Needs some renovations",
      "Poor – Needs major renovations",
      "Vacant or distressed"
    ]
  },
  {
    "id": "selling_timeline",
    "name": "selling_timeline",
    "label": "How soon are you looking to sell?",
    "type": "select",
    "required": true,
    "options": [
      "Immediately / Within 30 days",
      "Within 1–3 months",
      "Within 3–6 months",
      "Just exploring my options"
    ]
  },
  {
    "id": "selling_reason",
    "name": "selling_reason",
    "label": "What is your reason for selling?",
    "type": "select",
    "required": true,
    "options": [
      "Relocating / Moving",
      "Inherited property",
      "Property needs too many repairs",
      "Tired of managing tenants",
      "Financial reasons",
      "Looking to cash out equity",
      "Other"
    ]
  },
  {
    "id": "occupancy_status",
    "name": "occupancy_status",
    "label": "Is the property currently occupied?",
    "type": "select",
    "required": true,
    "options": [
      "Owner-occupied",
      "Tenant-occupied",
      "Vacant",
      "Partially occupied"
    ]
  }
];
export const ANGLES = Object.freeze({
  A01: { headline: 'Owned it for years. Ready for what’s next?', lead: 'A property can hold years of memories—and a growing list of things to fix. Start with a conversation about the building as it stands today.', image: 'seller-a01.png', caption: 'Illustrative property imagery.' },
  A02: { headline: 'Inherited a property that needs work?', lead: 'You do not need to have every answer—or a renovation plan—to ask about selling. Tell us what you know about the property and what you would like to do next.', image: 'seller-a02.png', caption: 'Illustrative property imagery.' },
  A03: { headline: 'Thinking about selling, but the repairs feel overwhelming?', lead: 'Deferred maintenance, unfinished renovations or a property that needs attention? Describe its current condition and explore an as-is sale.', image: 'seller-a03.png', caption: 'Representative property imagery.' },
  A05: { headline: 'Not sure where to start with selling your property?', lead: 'A few details can make the first conversation easier. Tell us about the property, your timing and the situation you are working through.', image: 'seller-a05.png', caption: 'Illustrative property imagery.' },
});
export const CONTACT_FIELDS = [
  {id:'full_name',name:'full_name',label:'Full name',type:'text',required:true},
  {id:'work_email',name:'email',label:'Email',type:'email',required:true},
  {id:'phone',name:'phone',label:'Phone number',type:'phone',required:true},
  {id:'property_address',name:'property_address',label:'Property address, city and state',type:'text',required:true},
];
export const BOROUGH_FIELD = {id:'borough',name:'borough',label:'Which New York City borough is the property located in?',type:'select',required:true,options:['Brooklyn','Manhattan','Queens','The Bronx','Staten Island','Outside New York City']};
export const FIELDS = [...CONTACT_FIELDS,...QUALIFICATION_QUESTIONS,BOROUGH_FIELD,
  {id:'intent',name:'intent',label:'Request type',type:'select',required:true,options:['seller_enquiry']},
  {id:'source_angle',name:'source_angle',label:'Seller page opening',type:'select',required:true,options:Object.keys(ANGLES)}];
export const ACKNOWLEDGEMENT_VERSION = 'dp-seller-request-2026-10-14-v1';
export const ACKNOWLEDGEMENT_TEXT = 'I am asking DP Value Partners to contact me about selling my property. This request does not commit me to a sale.';
export const MARKETING_NOTICE = 'This request does not enroll you in marketing communications.';
export const SUCCESS_MESSAGE = 'Request received. DP Value Partners can review your property details before discussing a possible offer. No offer or sale has been agreed.';
export const ATTRIBUTION_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','ad_id','gclid','fbclid'];
export function angleFromUrl(url) {
  const angle = new URL(url).searchParams.get('angle')?.toUpperCase();
  return Object.hasOwn(ANGLES,angle || '') ? angle : 'A01';
}
export function boundedAttribution(url,now=()=>new Date().toISOString()) {
  const params=new URL(url).searchParams, result={captured_at:now()};
  for(const key of ATTRIBUTION_KEYS) { const value=params.get(key); if(value && /^[a-zA-Z0-9._~-]{1,150}$/.test(value)) result[key]=value; }
  return result;
}
export function validateSeller(values,angle) {
  const errors={},answers={intent:'seller_enquiry',source_angle:angle};
  if(!Object.hasOwn(ANGLES,angle)) errors.source_angle='Choose a supported seller page.';
  for(const field of [...CONTACT_FIELDS,...QUALIFICATION_QUESTIONS,BOROUGH_FIELD]) {
    const value=typeof values[field.name]==='string' ? values[field.name].trim() : '';
    if(!value) errors[field.name]=field.type==='select'?'Choose an answer.':'Enter '+field.label.toLowerCase()+'.';
    else if(value.length>(field.id==='property_address'?500:150)) errors[field.name]='Please shorten this answer.';
    else if(field.type==='select'&&!field.options.includes(value)) errors[field.name]='Choose one of the listed answers.';
    else if(field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[field.name]='Enter a valid email address.';
    else if(field.type==='phone'&&!/^\+?[0-9]{7,15}$/.test(value.replace(/[\s().-]/g,''))) errors[field.name]='Enter a valid phone number.';
    else answers[field.id]=field.type==='email'?value.toLowerCase():value;
  }
  if(values.requestConsent!==true) errors.requestConsent='Acknowledge your request before continuing.';
  return {valid:Object.keys(errors).length===0,errors,answers};
}

