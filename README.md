# LeadScore landing sites

Sanitized static hosting for approved LeadScore landing pages on Cloudflare Workers.
This repository has its own fresh history. It contains no private application code,
backend credentials, customer records, or intake implementation.

The reviewed Antigua visual export and three openings are packaged under
`/p/snapsuite-antigua/antigua/`; see [the source checkpoint](docs/antigua-source-checkpoint.md).
The release candidate has a four-field seminar enquiry and independently consented
GA4/Clarity tracking. Its matching intake contract and static release must be
published together through the coordinated process; source presence is not proof
of deployment. Payments and automated outreach remain disabled. See the
[contract cutover and acceptance procedure](docs/antigua-contract-cutover.md).

Run `node --test test/*.test.mjs source-packets/antigua/test/*.test.mjs` for the
unit and contract gates, then `PUBLIC_HOST_COMMIT=<exact-sha> node scripts/build.mjs`
to package the reviewed export. See the cutover procedure for isolated browser
checks and live preflight.

Each approved page occupies `/p/<tenant-slug>/<page-slug>/` with its own asset
folder. The manifest owns the mapping; visitors cannot configure tenant routing.
Unregistered paths return 404 rather than another page's application shell.
These routes serve public content and are not a tenant authentication boundary.

See [publication instructions](docs/publication.md). Deployment uses the existing
private deployment pipeline, keeping Cloudflare credentials outside this public
repository. The actual workers.dev address must come from the successful
deployment result; no domain or DNS changes are configured here.
