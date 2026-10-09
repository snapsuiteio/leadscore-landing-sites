# Antigua free manual-review interim release

This exact public candidate retains the existing six-field intake contract: four
contact inputs (name, email, company, phone), fixed event intent and bounded angle.
All three openings, metadata and calls to action describe free admission with
manual screening. The acknowledgement and inline receipt expressly say acceptance
is not guaranteed and submission does not reserve a seat. No Sheet delivery or
email confirmation is promised. Venue is provisional with no confirmed hold.

The full 13-field screened application remains preserved at public commit
`af0cc205fe6bcaef3ad8bd53f6bbc0ba576e6737`. Publishing this interim contract uses
revision 5; full rollout will require reinspection and a later matching revision.
Approved media, player, styles, tracking, dates and the form key are preserved.
Attendee payments and automated outreach stay disabled.

Private operator configuration was inspected through its existing service adapter.
Patch only the prepared acknowledgement/content/receipt against the exact verified
draft. Keep Warm Leads / Send More Info routing, the Antigua tag, ownership,
Turnstile and tracking unchanged. The private intake-only workflow performs no
Azure or provider deployment. The matching static path must pass live contract,
revision, security and tracker checks before deployment.

This release's source tests are not a real submission, Sheet or email receipt.
A labelled INTERNAL TEST needs coordinated exclusive browser access, actual
immutable saved-submission evidence and internal-test classification. Full Sheet
delivery remains pending an identified persistent OAuth client and selected-file
connection. Do not claim the full screened application is complete.
