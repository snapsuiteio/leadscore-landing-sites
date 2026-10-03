# Import and publication

1. Obtain the exact approved source and build its static export using the
   original project's build tooling. Preserve existing components and design.
   Configure asset references for the chosen `/p/<tenant-slug>/<page-slug>/` base.
2. Review every exported file before copying only those assets into
   `sites/exports/<tenant-slug>/<page-slug>/`. Do not copy a monorepo, its history,
   internal notes, `.env` files, source maps, raw customer records, or credentials.
3. Clear rights for every photograph and illustration. A hotel's public website
   is not evidence of reuse permission. Resolve unclear rights before publication.
4. Disable lead submission in the approved page source and display a truthful
   review notice using `data-leadscore-capture="disabled"`. The host's CSP also
   blocks forms and outbound connections. It does not claim to capture leads.
5. Add a manifest entry with the source commit and exact SHA-256 of every file.
   Record `publicationApproved`, `rightsCleared`, and `captureDisabledReviewed`
   as true only after those reviews. No default approval is supplied.
6. Run tests and build, inspect the full public Git diff, commit and push to dev,
   then request deployment of that exact public commit through the existing
   deployment owner. The deployment must independently verify the live release
   manifest, HTML, assets, 404s, and mobile/desktop appearance on HTTPS.

Example structure (replace placeholders with reviewed values):

```json
{
  "version": 1,
  "pages": [{
    "tenantSlug": "approved-tenant",
    "pageSlug": "approved-page",
    "sourceCommit": "<40 lowercase hexadecimal characters>",
    "publicationApproved": true,
    "rightsCleared": true,
    "captureDisabledReviewed": true,
    "capture": "disabled",
    "files": { "index.html": "<64 lowercase hexadecimal characters>" }
  }]
}
```

The manifest stores public slugs, not customer records or privileged tenant IDs.
Existing backend tenant ownership must be resolved by the canonical LeadScore
headless form configuration when capture is eventually enabled. This host must
consume that shared public form contract, not implement a second intake endpoint.
Capture activation is a separate reviewed change; this scaffold rejects it.
Do not enable ads, tracking pixels, payments, CRM writes, email, or automations.

The file allowlist and common-secret scan supplement manual review; they cannot
prove that arbitrary text or media contains no private information. Browser QA
and a human review of the complete public diff remain publication requirements.

Cloudflare references: [static assets](https://developers.cloudflare.com/workers/static-assets/),
[HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/),
[headers](https://developers.cloudflare.com/workers/static-assets/headers/).
