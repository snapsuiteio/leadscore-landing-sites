# Antigua free screened application candidate

Prepared October 9 from the exact deployed public release
`4420c628d5d3c99b287ae1499927993a2a003123`, preserving all approved media,
player, styles and tracking. Private source commit is
`944526b8d5dc66f5b8492535d20f113b89c208e1`.

All three openings use “Request a free seat.” Applications receive manual review;
submission does not guarantee acceptance or reserve a seat. Around 30 attendees
are projected, not confirmed capacity. Trade Winds Hotel has no confirmed hold.

The shared schema is in `source-packets/antigua/src/campaign.mjs` and validated
strictly by `capture.mjs`. Required visible fields are name, email, phone,
business name/type, operating status, attendee role, registration status,
years operating, team size and main operational challenge. Hidden server-export
questions retain fixed `intent=event` and bounded `source_angle`. There are no
hard eligibility thresholds, financial questions or demographic questions.
Marketing consent stays false and separate tracking choices are preserved.
Attendee payments and automated outreach remain disabled.

The existing intake key is unchanged. Proposed revision 5 is an anticipated
publication contract, not a published export or real-delivery receipt. Preserve
private routing/ownership/tag/playbook and tracking settings when applying the
matching questions and acknowledgement; do not overwrite private configuration
from the public export. Existing static deployment gates must still compare the
actual published contract and revision before selecting this candidate.

Source tests and builds do not establish a real saved application, ongoing Sheet
delivery, email delivery or seat acceptance. The private deployment owner has the
existing designated Sheet schema/readback and a prepared paired workflow patch.
Do not deploy this candidate until matching intake publication, persistent Sheet
connection and real capture are coordinated and verified. The old payment
candidate is obsolete. No Azure or separate provider deployment is required.

Public dev contains a separate staged reliability export that is not live. Keep
that work intact; retain this exact candidate in dev ancestry without replacing
that staged tree, then use the exact reviewed candidate SHA for the static
release pointer only after the coordinated gates pass.

Exact held static candidate: `af0cc205fe6bcaef3ad8bd53f6bbc0ba576e6737`.
This candidate is retained in dev ancestry. The live pointer is unchanged, and
the staged dev export has deliberately not been replaced with this candidate.
