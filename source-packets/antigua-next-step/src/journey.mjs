// Offer facts approved by Dwain on 22 October 2026. Provider activation is separate.
export const EMPLOYEES = [['10_plus', '10+ employees'], ['5_9', '5–9 employees'], ['1_4', '1–4 employees'], ['solo', 'Just me'], ['unknown', 'Not sure']];
// First-screen size cards, largest first (10+ is first/left).
export const SIZES = [['10_plus', '10+', 'employees'], ['5_9', '5–9', 'employees'], ['1_4', '1–4', 'employees'], ['solo', 'Just me', 'No employees']];
// A separate choice for people who work for an organization (including government) rather than own a business.
// Set only when the visitor picks it; never inferred from a missing or unknown headcount. It is not an employee band.
export const ORGANIZATION = ['organization', 'I Work for an Organization', 'For staff and directors, including in government.'];
export const PRIORITIES = [
  ['operations', 'Less paperwork and smoother operations', 'Jobs, quotes, invoices and everyday admin'],
  ['sales', 'Better sales and customer follow-up', 'Leads, conversations and staying in touch'],
  ['ai', 'Practical help using AI', 'Useful ways to handle everyday work'],
  ['tailored', 'A tailored plan for my business', 'Talk through one priority with Dwain'],
];
export const FOCUS = { operations: 'SnapSuite · Operations', sales: 'LeadScore · Sales', ai: 'Practical AI learning', tailored: 'A tailored business consultation' };
// Group training choices: [key, title, benefit, software, flat price incl. all taxes and fees] (prices approved by Dwain).
// Each choice has its own price and its own checkout id (group_<key>), configured by root once verified.
export const TRACKS = [
  ['operations', 'Help With Operations', 'SnapSuite onboarding and guided training to organize your paperwork, receipts and records.', 'SnapSuite', 'US$249'],
  ['sales', 'Help With Sales', 'LeadScore onboarding and guided training to follow up with leads and customers and keep your communications organized.', 'LeadScore', 'US$249'],
  ['both', 'Both', 'SnapSuite and LeadScore onboarding and guided training together.', 'SnapSuite and LeadScore', 'US$398.40'],
];
export const track = id => TRACKS.find(([key]) => key === id);
// pending: internal guards for unsettled facts. They are never shown as a customer checklist,
// and an offer with pending facts has no checkout.
const commonPending = ['Cancellation, rescheduling and refund terms'];
// Card copy is lede: two plain sentences explaining the value, shown before the price.
// summary opens the review screen and does not repeat the "What is included" list.
export const OFFERS = [
  { id: 'onsite', title: 'Two-Hour Consultation at Your Business With Dwain', price: 'US$949', cadence: 'One-time',
    lede: 'Dwain spends two hours at your business, looking at how your operations run and the challenges you face. You leave with practical ways AI and software can make your business more efficient, and clear first steps. After the visit, you also get one one-hour virtual follow-up meeting with Dwain.',
    billing: 'One-time total, including all taxes and processing fees.',
    summary: 'A two-hour visit by Dwain to your business on Wednesday, October 28, 2026, plus one one-hour virtual follow-up meeting with Dwain afterwards. For the visit, all you need to do is set aside the time and show him how the work really happens.',
    included: ['Two hours with Dwain at your business', 'A walk-through of how your business operates and the challenges you are facing', 'Practical opportunities to use AI and software in your business', 'Clear first next steps to make your business more efficient', 'One one-hour virtual follow-up meeting with Dwain after the visit'],
    // The one included follow-up is listed above; only support beyond it is excluded.
    excluded: ['Setting up, connecting or moving your software and data. The visit shows you what to do next; it does not complete the work.', 'A written report, or ongoing support beyond the one included follow-up meeting'],
    terms: ['Visits are on Wednesday, October 28, 2026, Antigua time (UTC−4), at 8–10 a.m., 11 a.m.–1 p.m. or 2–4 p.m. Calendly shows which times are still available.', 'You pay the full US$949 on Calendly when you book. All taxes and processing fees are included.', 'Moving to another available time on October 28 costs nothing extra.', 'If you cancel, or move the visit to another day, your full payment becomes one two-hour private video consultation with Dwain on a later date you both agree. There is no extra charge and no expiry date.', 'That change does not give a cash refund or a refund of the price difference.', 'If Dwain cannot make the visit, you choose either a full refund or a video consultation instead.', 'When you book, please give directions to your business and a phone number.'],
    status: '', pending: [], productId: 'prod_VUGQJjsZZbqg35' },
  { id: 'virtual', title: 'Two-Hour Private Virtual Meeting With Dwain', price: 'US$479', cadence: 'One-time',
    lede: 'A private two-hour virtual meeting with Dwain. Bring real problems and workflows from your business or your job, and he will show you how AI can help and give you practical next steps.',
    billing: 'One-time total, including all taxes and processing fees.',
    summary: 'A private two-hour virtual meeting with Dwain. Come with examples of the work you want to improve.',
    included: ['Two hours one-to-one with Dwain in a virtual meeting', 'Working through real problems and workflows from your business or your job', 'Practical examples of how AI can help with them', 'Practical next steps you can act on'],
    excluded: ['Setting up, connecting or moving your software and data for you, or a guarantee that the work will be completed', 'A written report or ongoing support after the meeting'],
    // Rescheduling and cancellation wording is Dwain's existing paid-meeting policy, quoted exactly.
    terms: ['Calendly shows the times that are available and the time zone they are in. No date is guaranteed until you book.', 'You pay the full US$479 on Calendly when you book. All taxes and processing fees are included.', 'Rescheduling: If you need to reschedule, please provide at least 48 hours’ notice.', 'Cancellations: For cancellations within 24 hours of the appointment, a 50% fee of the consultation rate will apply.', 'Your Zoom meeting details are sent with your Calendly booking confirmation.'],
    // Shown only while no verified booking link exists.
    status: 'Booking for the virtual meeting is not open on this page yet.',
    // Root verified the Calendly event (two-hour-private-virtual-meeting-with-dwain) in native-offers.mjs.
    pending: [], productId: 'prod_VUGRThRNPwj1wf' },
  // Training price comes from the chosen track (TRACKS). Session dates and the monthly software fees are confirmed by
  // Dwain. The fees sit in `billing` so they show under the price on the card AND the details page, before any purchase.
  // Dwain approved a one-time Stripe training purchase per track (group_operations / group_sales / group_both) while the
  // later subscription details are unsettled. `terms` holds only known facts plus plain disclosures of what is not yet
  // specified; it invents no access, recording, support-schedule or refund rule. A checkout shows only for a track whose
  // verified URL root has added; otherwise `status` shows.
  { id: 'group', title: 'Software Onboarding and Guided Training, Then Monthly Support', price: 'US$249', cadence: 'One-time',
    lede: 'Get set up in the software that fits your business and learn to use it: four weekly guided sessions on Wednesdays, November 4, 11, 18 and 25, 2026, from 2 to 3:20 p.m. Antigua time (1 to 2:20 p.m. Toronto time), then monthly group support during your first six months.',
    billing: 'One-time training fee for each choice, including all taxes and processing fees. This is a training fee, not ongoing software access. After the training, the software is a separate monthly subscription: US$179 a month for SnapSuite or for LeadScore (up to 5 users), or US$349 a month for both, plus US$29 a month for each additional user. All monthly prices include taxes and fees.',
    summary: 'Software onboarding and guided training in a small group. The four 80-minute sessions are on Wednesdays, November 4, 11, 18 and 25, 2026, from 2 to 3:20 p.m. Antigua time (AST, UTC−4). That is 1 to 2:20 p.m. in Toronto (America/Toronto) and 18:00 to 19:20 UTC. After the training, monthly group support continues during your first six months. Plan to attend each session and put what you learn to work between sessions.',
    included: ['Software onboarding for the software you choose', 'Guided training: four 80-minute sessions on Wednesdays, November 4, 11, 18 and 25, 2026', 'Monthly group support during your first six months'],
    excluded: ['Ongoing software access after the training. It is a separate monthly subscription, priced above.'],
    terms: [
      'This is a one-time training fee: US$249 for Operations, US$249 for Sales, or US$398.40 for Both, including all taxes and processing fees.',
      'Prices are in US dollars. On Stripe, choose the USD amount shown for your training choice (USD $249 or USD $398.40) to pay exactly that total. A local-currency price includes Stripe’s conversion cost.',
      'It covers onboarding for the software you choose, four 80-minute guided sessions on Wednesdays, November 4, 11, 18 and 25, 2026, from 2 to 3:20 p.m. Antigua time (1 to 2:20 p.m. Toronto time), and monthly group support during your first six months.',
      'Buying the training does not start a software subscription. After the training, the software is US$179 a month for SnapSuite or for LeadScore (up to 5 users), or US$349 a month for both, plus US$29 a month for each additional user, all including taxes and fees. When monthly billing starts and when it renews will be agreed with you before any monthly charge.',
      'Still to be confirmed separately: whether you can use the software during the training, the monthly support dates and when the six months begin, and whether sessions are recorded.',
      // Dwain-approved refund policy for the one-time training fee. It says nothing about subscription cancellation or after the cutoff.
      'You can ask for a refund of the one-time training fee until 2 p.m. Antigua time (1 p.m. Toronto time) on Tuesday, November 3, 2026, 24 hours before the first session. The refund is the amount you paid minus the actual processing fees that are not returned to us.',
    ],
    // Shown only for a track with no verified checkout URL.
    status: 'Online payment for this group training is not open on this page yet.',
    pending: ['Software access during the training', 'First monthly software charge date and renewal', 'Monthly support dates and when the six months begins', 'Recordings', ...commonPending], productId: 'prod_VUGwHRp60qOa18' },
  { id: 'solo', title: 'Business Essentials Plan for Solo Business Owners', price: 'US$49', cadence: 'Monthly',
    lede: 'A monthly plan for people who run their business on their own. The exact features, usage limits and support are still being finalized, and you will see them in full before you can subscribe.',
    billing: 'US$49 is charged every month, including all taxes and processing fees. If you add the optional US$97 course, your first payment is US$146 (your first month at US$49 plus the one-time US$97 course), then US$49 a month. The course is never charged again.',
    summary: 'A monthly business essentials plan for people who run their business on their own. The exact features, usage limits and support are still being finalized.',
    included: ['A monthly business essentials plan for one-person businesses'],
    excluded: ['Unlimited consulting', 'Advanced automation', 'The optional US$97 course, unless you add it below'],
    terms: [], status: 'Before you can subscribe, you will see the exact features, usage limits and support, the start date, the renewal date and how cancellation works.',
    pending: ['Exact features, usage limits and support', 'Subscription start and renewal date', 'When the course details will be emailed to you', ...commonPending] },
  { id: 'dinner', title: 'Shared Dinner With Dwain, Plus Two Private Video Follow-Ups', price: 'US$1,500', cadence: 'Per person',
    lede: 'A small shared dinner with Dwain, with five paid places, planned for Wednesday, October 28, 2026 at 7:30 p.m. (Antigua time). Your place includes TWO private one-to-one video follow-up sessions with Dwain afterwards.',
    billing: 'Price per person, including all taxes and processing fees.',
    summary: 'This is a shared dinner, not a private one, planned for Wednesday, October 28, 2026 at 7:30 p.m. Antigua time (UTC−4), separate from the onsite consultations.',
    included: ['A place at a small shared dinner with five paid places', 'TWO private one-to-one video follow-up sessions with Dwain'],
    excluded: ['A private dinner for you alone', 'Unlimited access to Dwain'],
    terms: [], status: 'Dinner booking is not open yet. The venue, the meal and drinks, how long the dinner lasts, and the length and booking window of the follow-ups have not been set. The cancellation and refund terms will be shown before you can book.',
    pending: ['Dinner venue and duration', 'Exactly which meal and drinks are included', 'Follow-up lengths and booking window', ...commonPending], productId: 'prod_VUGyJFviXCeOC5' },
];
// Current policy (Dwain): any business may buy a paid seat. The seat block is still presented on the 10+ path only;
// that is display targeting, not purchase eligibility.
export const SEMINAR = {
  id:'seminar_seat',productId:'prod_VUGvcSJE0RGfhO',title:'Reserve Your Named Seat at the Seminar',price:'US$249',cadence:'One-time',
  lede:'A seat held in your name until 7:15 p.m. Only five paid seats are available, and seat sales close at noon on October 27, Antigua time.',
  billing:'Flat one-time price, including all taxes and processing fees.',
  summary:'The seminar is on Tuesday, October 27, 2026, 7–9 p.m. Antigua time (UTC−4), at the Azure Conference Hall, Trade Winds Hotel. Attending is free, first come, subject to space. Any business can buy a paid seat. A paid seat is optional: it reserves a seat in your name, held until 7:15 p.m.',
  included:['One seat reserved in your name for each successful payment','Your seat is held until 7:15 p.m. If you have not arrived by then, it is released.'],
  excluded:['The separate group training','Consultations and the dinner'],
  terms:['Any business can buy a paid seat.','There are five paid seats in total. Stripe shows whether a seat is still available when you pay.','Seat sales close at noon on Tuesday, October 27, 2026, Antigua time.','Cancel by 7 p.m. on Monday, October 26, 2026 (Antigua time), at least 24 hours before the seminar, for a refund of the amount you paid minus the actual processing fee Stripe keeps. Cancellations after that are not refunded.','Prices are in US dollars. Choose USD $249 on Stripe to pay exactly US$249. A local-currency price includes Stripe’s conversion cost.','Free attendance is still first come, subject to space. You do not need a paid seat to attend.'],
  status:'Paid seat booking is not open on this page right now. Free attendance is still first come, subject to space.',
  pending:['Verified current inventory for the five paid-seat allocation','Confirmed payment, allocation and check-in connection'],
};
// Confirmed seat sales cutoff: noon October 27, 2026, Antigua time (UTC−4) = 16:00Z.
// Client-side only; the Stripe link itself must be closed by the provider/backend.
export const SEAT_SALES_CLOSE_AT = Date.UTC(2026, 9, 27, 16, 0, 0);
export const SEMINAR_ENDS_AT = Date.UTC(2026, 9, 28, 1, 0, 0);
export const seatSalesOpen = (now = Date.now()) => now < SEAT_SALES_CLOSE_AT;
// The paid-seat block is presented on the 10+ path only. Display targeting, not purchase eligibility (see SEMINAR).
export const seatOffered = employees => employees === '10_plus';
// The no-purchase path. Not a paid offer, so it stays outside OFFERS and never reaches review or checkout.
export const FREE = { id: 'free', title: 'Free Guides to Get Started on Your Own', price: 'Free', cadence: 'No purchase', billing: 'No purchase or card needed.', lede: 'Download two practical guides today: a job-to-invoice checklist and a practical AI workflow. A free DIY course and a Friday live Q&A are coming; their links are not ready yet.' };
// Organization path primary offer: an initial virtual introduction for staff and directors bringing these tools to an
// organization of 30+ employees. Its length and any cost are not set (price ''), and it has no terms, so it is never
// bookable until root verifies a matching event and its terms are added. It is not the paid US$479 virtual meeting.
export const ORG_INTRO = { id: 'org_intro', title: 'Initial Virtual Introduction for Your Organization', price: '', cadence: '',
  lede: 'Want to bring practical AI and business tools to your boss or your organization? Start with an initial virtual introduction and presentation from Dwain, for organizations with 30 or more employees.',
  billing: 'The length and any cost will be confirmed before you can book.',
  summary: 'An initial virtual introduction and presentation from Dwain for staff and directors, including in government, who want to bring practical AI and business tools to an organization with 30 or more employees.',
  included: ['An initial virtual introduction and presentation with Dwain'], excluded: [], terms: [],
  status: 'Booking for the introduction is not open on this page yet. Its length and any cost will be confirmed before you can book.',
  pending: ['Matching Calendly event, length and any cost'] };
// The first offer is the lead card; a second is a quieter secondary card. also: one small text link under the lead.
// Every other offer stays under "Explore other options". freeAfter: a quiet free-resources line follows the lead card.
// 'free' as an offer id means the FREE guides card. title is the page h1: who the page is for, never a repeat of a card title.
export const SIZE_PATHS = {
  organization: { eyebrow: 'I WORK FOR AN ORGANIZATION', title: 'For people who work for an organization', intro: 'For staff and directors, including in government, who want to bring practical AI and business tools to their organization.', offers: ['org_intro'], freeAfter: true },
  solo: { eyebrow: 'JUST ME', title: 'For people who run a business on their own', intro: 'Starting out, or running your business on your own, is completely okay. The right tools can help you get started.', offers: ['solo'], freeAfter: true },
  '1_4': { eyebrow: '1–4 EMPLOYEES', title: 'For businesses with 1–4 employees', offers: ['group'], also: 'virtual' },
  '5_9': { eyebrow: '5–9 EMPLOYEES', title: 'For businesses with 5–9 employees', offers: ['group'], also: 'virtual' },
  // intro: a short larger-company lead-in above the two cards. introCalendly is added only while the verified onsite link is live.
  '10_plus': { eyebrow: '10+ EMPLOYEES', title: 'For businesses with 10+ employees', intro: 'Your business already has systems and processes. Dwain can help you refine them. Choose a limited onsite appointment while he is in Antigua on Wednesday, October 28, or a private virtual meeting at a later date.', introCalendly: 'Calendly shows which onsite times are still available.', offers: ['onsite', 'virtual'], featured: 'onsite' },
  unknown: { eyebrow: 'NOT SURE OF SIZE', title: 'Good places to start', offers: ['group'], also: 'virtual' },
};
// The organization path applies only to an explicit choice (segment), never to an unknown headcount.
export const sizePath = (employees, segment = null) => segment === 'organization' ? SIZE_PATHS.organization : employees && employees !== 'organization' && SIZE_PATHS[employees] || SIZE_PATHS.unknown;
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
export function offer(id) { return id===SEMINAR.id?SEMINAR:id===ORG_INTRO.id?ORG_INTRO:OFFERS.find(item => item.id === id); }
