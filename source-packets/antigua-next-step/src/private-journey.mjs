export const journeySteps=new Set(['entry','work','training','learn','intro','employees','offers',...['seminar_seat','group_operations','group_sales','group_both','consultation','onsite','virtual'].map(key=>'review:'+key)]);
// Recipient credentials stay in this page's memory. Only the server chooses a provider destination.
export function journeyClient({base,request=fetch,navigate=url=>location.assign(url),uuid=()=>crypto.randomUUID()}) {
 const seen=new Set(),requests=new Map();let busy=false;
 const post=async(action,body)=>{const response=await request(`${base}/${action}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok){const error=new Error(result.error||'The request could not be confirmed.');error.status=response.status;throw error;}return result;};
 return {
  async viewed(session,step){const key=session+':'+step;if(!session||!journeySteps.has(step)||seen.has(key))return;seen.add(key);try{await post('view',{session,eventId:uuid(),step});}catch{/* A view failure cannot block booking. */}},
  async handoff(session,offer){if(busy)return;busy=true;try{if(!session)throw Error('Use your private link first.');const key=session+':'+offer;if(!requests.has(key))requests.set(key,uuid());const result=await post('handoff',{session,offer,requestId:requests.get(key)});const url=new URL(result.url);if(url.protocol!=='https:'||url.username||url.password||!['buy.stripe.com','calendly.com'].includes(url.hostname))throw Error('The booking destination could not be confirmed.');navigate(url.href);return result;}finally{busy=false;}}
 };
}
