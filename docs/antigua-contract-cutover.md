# Antigua form and analytics cutover

This candidate is prepared for coordinated publication. The deployed recovery is
revision 2; committing or pushing this public source does not publish the site.
Do not select this candidate in the private release pointer until the matching
intake draft and both publication steps are reviewed and approved.

## Contract

Keep the existing intake key and history. The next expected revision is 3.
Keep required `full_name:text`, `work_email:email`, `company_name:text`, and
`phone:phone`. Remove `message`. Keep required internal `intent:select` with only
`event`, and `source_angle:select` with `seminar`, `snapsuite`, `ai`.

The required acknowledgement version is `antigua-seminar-details-2026-10-07-v1`.
Its exact wording is:

> Please email me details about the paid October 27 seminar (US$249 working standard price). This request does not reserve or pay for a seat.

Marketing remains optional in the shared contract but is never requested by the
visible form and is always false in its payload. Preserve security, allowed
origins, private routing, lead source, tags and disabled automation settings.
Do not replace the full settings document with a public integration export.

## Validation and recurrence guard

Run `node --test test/*.test.mjs source-packets/antigua/test/*.test.mjs`.
The isolated browser suite is `test/antigua-tracking.browser.mjs`; provide the
existing Playwright module through `PLAYWRIGHT_MODULE`. Every request is
intercepted: its synthetic accepted responses prove adapter behavior, not a
real saved CRM record or delivered email.

The private deployment workflow runs the live preflight both before packaging
and immediately before deployment:

```sh
PUBLIC_SITE_ORIGIN=https://leadscore-landing-sites.snapsuite-f2f.workers.dev node scripts/preflight-tracking.mjs
```

The gate checks revision, field IDs/types/requiredness/options, acknowledgement,
origin, Turnstile, provider bindings and the integrity-pinned tracker. A stale
revision, unknown field or changed acknowledgement blocks deployment. Runtime
capture keeps the same strict compatibility check and never substitutes answers.

This static workflow cannot prevent someone pressing Publish in LeadScore.
Every future intake publication, including a tracking-only settings edit, needs
a prepared, tested adapter for its next revision before cutover. The intake owner
must coordinate with the static release owner; do not publish independently.

## Consent runtime and CSP

GA4 `G-9T3RDM7NKZ` is bound in the static consent module. Clarity `yu2abnu53o`
uses the existing shared tracker and Strict masking. Do not add Google/GTM/Meta
to intake settings without a reviewed runtime update: duplicate-provider checks
fail closed. Google advertising storage, user data and personalization remain
denied; no advertising SDK is configured. Analytics starts only after opt-in.
Withdrawal clears supported provider cookies and reloads the page. The banner
warns that this clears an unsent request. Optional provider failure leaves the
form usable.

Disable GA4 automatic form interactions, site search and browser-history
pageviews; retain email redaction. Manual views carry only bounded campaign data
and angle, with no field values or arbitrary URL. The setup-verification campaign
is marked internal. An accepted intake response alone triggers conversion;
rejected responses and button clicks do not.

CSP additions are limited to script sources `pages.getleadscore.ai`,
`www.googletagmanager.com`, and `*.clarity.ms`; image sources add the Google tag,
`*.google-analytics.com`, `*.clarity.ms`, `c.bing.com`; connection sources add the
Google tag, `*.google-analytics.com`, `*.google.com`, `*.clarity.ms`, and
`c.bing.com`. No Facebook or DoubleClick hosts, inline script or eval are enabled.
Existing form-action none and intake security-frame restrictions remain.

Google requires history pageviews to be disabled separately from
`send_page_view:false`: [GA4 manual pageviews](https://developers.google.com/analytics/devguides/collection/ga4/views).
Host allowlists follow [Google CSP guidance](https://developers.google.com/tag-platform/security/guides/csp)
and [Clarity CSP guidance](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-csp).

## Publication order and recovery

1. Keep ads paused. Complete draft-only intake changes, preserve/export the
   before state, verify the draft against this contract and confirm the next
   revision. Prepare the exact static SHA and private workflow/pointer change.
   Verify access to both publication actions before starting.
2. After approval of both publications, the sole intake owner publishes that
   draft once. Fetch the actual public integration JSON immediately and run the
   live preflight against the exact candidate. Do not change settings again.
3. If compatible, the static release owner immediately pushes the prepared
   private pointer/workflow to `dev`, triggering the existing production static
   host workflow. Observe the run through completion and verify the exact live
   release, all asset hashes, CORS/CSP and all three angles.
4. The browser owner verifies desktop/mobile form readiness and real opted-in
   labelled provider requests, then performs only the authorized labelled saved
   submission and recipient-only seminar-information response test. Check the
   durable Inbound entry, usable CRM record and actual delivered email separately.
   Keep ads paused until that acceptance evidence and spend approval are complete.

The two publications are not atomic. The prior recovery workflow took 80 seconds.
Plan for roughly 2–5 minutes of guarded unavailability after intake publication;
queues, approvals or deployment failures can extend it. Existing loaded revision
2 tabs must reload after the new release. There is no guaranteed zero-outage path
for this same-key required-field change.

Before the intake publication, abandoning the draft leaves the live recovery
unchanged. After revision 3 is published, reverting the static pointer to the
old revision 2 release would keep forms disabled and is not a valid rollback.
If deployment fails, retry the same exact compatible workflow/commit. If the
published contract unexpectedly differs, preserve its export, stop further
settings edits, and prepare a minimal reviewed adapter for the actual revision
(or a reviewed corrective next-revision pair). Never bypass validation. Optional
analytics failures are isolated from capture; a tracking defect can be corrected
in static source without publishing another intake revision.
