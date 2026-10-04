import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sha256 = /^[a-f0-9]{64}$/;
const extensions = new Set(['.html', '.css', '.js', '.mjs', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg', '.ico', '.woff', '.woff2', '.mp4', '.webm']);
const secret = /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b|\b(?:CLOUDFLARE_API_TOKEN|x-functions-key|x-snapsuite-key|x-snapsuite-worker-key)\b/i;

export const digest = data => createHash('sha256').update(data).digest('hex');
function requireThat(condition, message) { if (!condition) throw new Error(message); }
function safeRelative(name) {
  return typeof name === 'string' && name.length > 0 && !name.includes('\\') &&
    !name.includes(':') && !name.startsWith('/') && name.split('/').every(part => /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(part) && part !== '..');
}
async function listFiles(root, prefix = '') {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const name = prefix + entry.name;
    requireThat(!entry.isSymbolicLink(), `Symlink rejected: ${name}`);
    if (entry.isDirectory()) result.push(...await listFiles(path.join(root, entry.name), name + '/'));
    else { requireThat(entry.isFile(), `Non-file rejected: ${name}`); result.push(name); }
  }
  return result.sort();
}

export async function build(root, { publicCommit = process.env.PUBLIC_HOST_COMMIT } = {}) {
  root = await realpath(root);
  const manifest = JSON.parse(await readFile(path.join(root, 'sites/manifest.json'), 'utf8'));
  requireThat(manifest.version === 1 && Array.isArray(manifest.pages), 'Invalid manifest');
  requireThat(manifest.pages.length > 0, 'No approved page exports; publication blocked');
  requireThat(/^[a-f0-9]{40}$/.test(publicCommit || ''), 'Exact public hosting commit required');
  const routes = new Set();
  const exportsPath = path.join(root, 'sites/exports');
  const exportsRoot = await realpath(exportsPath);
  requireThat(exportsRoot === exportsPath && !(await lstat(exportsPath)).isSymbolicLink(), 'Export root symlink rejected');
  const packages = [];
  for (const page of manifest.pages) {
    requireThat(typeof page.tenantSlug === 'string' && typeof page.pageSlug === 'string' && slug.test(page.tenantSlug) && slug.test(page.pageSlug) && page.tenantSlug.length <= 80 && page.pageSlug.length <= 80, 'Invalid tenant/page slug');
    requireThat(/^[a-f0-9]{40}$/.test(page.sourceCommit || ''), 'Exact approved source commit required');
    requireThat(page.publicationApproved === true && page.rightsCleared === true && page.captureDisabledReviewed === true, 'Publication, asset rights, and inactive capture review required');
    requireThat(page.capture === 'disabled', 'Live capture requires the shared headless form integration; publication blocked');
    const route = `/p/${page.tenantSlug}/${page.pageSlug}/`;
    requireThat(!routes.has(route), `Duplicate route: ${route}`);
    routes.add(route);
    const source = path.join(exportsRoot, page.tenantSlug, page.pageSlug);
    const resolved = await realpath(source);
    requireThat(resolved.startsWith(exportsRoot + path.sep) && resolved === source, 'Export path escapes its registry location');
    for (const segment of [path.join(exportsRoot, page.tenantSlug), source]) requireThat(!(await lstat(segment)).isSymbolicLink(), 'Export directory symlink rejected');
    const files = page.files;
    requireThat(files && typeof files === 'object' && !Array.isArray(files) && Object.hasOwn(files, 'index.html'), 'File hash allowlist and index.html required');
    const names = Object.keys(files).sort();
    requireThat(JSON.stringify(await listFiles(source)) === JSON.stringify(names), 'Export contains unreviewed or missing files');
    const buffers = [];
    for (const name of names) {
      requireThat(safeRelative(name) && name.split('/').every(part => !part.startsWith('.')) && extensions.has(path.extname(name).toLowerCase()), `Unsafe static file: ${name}`);
      requireThat(sha256.test(files[name]), `Invalid SHA-256 for ${name}`);
      const bytes = await readFile(path.join(source, name));
      requireThat(bytes.length <= 25 * 1024 * 1024, `Asset exceeds 25 MiB: ${name}`);
      requireThat(digest(bytes) === files[name], `Unapproved content change: ${name}`);
      requireThat(!secret.test(bytes.toString('utf8')), `Possible credential in ${name}`);
      if (name === 'index.html') {
        const html = bytes.toString('utf8');
        requireThat(/data-leadscore-capture\s*=\s*["']disabled["']/.test(html), 'Truthful inactive capture notice required');
        requireThat(!/<base\b/i.test(html), 'HTML base may escape tenant path');
        for (const match of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
          const ref = match[1];
          if (/^(?:https:\/\/|mailto:|tel:|#|data:)/i.test(ref)) continue;
          const resolvedUrl = new URL(ref, `https://static.invalid${route}`);
          requireThat(resolvedUrl.origin === 'https://static.invalid' && resolvedUrl.pathname.startsWith(route), 'Local asset/link escapes tenant page');
        }
      }
      buffers.push({ name, bytes });
    }
    packages.push({ page, route, buffers });
  }
  // Only replace output after every export validates. Never delete outside this project.
  const staging = path.join(root, 'dist-staging');
  const output = path.join(root, 'dist');
  requireThat(!(await lstat(staging).catch(() => null)), 'Staging output already exists');
  await mkdir(staging);
  try {
    for (const { route, buffers } of packages) for (const { name, bytes } of buffers) {
      const destination = path.join(staging, route.slice(1), name);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
    }
    await writeFile(path.join(staging, '_headers'), "/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-src https://www.youtube.com https://www.youtube-nocookie.com; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'\n");
    await writeFile(path.join(staging, 'release.json'), JSON.stringify({ publicCommit, capture: 'disabled', pages: packages.map(({ page, route }) => ({ route, sourceCommit: page.sourceCommit, files: page.files })) }, null, 2) + '\n');
    const outputStat = await lstat(output).catch(() => null);
    requireThat(!outputStat?.isSymbolicLink(), 'Output directory symlink rejected');
    await rm(output, { recursive: true, force: true });
    await rename(staging, output);
    return { output, routes: [...routes] };
  } catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await build(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
