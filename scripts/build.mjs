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
    requireThat(page.publicationApproved === true && page.rightsCleared === true, 'Publication and asset rights review required');
    requireThat(page.capture === 'disabled' || page.capture === 'enabled', 'Unsupported capture mode');
    requireThat(page.capture === 'disabled' ? page.captureDisabledReviewed === true : page.captureReviewed === true && page.integration?.configUrl && page.integration?.revision > 0, 'Live capture requires the shared headless form integration and completed review; publication blocked');
    if (page.capture === 'enabled') {
      const config = new URL(page.integration.configUrl);
      requireThat(config.origin === 'https://pages.getleadscore.ai' && /^\/f\/[a-zA-Z0-9]{16,64}\/config$/.test(config.pathname) && !config.search && !config.hash && !config.username && !config.password, 'Exact published LeadScore configuration URL required');
      requireThat(page.integration.payments === 'disabled' && page.integration.automatedOutreach === 'disabled', 'Payment and automated outreach must remain disabled');
    }
    requireThat(page.integration?.tracking === undefined || (page.capture === 'enabled' && page.integration.tracking === 'consent-required' && sha256.test(page.integration.trackerSha256 || '') && /^G-[A-Z0-9]{4,30}$/.test(page.integration.staticGoogleTagId || '') && /^[a-z0-9]{5,30}$/.test(page.integration.clarityProjectId || '')), 'Tracking requires reviewed capture, explicit consent and valid public provider IDs');
    requireThat(page.integration?.tracking || (!page.integration?.staticGoogleTagId && !page.integration?.clarityProjectId), 'Provider IDs require reviewed consent tracking');
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
        requireThat(new RegExp(`data-leadscore-capture\\s*=\\s*["']${page.capture}["']`).test(html), `Truthful ${page.capture === 'disabled' ? 'inactive' : 'active'} capture notice required`);
        if (page.capture === 'enabled') requireThat(html.includes(`data-config-url="${page.integration.configUrl}"`) && html.includes(`data-config-revision="${page.integration.revision}"`) && !html.includes('Signup is not available yet'), 'Active form must use the reviewed configuration URL, revision and truthful copy');
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
    const headers = "/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n" + packages.map(({ page, route }) => `${route}*\n  Content-Security-Policy: default-src 'self'; script-src 'self'${page.integration?.tracking === 'consent-required' ? ' https://pages.getleadscore.ai https://www.googletagmanager.com https://*.clarity.ms' : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data:${page.integration?.tracking === 'consent-required' ? ' https://www.googletagmanager.com https://*.google-analytics.com https://*.clarity.ms https://c.bing.com' : ''}; font-src 'self'; media-src 'self'${Object.keys(page.files).some(name => /\.(mp4|webm)$/.test(name)) ? ' blob:' : ''}; frame-src https://www.youtube.com https://www.youtube-nocookie.com${page.capture === 'enabled' ? ' https://pages.getleadscore.ai' : ''}; connect-src ${page.capture === 'enabled' ? "'self' https://pages.getleadscore.ai" : "'none'"}${page.integration?.tracking === 'consent-required' ? ' https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com https://*.clarity.ms https://c.bing.com' : ''}; form-action 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'\n`).join('');
    await writeFile(path.join(staging, '_headers'), headers);
    const capture = packages.every(({ page }) => page.capture === 'disabled') ? 'disabled' : packages.every(({ page }) => page.capture === 'enabled') ? 'enabled' : 'mixed';
    await writeFile(path.join(staging, 'release.json'), JSON.stringify({ publicCommit, capture, pages: packages.map(({ page, route }) => ({ route, sourceCommit: page.sourceCommit, capture: page.capture, ...(page.integration ? { integration: page.integration } : {}), files: page.files })) }, null, 2) + '\n');
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
