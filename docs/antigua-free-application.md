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

The existing intake key is unchanged. Revision 6 is repinned from an actual read-only revision 5 inspection on October 9.
Dwain explicitly authorized publication of the qualification form and removal of
the obstructive mobile privacy popup. The popup is replaced by closed inline
settings; an ordinary privacy-policy link remains accessible. Existing affirmative
tracking choices remain valid, and a new visitor grants no optional tracking.
The exact paired intake must publish before this static revision is selected. Preserve
private routing/ownership/tag/playbook and tracking settings when applying the
matching questions and acknowledgement; do not overwrite private configuration
from the public export. Existing static deployment gates must still compare the
actual published contract and revision before selecting this candidate.

Source tests and builds do not establish a real saved application, ongoing Sheet
delivery, email delivery or seat acceptance. The private deployment owner has the
existing designated Sheet schema/readback and a prepared paired workflow patch.
The user-authorized form publication uses the existing intake service; no Google
grant is required for that publication. Persistent Sheet delivery, actual saved
capture and email delivery remain unverified and are not advertised as working. The old payment
candidate is obsolete. No Azure or separate provider deployment is required.

Public dev contains a separate staged reliability export that is not live. Keep
that work intact; retain this exact candidate in dev ancestry without replacing
that staged tree, then use the exact reviewed candidate SHA for the static
release pointer only after the coordinated gates pass.
