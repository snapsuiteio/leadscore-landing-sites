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
