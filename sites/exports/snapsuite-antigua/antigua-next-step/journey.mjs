// Offer facts approved by Dwain on 22 October 2026. Provider activation is separate.
export const EMPLOYEES = [['10_plus', '10 or more'], ['5_9', '5–9'], ['1_4', '1–4'], ['solo', 'Just me'], ['unknown', 'Not sure']];
// First-screen size cards, smallest first. "Not sure" stays a small secondary action.
export const SIZES = [['solo', 'Just me', 'No employees'], ['1_4', '1–4', 'employees'], ['5_9', '5–9', 'employees'], ['10_plus', '10 or more', 'employees']];
export const PRIORITIES = [
  ['operations', 'Less paperwork and smoother operations', 'Jobs, quotes, invoices and everyday admin'],
  ['sales', 'Better sales and customer follow-up', 'Leads, conversations and staying in touch'],
  ['ai', 'Practical help using AI', 'Useful ways to handle everyday work'],
  ['tailored', 'A tailored plan for my business', 'Talk through one priority with Dwain'],
];
export const FOCUS = { operations: 'SnapSuite · Operations', sales: 'LeadScore · Sales', ai: 'Practical AI learning', tailored: 'A tailored business consultation' };
const commonPending = ['Cancellation, rescheduling and refund terms'];
export const OFFERS = [
  { id: 'onsite', title: 'Onsite one-on-one', price: 'US$949', cadence: 'One-time', points: ['2 hours at your business', 'One problem, one practical plan', 'Wednesday, October 28'], billing: 'One-time total · all taxes and processing fees included', summary: 'Two hours at your business. One agreed problem. A practical plan and next steps.', included: ['Two hours focused on one agreed business problem', 'A practical plan and clear next steps', 'A limited onsite slot; customer cancellation or moving to another day converts the full payment to one 2-hour private virtual consultation on a later mutually agreed date, at no extra charge and with no expiry deadline', 'No cash or price-difference refund for that conversion; if the host cannot deliver, choose a full refund or virtual replacement'], excluded: ['A completed integration, migration or full implementation', 'Post-session written follow-up or ongoing support'], pending: [], timing: 'Onsite consultation windows: Wednesday, October 28, 2026 · 8–10 a.m., 11 a.m.–1 p.m. or 2–4 p.m. Antigua time (UTC−4). Calendly shows current availability and requires US$949 total payment during booking. Moving to another available October 28 time carries no new charge. Provide business directions and a phone number.', productId: 'prod_VUGQJjsZZbqg35' },
  { id: 'virtual', title: 'Virtual one-on-one', price: 'US$479', cadence: 'One-time', points: ['2 hours by video', 'One priority, a focused action plan'], billing: 'One-time total · all taxes and processing fees included', summary: 'Two hours by video. One priority and a focused action plan.', included: ['Two hours of private virtual guidance', 'One priority and an action plan'], excluded: ['A completed integration, migration or full implementation'], pending: ['Available dates, times and timezone', 'Meeting details', 'Written follow-up and ongoing support', ...commonPending], timing: 'Appointment dates and times to be confirmed.', productId: 'prod_VUGRThRNPwj1wf' },
  { id: 'group', title: 'Guided group help', price: 'US$249', cadence: 'One-time', points: ['4 weekly training sessions', 'Monthly support in the first 6 months', 'Operations or sales focus'], billing: 'Training package total · taxes and processing fees included', summary: 'Four weekly training sessions, followed by monthly group support during the first six months.', included: ['Four training sessions, one per week', 'Monthly group support during the first six months', 'Separate operations and sales/software options'], excluded: ['A bundled software subscription at the unresolved software prices'], pending: ['Session length and start date', 'Monthly support schedule and when the six months begins', 'Recordings and software access', ...commonPending], timing: 'Training dates and support schedule to be confirmed.', productId: 'prod_VUGwHRp60qOa18' },
  { id: 'solo', title: 'Solo business essentials', price: 'US$49', cadence: 'Monthly', points: ['Business essentials plan', 'Limited, basic features'], billing: 'Per month, taxes and processing fees included · plan terms pending', summary: 'A limited product plan for business essentials, with basic capabilities.', included: ['Limited product capabilities for business essentials'], excluded: ['Unlimited consulting', 'Advanced automation'], pending: ['Exact features, usage limits and support', 'Subscription start and renewal date', ...commonPending], timing: 'Subscription terms and renewal details to be confirmed.' },
  { id: 'dinner', title: 'A deeper conversation', price: 'US$1,500', cadence: 'Per person', points: ['Shared dinner, up to 5 people', '2 private virtual follow-ups', 'Wednesday, October 28 · 7:30 p.m.'], billing: 'Per person total, taxes and processing fees included · package terms pending', summary: 'A shared dinner with up to five participants, plus two private virtual one-on-one follow-up sessions.', included: ['Shared dinner format with up to five participants', 'TWO private virtual one-on-one follow-up sessions'], excluded: ['A private individual dinner', 'Unlimited access'], pending: ['Dinner venue and duration', 'Exactly which meal and drinks are included', 'Follow-up lengths and booking window', ...commonPending], timing: 'Planned dinner: Wednesday, October 28, 2026 at 7:30 p.m. Antigua time (UTC−4), separate from the onsite consultations. Shared with up to five participants, plus two private virtual one-on-one follow-ups. Venue, meal and drinks, duration, follow-up lengths, booking window and policies remain to be confirmed. Booking is not open yet.', productId: 'prod_VUGyJFviXCeOC5' },
];
export const SEMINAR = {
  id:'seminar_seat',productId:'prod_VUGvcSJE0RGfhO',title:'Named reserved seminar seat',price:'US$249',cadence:'One-time',points:['Your named seat, held until 7:15 p.m.','Five paid seats in total','Optional · separate from group training'],billing:'One-time total · all taxes and processing fees included',
  summary:'October 27, 2026 · 7–9 p.m. Antigua time (UTC−4) · Azure Conference Hall, Trade Winds Hotel.',
  included:['One named seminar seat per successful Stripe payment (five paid seats in total)','Seat held until 7:15 p.m.; released after that if you have not arrived'],
  excluded:['The separate US$249 group-training programme','Consultations and dinner'],
  pending:['Verified current inventory for the five paid-seat allocation','Confirmed payment, allocation and check-in connection'],
  timing:'Five paid reservations are allocated in total; current availability is not verified. Free entry is first come, subject to space. Consultations and dinner do not include a seminar seat. Cancel at least 24 hours before the event (by October 26, 2026, 7 p.m. Antigua time) for a refund of the amount paid minus actual processing fees. Later cancellations receive no refund. The processing-fee deduction is based on the actual provider amount; no numerical deduction is assumed.',
};
// Confirmed seat sales cutoff: noon October 27, 2026, Antigua time (UTC−4) = 16:00Z.
// Client-side only; the Stripe link itself must be closed by the provider/backend.
export const SEAT_SALES_CLOSE_AT = Date.UTC(2026, 9, 27, 16, 0, 0);
export const SEMINAR_ENDS_AT = Date.UTC(2026, 9, 28, 1, 0, 0);
export const seatSalesOpen = (now = Date.now()) => now < SEAT_SALES_CLOSE_AT;
// The no-purchase path. Not a paid offer, so it stays outside OFFERS and never reaches review or checkout.
export const FREE = { id: 'free', title: 'Free DIY start', price: 'Free', cadence: 'No purchase', points: ['Practical guides to try today', 'Free DIY course and Friday live Q&A · links being confirmed'] };
// Relevant first offers for each business size. Every other offer stays under "Explore other options".
export const SIZE_PATHS = {
  solo: { eyebrow: 'JUST ME', title: 'Two ways to start.', offers: ['solo', 'free'] },
  '1_4': { eyebrow: '1–4 EMPLOYEES', title: 'Help for a small team.', offers: ['group', 'virtual'] },
  '5_9': { eyebrow: '5–9 EMPLOYEES', title: 'Help for a growing team.', offers: ['group', 'virtual'] },
  '10_plus': { eyebrow: '10 OR MORE EMPLOYEES', title: 'Start with a consultation.', offers: ['onsite', 'virtual'], featured: 'onsite' },
  unknown: { eyebrow: 'NOT SURE OF SIZE', title: 'Good places to start.', offers: ['group', 'virtual'] },
};
export const sizePath = employees => SIZE_PATHS[employees] || SIZE_PATHS.unknown;
export function recommend(employees, priority) {
  if (priority === 'tailored' || employees === '10_plus') return 'onsite';
  if (employees === 'solo') return 'solo';
  if (['1_4', '5_9'].includes(employees)) return 'group';
  return null;
}
export function employeeBand(profile) {
  if (EMPLOYEES.some(([key]) => key === profile?.employees) && profile.employees !== 'unknown') return profile.employees;
  const min = profile?.employeeMin, max = profile?.employeeMax;
  if (!Number.isInteger(min) || min < 0 || !(max === null || Number.isInteger(max) && max >= min)) return null;
  if (min >= 10) return '10_plus';
  if (min >= 5 && max !== null && max <= 9) return '5_9';
  if (min >= 1 && max !== null && max <= 4) return '1_4';
  return min === 0 && max === 0 ? 'solo' : null;
}
export function profileAnswers(profile) {
  return { employees: employeeBand(profile), priority: PRIORITIES.some(([key]) => key === profile?.priority) ? profile.priority : null };
}
export function missingQuestions(state) {
  return [!state.employees && 'employees'].filter(Boolean);
}
// Size is the only question before offers; a verified size goes straight to them.
export function nextAfterProfile(state) { return missingQuestions(state)[0] || 'offers'; }
export function offer(id) { return id===SEMINAR.id?SEMINAR:OFFERS.find(item => item.id === id); }
