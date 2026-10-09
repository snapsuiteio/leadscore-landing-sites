// Dependency-free static campaign export.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const source = join(root, 'src');
const output = join(root, 'dist');
let html = readFileSync(join(source, 'index.html'), 'utf8');
if (!html.includes('data-leadscore-capture="disabled"') || /<form[^>]+action=/i.test(html)) {
  throw new Error('Preview disclosure and inert form contract must be preserved.');
}
const configUrl = process.env.ANTIGUA_CONFIG_URL;
if (configUrl) {
  const url = new URL(configUrl);
  const revision = process.env.ANTIGUA_CONFIG_REVISION;
  if (!/^[1-9]\d*$/.test(revision || '')) throw new Error('Use the exact published LeadScore form revision.');
  if ((!['https://pages.getleadscore.ai'].includes(url.origin) && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) || !/^\/f\/[a-zA-Z0-9]{16,64}\/config$/.test(url.pathname) || url.search || url.hash || url.username || url.password) throw new Error('Use the exact published LeadScore configuration URL.');
  html = html.replace('data-leadscore-capture="disabled"', 'data-leadscore-capture="enabled"')
    .replace('Signup is not available yet. No information is sent or saved.', 'Free admission · applications are reviewed manually. Acceptance is not guaranteed.')
    .replace('<form data-clarity-mask="true" id="interest-form"', `<form data-clarity-mask="true" id="interest-form" data-config-url="${url.href}" data-config-revision="${revision}"`)
    .replace('Signup is not available yet. Entries stay in this page’s memory and are cleared on reload; nothing is sent or saved.', 'Your details are used to review your free seat application and contact you about it. This does not sign you up for a newsletter, SMS or WhatsApp marketing. Acceptance is not guaranteed.')
    .replace('Check details — no submission', 'Request a free seat')
    .replace('Public details · signup not yet available', 'Free admission · screened applications')
    .replace('JavaScript is required to try this preview form. No request can be submitted here.', 'JavaScript and the security check are required to send your application. Acceptance is not guaranteed.')
    .replace('<strong>Signup is not available yet</strong><p>Try the fields with made-up information. This preview checks your entries in this browser only. It does not send or save them, create a lead or send email.</p>', '<strong>Free seat applications</strong><p>Request a free seat for October 27. SnapSuite reviews applications manually; acceptance is not guaranteed and no seat is confirmed on submission.</p>')
    .replace("connect-src 'none'", `connect-src 'self' ${url.origin}`)
    .replace('frame-src https://www.youtube-nocookie.com', `frame-src https://www.youtube-nocookie.com ${url.origin}`)
    .replace('<button id="preview-submit"', '<div hidden aria-hidden="true"><label>Leave empty<input name="website" autocomplete="off" tabindex="-1"></label></div><button id="preview-submit"');
}
rmSync(output, { recursive: true, force: true });
mkdirSync(join(output, 'antigua'), { recursive: true });
writeFileSync(join(output, 'antigua/index.html'), html);
for (const file of ['styles.css', 'campaign.mjs', 'native-player.mjs', 'tracking.mjs']) {
  cpSync(join(source, file), join(output, 'antigua', file), { recursive: true });
}
const bundle = await Bun.build({ entrypoints: [join(source, 'page.mjs')], target: 'browser', format: 'esm', minify: true });
if (!bundle.success) throw new Error(`Campaign script could not be built: ${bundle.logs.join('\n')}`);
const script = await bundle.outputs[0].text();
if (/api\/workers\/|\/Users\/|sourceMappingURL/.test(script)) throw new Error('Private source paths or source maps cannot enter the public campaign.');
writeFileSync(join(output, 'antigua/page.mjs'), script);
// Serve only the authorized portrait, flag, approved illustration and approved official hotel exterior photo.
mkdirSync(join(output, 'antigua/assets'), { recursive: true });
for (const asset of ['flag.svg', 'dwain-browne.JPG', 'seminar-preview.png', 'trade-winds-hotel-exterior.jpg', 'antigua-seminar-invite.mp4', 'antigua-seminar-poster.jpg']) {
  cpSync(join(source, 'assets', asset), join(output, 'antigua/assets', asset));
}
writeFileSync(join(output, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
console.log(`Built public visual page: dist/antigua/index.html (capture ${configUrl ? 'enabled' : 'disabled'})`);
