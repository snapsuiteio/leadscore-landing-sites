/** Three finite public detail entries only. No identity, price, provider URL or arbitrary offer comes from a URL. */
const PUBLIC_DETAIL_ENTRIES=Object.freeze({onsite:'onsite',seat:'seminar_seat',virtual:'virtual'});
const PUBLIC_REVIEW_STATES=Object.freeze({onsite:Object.freeze({antiguaStep:'review',offer:'onsite'}),seminar_seat:Object.freeze({antiguaStep:'review',offer:'seat'}),virtual:Object.freeze({antiguaStep:'review',offer:'virtual'})});
export function publicOfferIntent(url,publicKeys){
 if(url.hash||/\/(?:private|prefill|profile)(?:\/|$)/.test(url.pathname)||url.searchParams.getAll('offer').length!==1||!Array.from(url.searchParams.keys()).every(key=>key==='offer'||publicKeys.has(key)))return null;
 const value=url.searchParams.get('offer');return Object.hasOwn(PUBLIC_DETAIL_ENTRIES,value)?PUBLIC_DETAIL_ENTRIES[value]:null;
}
export function offerReviewState(id){return Object.hasOwn(PUBLIC_REVIEW_STATES,id)?PUBLIC_REVIEW_STATES[id]:null;}
export function offerFromReviewState(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='antiguaStep,offer'||value.antiguaStep!=='review'||!Object.hasOwn(PUBLIC_DETAIL_ENTRIES,value.offer))return null;
 return PUBLIC_DETAIL_ENTRIES[value.offer];
}
