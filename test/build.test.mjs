import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { build, digest } from '../scripts/build.mjs';

const commit = 'a'.repeat(40);
const html = '<!doctype html><p data-leadscore-capture="disabled">Submissions are inactive during review.</p><img src="image.svg">';
const image = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
async function fixture(t, update = () => {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'leadscore-static-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'sites/exports/tenant-one/seminar');
  await mkdir(source, { recursive: true });
  await writeFile(path.join(source, 'index.html'), html);
  await writeFile(path.join(source, 'image.svg'), image);
  const page = { tenantSlug: 'tenant-one', pageSlug: 'seminar', sourceCommit: commit, publicationApproved: true, rightsCleared: true, captureDisabledReviewed: true, capture: 'disabled', files: { 'index.html': digest(html), 'image.svg': digest(image) } };
  const manifest = { version: 1, pages: [page] };
  update(manifest, page);
  async function save() { await writeFile(path.join(root, 'sites/manifest.json'), JSON.stringify(manifest)); }
  await save();
  return { root, source, page, manifest, save, run: () => build(root, { publicCommit: commit }) };
}

test('packages exact reviewed bytes under the registered tenant route', async t => {
  const f = await fixture(t);
  const result = await f.run();
  assert.deepEqual(result.routes, ['/p/tenant-one/seminar/']);
  assert.equal(await readFile(path.join(result.output, 'p/tenant-one/seminar/index.html'), 'utf8'), html);
  const release = JSON.parse(await readFile(path.join(result.output, 'release.json'), 'utf8'));
  assert.equal(release.publicCommit, commit);
  assert.equal(release.pages[0].sourceCommit, commit);
  const headers = await readFile(path.join(result.output, '_headers'), 'utf8');
  assert.match(headers, /connect-src 'none'; form-action 'none'/);
  assert.match(headers, /frame-src https:\/\/www.youtube.com https:\/\/www.youtube-nocookie.com/);
});
test('empty source registry blocks publication', async t => {
  const f = await fixture(t, m => { m.pages = []; });
  await assert.rejects(f.run(), /No approved page exports/);
});
test('missing rights or review approval blocks publication', async t => {
  const f = await fixture(t, (_, p) => { p.rightsCleared = false; });
  await assert.rejects(f.run(), /asset rights/);
});
test('live capture cannot be activated by a manifest switch', async t => {
  const f = await fixture(t, (_, p) => { p.capture = 'enabled'; });
  await assert.rejects(f.run(), /shared headless form/);
});
test('reviewed headless capture permits only the published LeadScore origin and keeps payments off', async t => {
  const f = await fixture(t);
  const configUrl = 'https://pages.getleadscore.ai/f/SyntheticFixtureFormKey01/config';
  const active = `<!doctype html><p data-leadscore-capture="enabled">Send an enquiry.</p><form data-config-url="${configUrl}" data-config-revision="1"></form>`;
  await writeFile(path.join(f.source, 'index.html'), active);
  f.page.files['index.html'] = digest(active);
  Object.assign(f.page, { capture: 'enabled', captureReviewed: true, integration: { configUrl, revision: 1, payments: 'disabled', automatedOutreach: 'disabled' } });
  await f.save();
  const result = await f.run();
  const headers = await readFile(path.join(result.output, '_headers'), 'utf8');
  assert.match(headers, /connect-src 'self' https:\/\/pages.getleadscore.ai; form-action 'none'/);
  assert.doesNotMatch(headers, /challenges.cloudflare.com|stripe|connect-src \*/);
  const release = JSON.parse(await readFile(path.join(result.output, 'release.json'), 'utf8'));
  assert.equal(release.capture, 'enabled');
  assert.equal(release.pages[0].integration.payments, 'disabled');
  f.page.integration.configUrl = configUrl.replace('pages.getleadscore.ai', 'wrong.test');
  await f.save(); await assert.rejects(f.run(), /Exact published/);
  f.page.integration.configUrl = configUrl; f.page.integration.payments = 'enabled';
  await f.save(); await assert.rejects(f.run(), /Payment and automated outreach/);
});
test('edited source bytes require a fresh approved hash', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.source, 'index.html'), html + 'changed');
  await assert.rejects(f.run(), /Unapproved content change/);
});
test('unlisted files cannot enter the public output', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.source, '.env'), 'private');
  await assert.rejects(f.run(), /unreviewed or missing/);
});
test('reviewed plain-text resources are served without enabling capture', async t => {
  const f = await fixture(t);
  const content = 'A fictional worked example.\n';
  await mkdir(path.join(f.source, 'resources'));
  await writeFile(path.join(f.source, 'resources/checklist.txt'), content);
  f.page.files['resources/checklist.txt'] = digest(content); await f.save();
  const result = await f.run();
  assert.equal(await readFile(path.join(result.output, 'p/tenant-one/seminar/resources/checklist.txt'), 'utf8'), content);
});
test('reviewed source maps still cannot enter public output', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.source, 'app.js.map'), '{}');
  f.page.files['app.js.map'] = digest('{}'); await f.save();
  await assert.rejects(f.run(), /Unsafe static file/);
});
test('common credentials are rejected even when included in the allowlist', async t => {
  const f = await fixture(t);
  const unsafe = html + '<script>const key="ghp_' + 'a'.repeat(36) + '"</script>';
  await writeFile(path.join(f.source, 'index.html'), unsafe);
  f.page.files['index.html'] = digest(unsafe); await f.save();
  await assert.rejects(f.run(), /Possible credential/);
});
test('missing truthful disabled-capture notice blocks publication', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.source, 'index.html'), '<p>Ready</p>');
  f.page.files['index.html'] = digest('<p>Ready</p>'); await f.save();
  await assert.rejects(f.run(), /inactive capture notice/);
});
test('local asset references cannot escape into another tenant page', async t => {
  const f = await fixture(t);
  const unsafe = html + '<img src="/p/tenant-two/seminar/image.svg">';
  await writeFile(path.join(f.source, 'index.html'), unsafe);
  f.page.files['index.html'] = digest(unsafe); await f.save();
  await assert.rejects(f.run(), /escapes tenant page/);
});
test('tenant-slug traversal and duplicate routes are rejected', async t => {
  const f = await fixture(t);
  f.page.tenantSlug = '../tenant'; await f.save();
  await assert.rejects(f.run(), /Invalid tenant/);
  f.page.tenantSlug = 'tenant-one'; f.manifest.pages.push({ ...f.page }); await f.save();
  await assert.rejects(f.run(), /Duplicate route/);
});
test('unregistered paths have no global index or SPA fallback', async t => {
  const f = await fixture(t); const result = await f.run();
  await assert.rejects(readFile(path.join(result.output, 'index.html')), /ENOENT/);
  await assert.rejects(readFile(path.join(result.output, 'p/tenant-two/seminar/index.html')), /ENOENT/);
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.assets.not_found_handling, 'none');
  assert.equal(config.main, undefined);
  assert.equal(config.routes, undefined);
});
test('symlinked export directories cannot import files from elsewhere', async t => {
  const f = await fixture(t);
  const other = path.join(f.root, 'outside'); await mkdir(other);
  await rm(f.source, { recursive: true });
  await symlink(other, f.source, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(f.run(), /escapes|symlink/);
});
test('failed validation leaves the previous output intact', async t => {
  const f = await fixture(t); const result = await f.run();
  f.page.rightsCleared = false; await f.save();
  await assert.rejects(f.run(), /asset rights/);
  assert.equal(await readFile(path.join(result.output, 'p/tenant-one/seminar/index.html'), 'utf8'), html);
});

test('tracking CSP is restricted to supported providers and requires reviewed capture', async t => {
  const f = await fixture(t);
  f.page.integration = { tracking: 'consent-required' };
  await f.save(); await assert.rejects(f.run(), /Tracking requires/);
  const configUrl = 'https://pages.getleadscore.ai/f/SyntheticFixtureFormKey01/config';
  const active = `<!doctype html><p data-leadscore-capture="enabled">Send an enquiry.</p><form data-config-url="${configUrl}" data-config-revision="2"></form>`;
  await writeFile(path.join(f.source, 'index.html'), active);
  f.page.files['index.html'] = digest(active);
  Object.assign(f.page, { capture: 'enabled', captureReviewed: true, integration: { configUrl, revision: 2, payments: 'disabled', automatedOutreach: 'disabled', tracking: 'consent-required' } });
  await f.save();
  const result = await f.run();
  const headers = await readFile(path.join(result.output, '_headers'), 'utf8');
  for (const provider of ['https://pages.getleadscore.ai', 'https://connect.facebook.net', 'https://www.googletagmanager.com', 'https://www.clarity.ms', 'https://*.clarity.ms', 'https://c.bing.com']) assert.ok(headers.includes(provider));
  assert.doesNotMatch(headers, /connect-src \*|script-src \*|unsafe-eval/);
  f.page.integration.tracking = 'always';
  await f.save(); await assert.rejects(f.run(), /Tracking requires/);
});
