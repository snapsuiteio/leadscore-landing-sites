// Same dependency-free Bun/static HTML approach as apps/dwain-me.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = import.meta.dir;
const source = join(root, 'src');
const output = join(root, 'dist');
const html = readFileSync(join(source, 'index.html'), 'utf8');
if (!html.includes('Review preview') || /<form[^>]+action=/i.test(html)) {
  throw new Error('Preview disclosure and inert form contract must be preserved.');
}
rmSync(output, { recursive: true, force: true });
mkdirSync(join(output, 'antigua'), { recursive: true });
writeFileSync(join(output, 'antigua/index.html'), html);
for (const file of ['styles.css', 'page.mjs', 'campaign.mjs', 'resources']) {
  cpSync(join(source, file), join(output, 'antigua', file), { recursive: true });
}
// Only the flag, the two approved photos and the labelled seminar illustration are copied;
// review ad PNGs stay in src/assets and are not served.
mkdirSync(join(output, 'antigua/assets'), { recursive: true });
for (const asset of ['flag.svg', 'dwain-browne.JPG', 'trade-winds.jpg', 'seminar-preview.png']) {
  cpSync(join(source, 'assets', asset), join(output, 'antigua/assets', asset));
}
writeFileSync(join(output, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
console.log('Built review preview: dist/antigua/index.html (capture disabled)');
