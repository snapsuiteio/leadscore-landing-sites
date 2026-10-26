// Exact existing provider destinations approved for the Antigua campaign.
// No browser query parameter, email, amount or discount controls these links.
export const providerLinks = Object.freeze({
 consultation: Object.freeze({url:'https://calendly.com/snapsuite/consultation',provider:'Calendly',enabled:true,amount:94900,currency:'usd'}),
 seminar_seat: Object.freeze({url:'https://buy.stripe.com/28EbJ32uc4QOfAV11kgA803',provider:'Stripe',enabled:true,amount:24900,currency:'usd',capacity:5}),
 virtual: Object.freeze({url:'https://calendly.com/snapsuite/two-hour-private-virtual-meeting-with-dwain',provider:'Calendly',enabled:true,amount:47900,currency:'usd'}),
 onsite: Object.freeze({url:'https://calendly.com/snapsuite/antigua-onsite-october-28-2026',provider:'Calendly',enabled:true,amount:94900,currency:'usd',capacity:3}),
 group_operations: Object.freeze({url:'https://buy.stripe.com/9B600lb0I8309cxdO6gA804',provider:'Stripe',enabled:true,amount:24900,currency:'usd'}),
 group_sales: Object.freeze({url:'https://buy.stripe.com/9B6aEZd8Qab8coJ25ogA805',provider:'Stripe',enabled:true,amount:24900,currency:'usd'}),
 group_both: Object.freeze({url:'https://buy.stripe.com/9B69AV2ucfvs88tdO6gA806',provider:'Stripe',enabled:true,amount:39840,currency:'usd'}),
});
export function verifiedProviderLink(id,links=providerLinks){
 const item=links[id],approved=providerLinks[id];
 if(!item||!approved||item.enabled!==true||item.currency!=='usd')return null;
 return item.url===approved.url&&item.amount===approved.amount&&item.provider===approved.provider?item:null;
}
