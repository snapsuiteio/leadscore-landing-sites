/** Published form mapping only. Server remains authoritative for identity, routing and price. */
export const isEmailField=field=>field.type==='email'||['email','work_email'].includes(field.icpField||field.id);
export function initialAnswer(field, profile, choice) {
 const key=field.icpField||field.id;
 if(isEmailField(field))return profile.email||'';
 if(['phone','work_phone','phone_number'].includes(key)||field.type==='phone')return profile.phone||'';
 if(['name','full_name','contact_name'].includes(key))return profile.name||'';
 if(key==='first_name')return (profile.name||'').split(/\s+/)[0]||'';
 if(key==='last_name')return (profile.name||'').split(/\s+/).slice(1).join(' ');
 if(['company','company_name','business_name'].includes(key))return profile.company||'';
 if(key==='next_step_offer')return choice.selected||'';
 if(key==='next_step_priority')return choice.priority||'';
 if(key==='employee_band')return choice.employees||'';
 if(key==='training_focus')return choice.track||'';
 if(key==='course_requested')return choice.course?'requested':'not_requested';
 return '';
}
export const choiceField = field=>['next_step_offer','next_step_priority','employee_band','training_focus','course_requested'].includes(field.icpField||field.id);
export function formReady(config, choice) {
 return config?.schemaVersion===1&&Number.isSafeInteger(config.revision)&&Array.isArray(config.fields)&&config.fields.some(f=>(f.icpField||f.id)==='next_step_offer')&&config.fields.some(f=>['email','work_email'].includes(f.id)&&isEmailField(f))&&(!choice||config.fields.filter(choiceField).every(f=>{const value=initialAnswer(f,{},choice);return (!f.required&&!value)||(!!value&&(f.type!=='select'||f.options?.includes(value)));}))&&!config.spam?.turnstile?.required&&!config.consent?.marketing?.required;
}
export function publishedAnswers(config,profile,choice,values) {
 return Object.fromEntries(config.fields.map(field=>[field.id,isEmailField(field)||choiceField(field)?initialAnswer(field,profile,choice):values.get(field.id)??initialAnswer(field,profile,choice)]));
}
