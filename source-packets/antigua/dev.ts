import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const result = Bun.spawnSync(['bun', 'build.ts'], { cwd: import.meta.dir, stdout: 'inherit', stderr: 'inherit' });
if (result.exitCode !== 0) process.exit(result.exitCode);
const root = resolve(import.meta.dir, 'dist');
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT || 4337),
  fetch(request) {
    const url = new URL(request.url);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Capture is disabled in this review preview.', { status: 405 });
    if (url.pathname === '/') return Response.redirect(`${url.origin}/antigua/${url.search}`, 302);
    if (url.pathname === '/antigua') return Response.redirect(`${url.origin}/antigua/${url.search}`, 302);
    let path: string;
    try { path = decodeURIComponent(url.pathname); } catch { return new Response('Bad path', { status: 400 }); }
    const file = resolve(root, `.${path.endsWith('/') ? `${path}index.html` : path}`);
    if (!file.startsWith(`${root}${sep}`) || !existsSync(file)) return new Response('Not found', { status: 404 });
    return new Response(request.method === 'HEAD' ? null : Bun.file(file), { headers: {
      'Content-Type': Bun.file(file).type,
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; frame-src https://www.youtube-nocookie.com; form-action 'none'; base-uri 'none'; frame-ancestors 'none'",
      // The approved YouTube embed needs an origin referrer; no-referrer triggers player error 153.
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff',
    } });
  },
});
console.log(`Antigua review: http://127.0.0.1:${server.port}/antigua/ — no capture, sends or payments`);
