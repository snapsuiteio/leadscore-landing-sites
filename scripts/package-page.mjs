import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Explicit compiled export only. No private repository files or history are copied.
const [sourceDirectory, hostRoot, tenantSlug, pageSlug, publicSourceCommit, reviewApproval, configUrl, revision] = process.argv.slice(2);
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const enabled = reviewApproval === '--reviewed-headless-export';
if (!sourceDirectory || !hostRoot || !slug.test(tenantSlug || '') || !slug.test(pageSlug || '') || !/^[a-f0-9]{40}$/.test(publicSourceCommit || '') || !['--reviewed-static-export', '--reviewed-headless-export'].includes(reviewApproval)) throw new Error('Usage: node package-page.mjs <compiled-page-dir> <host-root> <tenant-slug> <page-slug> <public-source-commit> --reviewed-static-export OR --reviewed-headless-export <published-config-url> <revision> (requires completed publication, rights and capture review)');
if (enabled) {
  const url = new URL(configUrl);
  if (url.origin !== 'https://pages.getleadscore.ai' || !/^\/f\/[a-zA-Z0-9]{16,64}\/config$/.test(url.pathname) || url.search || url.hash || url.username || url.password || !/^[1-9]\d*$/.test(revision || '')) throw new Error('Exact published LeadScore configuration URL and revision required');
}
const source = path.resolve(sourceDirectory);
const root = path.resolve(hostRoot);
const target = path.join(root, 'sites/exports', tenantSlug, pageSlug);
const route = `/p/${tenantSlug}/${pageSlug}/`;
await mkdir(target, { recursive: true });
const files = {};
async function copyFiles(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Symlinked exports are not supported');
    const relative = prefix + entry.name;
    if (entry.isDirectory()) await copyFiles(path.join(directory, entry.name), relative + '/');
    else {
      const destination = path.join(target, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      const bytes = await readFile(path.join(directory, entry.name));
      if (['.html', '.css', '.js', '.mjs', '.txt', '.svg'].includes(path.extname(relative).toLowerCase())) {
        let text = bytes.toString('utf8').replaceAll('\r\n', '\n');
        if (relative === 'index.html') text = text.replaceAll('/antigua/', route);
        await writeFile(destination, text);
      } else await writeFile(destination, bytes);
      files[relative] = createHash('sha256').update(await readFile(destination)).digest('hex');
    }
  }
}
await copyFiles(source);
const registry = JSON.parse(await readFile(path.join(root, 'sites/manifest.json'), 'utf8'));
if (registry.version !== 1 || !Array.isArray(registry.pages)) throw new Error('Invalid existing registry');
const page = { tenantSlug, pageSlug, sourceCommit: publicSourceCommit, publicationApproved: true, rightsCleared: true, ...(enabled ? { captureReviewed: true, capture: 'enabled', integration: { configUrl, revision: Number(revision), payments: 'disabled', automatedOutreach: 'disabled' } } : { captureDisabledReviewed: true, capture: 'disabled' }), files };
registry.pages = registry.pages.filter(existing => existing.tenantSlug !== tenantSlug || existing.pageSlug !== pageSlug);
registry.pages.push(page);
await writeFile(path.join(root, 'sites/manifest.json'), JSON.stringify(registry, null, 2) + '\n');
console.log(JSON.stringify({ route, fileCount: Object.keys(files).length, capture: page.capture }));
