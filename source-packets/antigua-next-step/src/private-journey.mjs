// Recipient credentials stay in this page's memory. Only the server chooses a provider destination.
export function journeyClient({base,request=fetch,navigate=url=>location.assign(url),uuid=()=>crypto.randomUUID()}) {
 const seen=new Set(),requests=new Map();let busy=false;
 const post=async(action,body)=>{const response=await request(`${base}/${action}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok){const error=new Error(result.error||'The request could not be confirmed.');error.status=response.status;throw error;}return result;};
 return {
  async viewed(session,step){if(!session||seen.has(step))return;seen.add(step);try{await post('view',{session,eventId:uuid()});}catch{/* A view failure cannot block booking. */}},
  async handoff(session,offer){if(busy)return;busy=true;try{if(!session)throw Error('Use your private link first.');if(!requests.has(offer))requests.set(offer,uuid());const result=await post('handoff',{session,offer,requestId:requests.get(offer)});const url=new URL(result.url);if(url.protocol!=='https:'||url.username||url.password||!['buy.stripe.com','calendly.com'].includes(url.hostname))throw Error('The booking destination could not be confirmed.');navigate(url.href);return result;}finally{busy=false;}}
 };
}
