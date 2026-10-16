# Shared landing-page releases

The hosting pipeline supports multiple tenant/page packages. Each enabled page has its own published configuration URL, revision, configuration SHA-256 and tracker SHA-256. The preflight reads the live public contract with the actual website Origin and verifies the contract and tracker before deployment. No company name, tenant ID, question set or tracking provider ID is embedded in the shared deployment checks.

`sites/manifest.json` and `sites/exports` remain the staged authoring exports. `PUBLIC_EXPORT_SET=release` selects `sites/release-manifest.json` and `sites/releases` for the reviewed deployment. This separation preserves unrelated staged work while allowing each deployed page to retain its exact approved files. Unknown export-set values fail the build. The currently selected Antigua release files are copied byte-for-byte from public commit e0c548924ff6e35c612dd18514f523adba2361d1.

For every enabled package, review the authenticated routing separately; never publish that routing receipt, credentials or private account details. Export only public configuration data. A successful build does not prove real CRM delivery, DNS or ad delivery.

The DP seller source now maps its website fields to the published headless contract, includes borough qualification without automatic rejection, and allows compatible later revisions so updating tracking settings does not break capture. Optional statistics use the shared consent-gated tracker and public form configuration. Provider IDs remain managed within LeadScore. Submissions work without optional tracking consent. Tracking counts can be lower than visits because of consent choices and blocked requests.
