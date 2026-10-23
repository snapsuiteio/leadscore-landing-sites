/** Fixed, published field semantics. Never contains routing, tenant or third-party recipient IDs. */
export const ORGANIZATION_INTENT='org_discovery_request';
export const ORGANIZATION_QUESTIONS=[
 ['company_name','Organization name','The organization you work for or with.',150],
 ['role','Your role','For example: operations manager, director, permanent secretary.',100],
 ['org_challenge',"What's the main challenge you'd like help with?",'One or two sentences is plenty. Please leave out confidential or personal information.',1000],
 ['org_intro_reason','Why would an introduction help right now?','For example: a decision coming up, a project starting, or a team that needs convincing.',1000],
 ['org_stakeholders','Which teams or roles would need to be involved?',"Describe roles or teams, not people. Please don't include anyone's name, email or phone number.",500],
 ['org_relationship','How are you connected to the organization?','',["I'm a staff member","I'm a director or senior leader","I'm a board member or trustee","I advise or contract with them",'Other']],
 ['org_permission',"Can you explore this on the organization's behalf?",'', ["Yes, I've been asked to look into it",'Yes, I can make this decision',"Not yet, I'd like to make the case first","I'm not sure"]],
 ['org_timing','When would you like to start?','',['In the next month','In 1–3 months','In 3–6 months','Just exploring for now']],
];
export const organizationContactLike=value=>/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\d ().-]{6,}\d)/.test(value);
export function organizationReady(config){
 const fields=config?.fields||[],key=f=>f.icpField||f.id,acknowledgement=config?.consent?.acknowledgement;
 if(acknowledgement?.required!==true||typeof acknowledgement.text!=='string'||!acknowledgement.text.trim()||typeof acknowledgement.version!=='string'||!acknowledgement.version.trim())return false;
 return (fields.some(f=>['full_name','name','contact_name'].includes(key(f))&&f.type==='text')||['first_name','last_name'].every(id=>fields.some(f=>key(f)===id&&f.type==='text')))&&config?.organizationIntroduction?.ready===true&&config.schemaVersion===1&&Number.isSafeInteger(config.revision)&&!config.spam?.turnstile?.required&&!config.consent?.marketing?.required&&ORGANIZATION_QUESTIONS.every(([id,,,limit])=>{const matching=fields.filter(f=>key(f)===id);if(matching.length!==1)return false;const field=matching[0];return Array.isArray(limit)?field.type==='select'&&limit.every(value=>field.options?.includes(value)):field.type===(id==='company_name'||id==='role'?'text':'textarea');})&&fields.filter(f=>f.required).every(f=>[...ORGANIZATION_QUESTIONS.map(q=>q[0]),'next_step_offer','email','work_email','full_name','name','contact_name','first_name','last_name'].includes(key(f)))&&fields.some(f=>key(f)==='next_step_offer'&&f.type==='select'&&f.options?.includes(ORGANIZATION_INTENT));
}
export function organizationAnswers(config,draft,profile={},verified=false){
 return Object.fromEntries(config.fields.map(f=>{const key=f.icpField||f.id;let value=draft[key]||'';if(key==='next_step_offer')value=ORGANIZATION_INTENT;else if(f.type==='email'||['email','work_email'].includes(key))value=verified?profile.email||'':draft.email||'';else if(['name','full_name','contact_name'].includes(key))value=verified?profile.name||draft.full_name||'':draft.full_name||'';else if(key==='first_name')value=(verified?profile.name||draft.full_name||'':draft.full_name||'').split(/\s+/)[0];else if(key==='last_name')value=(verified?profile.name||draft.full_name||'':draft.full_name||'').split(/\s+/).slice(1).join(' ');else if(['phone','work_phone','phone_number'].includes(key))value=verified?profile.phone||draft[key]||'':draft[key]||'';return [f.id,value];}));
}
