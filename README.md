# LeadScore landing sites

Sanitized static hosting for approved LeadScore landing pages on Cloudflare Workers.
This repository has its own fresh history. It contains no private application code,
backend credentials, customer records, or intake implementation.

The reviewed Antigua visual export and three openings are packaged under
`/p/snapsuite-antigua/antigua/`; see [the source checkpoint](docs/antigua-source-checkpoint.md).
Signup is unavailable until the shared form integration is verified. The form
checks entries locally and sends nothing. No tracking providers, payments or
outbound automations are activated. Deployment status comes from the actual
production receipt.

Run `node --test test/build.test.mjs` to validate the packager and
`node scripts/build.mjs` to package reviewed exports. No dependencies are needed.

Each approved page occupies `/p/<tenant-slug>/<page-slug>/` with its own asset
folder. The manifest owns the mapping; visitors cannot configure tenant routing.
Unregistered paths return 404 rather than another page's application shell.
These routes serve public content and are not a tenant authentication boundary.

See [publication instructions](docs/publication.md). Deployment uses the existing
private deployment pipeline, keeping Cloudflare credentials outside this public
repository. The actual workers.dev address must come from the successful
deployment result; no domain or DNS changes are configured here.
