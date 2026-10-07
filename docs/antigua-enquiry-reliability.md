# Antigua enquiry reliability

The three public openings share one published enquiry intake. Each visit and
submission keeps its `source_angle`: seminar, ai or snapsuite. Separate draft
sales pages are not these three openings.

This source update preserves the native video player and media. It adds the
shared tracker, explicit analytics/marketing consent, Antigua phone formatting,
visible error feedback and navigation to the signed confirmation URL returned
only after the enquiry is saved. A saved enquiry is not a payment, booked seat
or proof that CRM delivery finished.

## Coordinated publication

The public form expects configuration revision 2. Before promoting this export,
publish the matching LeadScore intake configuration with real variant URLs and
the repaired worker/API. The manifest's `sourceCommit` identifies the browser
bundle source. Do not deploy these assets against revision 1: the adapter
intentionally rejects mismatched configuration.

Add the intended Meta Pixel ID, GA4 measurement ID and Microsoft Clarity project
ID through the authenticated landing-page tracking settings. No provider IDs or
access tokens are invented or embedded in this repository. Browser tracking
starts only after the relevant consent. The CSP permits fixed supported provider
origins; it does not itself enable analytics. Meta Lead uses the saved submission
ID for duplicate prevention. This change does not add server-side Meta CAPI.

## Validation and acceptance

Run `npm test`, then build with `PUBLIC_HOST_COMMIT` set to the full current Git
commit. The packager validates allowlisted bytes, checks for credentials and
rejects unsafe files or unreviewed tracking configuration. Local backend/browser
journey tests reside with the private application's worker and campaign source.

After human production promotion, verify each opening on the deployed public
origin: consented attributed visit, invalid/valid phone feedback, durable enquiry,
separate signed thank-you page, correct variant, and a usable CRM lead and note
or an explicit recoverable review state. Check provider test events and the
actual published release commit. Synthetic records must be marked internal tests
in the submissions UI. Existing enquiries are not replayed by this public build.
