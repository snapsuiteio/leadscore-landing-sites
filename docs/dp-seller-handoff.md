# DP Value Partners seller landing-page packet

This isolated seller page uses the established Antigua static landing-site architecture.
Its base is the actual Antigua release `2bdeeefcd185dac9cd826deaadcec8798215acf1`.
No Antigua source, export, form contract, manifest entry, campaign, price or asset is changed.
The DP investor portal, backend, calling, SMS and pipeline files are excluded.

## Source and preview

The page is under `source-packets/dp-seller/`. It follows Nicole's supplied visual
system: navy `#06184E`, brownstone `#7B3325`, sandstone `#C89B6D`, limestone `#F4EFE7`,
Libre Caslon Text headings and Archivo body. Fonts and their OFL licenses are self-hosted.
The exact existing house mark and selected A01/A02/A03/A05 creative files are retained.
No new images, testimonials, numerical claims, ownership claims, guarantees or financial
offering content are introduced. CSS presents the relevant photograph from each original
creative; its representative/illustrative disclosure remains explicitly below the image.

The four openings preserve the selected headlines exactly. The remainder of the page
explains the property conversation, collects the approved questions and contact details,
answers practical questions and presents a plain inline privacy notice. No automatic
privacy popup, optional tracker, investor link or external font request is present.

Run its build and rendering checks only on the existing authorized OVH runner. The build
defaults to a preview with no capture endpoint. `dist/index.html` is the modular page and
`dist/preview.html` is an offline HTML preview with inline CSS/JS and adjacent local assets.
Validation says "nothing submitted" and never fakes a saved request.

## Seller form and real integration boundary

Dale's exact five questions/options are retained in `src/contract.mjs` and the independent
approved-question snapshot. Contact fields are full name, email, phone and property address,
city and state. No option is excluded or treated as a hard eligibility threshold.
Fixed internal fields are `intent=seller_enquiry` and one of `A01/A02/A03/A05`.

`capture.mjs` uses the byte-identical existing Antigua headless adapter: immutable request
ID across uncertain retries, memory-only answers/retry state, required Turnstile bridge,
strict published origin/page/revision/field/acknowledgement compatibility, marketing false,
and success only after an actual durable-save response containing a saved ID. This source
is implemented but inactive; no seller intake or backend receipt is invented.

The existing DP tenant is `de6b781c-e755-4a99-b841-ae5222325993`. Actual read-only inspection
on October 14 found two drafts (a buyer checklist and partner webinar) and no published
seller external form. The existing investor subscription cannot be reused. The missing
inputs are an approved seller list ID, pipeline type, stage/status keys, intentionally
reviewed tags and owner/unassigned destination. New credential grants are unnecessary for
the verified read-only operator access; publication authority is separate from that read.

Activation requires both an actual published integration export and an authenticated
seller routing receipt. The build checks the canonical tenant, seller-only destination,
page/list ownership, matching public-config hash/revision, exact fields/wording, private
stage/status/pipeline/tags, disabled playbooks, no payments and no optional trackers. It
cannot activate from a URL, preview fixture, invented default destination or investor list.

## Safe publication path

1. Verify the intended existing seller destination in LeadScore; preserve all investor
   subscriptions. Approve/create a DP-only external-form intake through the existing
   landing-pages service, using the prepared private contract and exact wording.
2. Validate and publish that intake with outreach disabled. Retain the exact private
   page/config and public integration export, destination review and actual revision.
3. Build this packet using those verified files on OVH. Append only the reviewed DP page
   and its hash allowlist to a candidate based on the actual currently selected public
   release. Preserve Antigua's complete manifest entry and all hashes byte-for-byte.
4. After the explicit publication hold is released, select that exact public candidate in
   the existing static-host release pointer and observe the existing Cloudflare workflow.
   No investor portal/backend deployment or Azure changes are needed for this architecture.
5. Verify the public page and actual routing. A controlled real capture test remains
   prohibited in this task; obtain specific authority before sending any test lead. No
   email, SMS, automated reply, payment or Meta campaign launch is part of this packet.

The prospective path is `/p/dp-value-partners/sell-as-is/` on the existing landing host,
with `?angle=A01`, `A02`, `A03` or `A05`. It is not currently registered or deployed.
Meta campaign publication and billing remain with the existing Meta owner and parent.
