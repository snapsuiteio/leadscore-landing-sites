// Dependency-free static campaign export.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const source = join(root, 'src');
const output = join(root, 'dist');
const html = readFileSync(join(source, 'index.html'), 'utf8');
if (!html.includes('data-leadscore-capture="disabled"') || /<form[^>]+action=/i.test(html)) {
  throw new Error('Preview disclosure and inert form contract must be preserved.');
}
rmSync(output, { recursive: true, force: true });
mkdirSync(join(output, 'antigua'), { recursive: true });
writeFileSync(join(output, 'antigua/index.html'), html);
for (const file of ['styles.css', 'page.mjs', 'campaign.mjs', 'resources']) {
  cpSync(join(source, file), join(output, 'antigua', file), { recursive: true });
}
// Serve only the authorized portrait, flag and approved seminar illustration.
// Venue-photo publication permission is unresolved; review artwork stays private.
mkdirSync(join(output, 'antigua/assets'), { recursive: true });
for (const asset of ['flag.svg', 'dwain-browne.JPG', 'seminar-preview.png']) {
  cpSync(join(source, 'assets', asset), join(output, 'antigua/assets', asset));
}
writeFileSync(join(output, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
console.log('Built public visual page: dist/antigua/index.html (capture disabled)');
