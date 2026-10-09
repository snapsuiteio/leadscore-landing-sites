// Angle openings share one program, offer and form. `short` is the mobile line shown before the video.
export const HEROES = {
  seminar: {
    label: 'Direct business seminar',
    audience: 'Running a business in Antigua?',
    first: 'Still catching up on', last: 'paperwork at night?',
    short: 'A free, guided, in-person workshop: put software and AI to work on paperwork.',
    description: 'After a full day with customers, the receipts, invoices and follow-ups are still waiting, and they usually end up being done at night. At this free, live, in-person workshop in Antigua, Dwain walks you through practical ways software and AI can help with that work, one guided step at a time. You then map one recurring task from your own business and take home a workflow map, reusable AI prompts and a seven-day action plan.',
    pains: ['Job details to chase', 'Follow-ups to keep track of', 'Receipts and invoices to sort'],
    focus: 'Planned focus: the jobs, follow-ups and paperwork that keep waiting until after hours.',
  },
  snapsuite: {
    label: 'Jobs to billing with SnapSuite',
    audience: 'Running a business in Antigua?',
    first: 'Chasing job details', last: 'before you can invoice?',
    short: 'A free, guided, in-person workshop: get job details ready for billing.',
    description: 'The job is finished, but the invoice is stuck because someone still has to track down the hours, the materials and the customer’s approval. This free, live, in-person workshop in Antigua shows, step by step, how practical software and AI can help you capture those details while the work is happening, so the office has what it needs to bill. You then map one recurring task from your own business and take home a workflow map, reusable AI prompts and a seven-day action plan.',
    pains: ['Labour and materials not written down', 'Extra work without a recorded approval', 'Invoices waiting on missing details'],
    focus: 'Planned focus: the handoff between a finished job and an invoice that is ready for review.',
  },
  ai: {
    label: 'Practical AI for operations',
    audience: 'Running a business in Antigua?',
    first: 'Not sure how to use AI', last: 'to run your business?',
    short: 'A free, guided, in-person workshop: use AI on everyday business tasks.',
    description: 'You keep hearing about AI, but it is hard to see where it fits into the work you already do. At this free, live, in-person workshop in Antigua, Dwain shows you step by step how to use it for everyday tasks, such as drafting a customer reply from a spoken note or getting receipts and invoices in order, and where you still need to check the result yourself. You then map one recurring task from your own business and take home a workflow map, reusable AI prompts and a seven-day action plan.',
    pains: ['Replies still in your head', 'Next steps buried in voice notes', 'Paperwork without a clear record'],
    focus: 'Planned focus: starting with a task you already do, like drafting a reply or getting paperwork in order.',
  },
};

export const INTENTS = new Set(['event']);
export const CONSENT_VERSION = 'antigua-free-application-2026-10-09-v1';
export const REQUEST_CONSENT = 'I am requesting a free seat at the October 27 seminar. SnapSuite will review my application manually. Applying does not guarantee acceptance or reserve a seat.';
export const MARKETING_CONSENT = 'Also send me occasional software and AI tips by email. Optional; I can unsubscribe.';

export const APPLICATION_FIELDS = [
  {
    "id": "full_name",
    "label": "Your name",
    "type": "text",
    "required": true,
    "name": "name"
  },
  {
    "id": "work_email",
    "label": "Email",
    "type": "email",
    "required": true,
    "name": "email"
  },
  {
    "id": "company_name",
    "label": "Company",
    "type": "text",
    "required": true,
    "name": "company"
  },
  {
    "id": "phone",
    "label": "Phone number",
    "type": "phone",
    "required": true,
    "name": "phone"
  },
  {
    "id": "intent",
    "label": "Seminar request",
    "type": "select",
    "required": true,
    "options": [
      "event"
    ],
    "name": "intent"
  },
  {
    "id": "source_angle",
    "label": "Page opening",
    "type": "select",
    "required": true,
    "options": [
      "seminar",
      "snapsuite",
      "ai"
    ],
    "name": "source_angle"
  }
];

export function resolveAngle(search) {
  const candidate = new URLSearchParams(search).get('angle');
  return Object.hasOwn(HEROES, candidate || '') ? candidate : 'seminar';
}

export function attributionFrom(search) {
  const params = new URLSearchParams(search);
  const record = { source_angle: resolveAngle(search) };
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ad_id', 'fbclid', 'gclid']) {
    const value = params.get(key)?.trim();
    if (value) record[key] = value.slice(0, 200);
  }
  return record;
}

export function validateInterest(input) {
  const clean = (key) => typeof input[key] === 'string' ? input[key].trim() : '';
  const values = { name: clean('name'), email: clean('email').toLowerCase(), company: clean('company'), phone: clean('phone'), intent: 'event' };
  const errors = {};
  for (const [key, label, max] of [['name', 'your name', 100], ['company', 'your company', 150]]) {
    if (!values[key]) errors[key] = `Please enter ${label}.`;
    else if (values[key].length > max) errors[key] = `Please use ${max} characters or fewer.`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 254) errors.email = 'Please enter a valid email address.';
  if (!values.phone || !/^\+?[\d\s().-]+$/.test(values.phone) || values.phone.replace(/\D/g, '').length < 7 || values.phone.replace(/\D/g, '').length > 15) errors.phone = 'Please enter a valid phone number.';
  if (input.requestConsent !== true) errors.requestConsent = 'Please acknowledge that applications are reviewed and acceptance is not guaranteed.';
  return { values, errors, valid: Object.keys(errors).length === 0 };
}
