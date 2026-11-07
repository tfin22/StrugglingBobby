// After the single-file build: write the manifest, the service worker and
// icons beside index.html (used only when served over http/https), and check size.
import { writeFileSync, statSync, readFileSync } from 'node:fs';
import { writePNG } from './png';
import { SHARED, rgb12to32 } from '../src/content/palette';
import { BOBBY_SPR } from '../src/content/sprites';

const dist = 'dist';
const html = readFileSync(`${dist}/index.html`, 'utf8');
const size = statSync(`${dist}/index.html`).size;

function icon(n: number, path: string) {
  const px = new Uint8Array(n * n * 4);
  const s = Math.floor(n / 28);
  const bg = [0, 0, 0], gold = [255, 204, 0];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const stripe = Math.floor(x / (n / 8)) % 2;
    const c = y > n * 0.78 ? (stripe ? gold : bg) : bg;
    px.set([...c, 255], (y * n + x) * 4);
  }
  const b = BOBBY_SPR.stand;
  const ox = Math.floor((n - b.w * s) / 2), oy = Math.floor(n * 0.08);
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
    const c = b.d[j * b.w + i];
    if (!c) continue;
    const v = rgb12to32(SHARED[c]);
    for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) px.set([v & 255, (v >> 8) & 255, (v >> 16) & 255, 255], ((oy + j * s + yy) * n + ox + i * s + xx) * 4);
  }
  writePNG(path, n, n, px);
}
icon(192, `${dist}/icon-192.png`);
icon(512, `${dist}/icon-512.png`);

writeFileSync(`${dist}/manifest.webmanifest`, JSON.stringify({
  name: "Bobby Strugglin'", short_name: 'Bobby', start_url: './', scope: './', display: 'fullscreen', orientation: 'landscape',
  background_color: '#000000', theme_color: '#000000',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
}, null, 2));

const ver = Buffer.from(html).reduce((h, c) => (h * 31 + c) >>> 0, 7).toString(36);
writeFileSync(`${dist}/sw.js`, `// Offline: cache the single page and its small extras.
const C = 'bobby-${ver}';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => { e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request))); });
`);
console.log(`index.html: ${(size / 1024).toFixed(1)} KB ${size < 2 * 1024 * 1024 ? '(under 2 MB)' : 'OVER 2 MB!'}`);
if (size >= 2 * 1024 * 1024) process.exit(1);
