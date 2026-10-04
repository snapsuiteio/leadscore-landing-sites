# LeadScore landing sites

Sanitized static hosting for approved LeadScore landing pages on Cloudflare Workers.
This repository has its own fresh history. It contains no private application code,
backend credentials, customer records, or intake implementation.

The exact approved Antigua source is saved in `source-packets/antigua/`;
see [the source checkpoint](docs/antigua-source-checkpoint.md). It is available
to the hosting executor without the original Mac or private monorepo history.
Production publication and capture integration remain pending their verified gates.
`sites/manifest.json` deliberately contains no pages, and building it fails.
This repository is hosting infrastructure, not a published Antigua website.

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
