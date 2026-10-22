// Exact existing provider destinations approved for the Antigua campaign.
// No browser query parameter, email, amount or discount controls these links.
export const providerLinks = Object.freeze({
 seminar_seat: Object.freeze({url:'https://buy.stripe.com/28EbJ32uc4QOfAV11kgA803',provider:'Stripe',enabled:true,amount:24900,currency:'usd',capacity:5}),
 virtual: Object.freeze({url:'https://calendly.com/snapsuite/two-hour-private-virtual-meeting-with-dwain',provider:'Calendly',enabled:true,amount:47900,currency:'usd'}),
 onsite: Object.freeze({url:'https://calendly.com/snapsuite/antigua-onsite-october-28-2026',provider:'Calendly',enabled:true,amount:94900,currency:'usd',capacity:3}),
});
export function verifiedProviderLink(id,links=providerLinks){
 const item=links[id];if(!item||item.enabled!==true||item.currency!=='usd')return null;
 const allowed=id==='seminar_seat'?'https://buy.stripe.com/28EbJ32uc4QOfAV11kgA803':id==='onsite'?'https://calendly.com/snapsuite/antigua-onsite-october-28-2026':id==='virtual'?'https://calendly.com/snapsuite/two-hour-private-virtual-meeting-with-dwain':null;
 return allowed&&item.url===allowed&&item.amount===(id==='onsite'?94900:id==='virtual'?47900:24900)?item:null;
}
