// Only finite public navigation is retained on refresh. No contact, profile or session data.
const steps=new Set(['entry','work','training','learn']);
const tracks=new Set(['operations','sales','both']);
export function guidedHistoryState(state){
 if(steps.has(state.step))return {antiguaStep:state.step};
 if(state.step==='review'&&state.selected==='consultation')return {antiguaStep:'review',offer:'consultation'};
 if(state.step==='review'&&state.selected==='group'&&tracks.has(state.track))return {antiguaStep:'review',offer:'group',track:state.track};
 return null;
}
export function restoreGuidedHistory(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const keys=Object.keys(value).sort().join(',');
 let step,selected=null,track='';
 if(keys==='antiguaStep'&&steps.has(value.antiguaStep))step=value.antiguaStep;
 else if(keys==='antiguaStep,offer'&&value.antiguaStep==='review'&&value.offer==='consultation'){step='review';selected='consultation';}
 else if(keys==='antiguaStep,offer,track'&&value.antiguaStep==='review'&&value.offer==='group'&&tracks.has(value.track)){step='review';selected='group';track=value.track;}
 else return null;
 const historySteps=step==='entry'?[]:step==='work'||step==='learn'?['entry']:step==='training'||selected==='consultation'?['entry','work']:['entry','work','training'];
 return {step,selected,track,path:step==='learn'?'learn':step==='entry'?null:'work',historySteps};
}
