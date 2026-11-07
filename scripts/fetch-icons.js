#!/usr/bin/env node
// scripts/fetch-icons.js
//
// Downloads each site's own icon once, into home/icons/, where it is committed.
//
// Why not point the tiles at the sites' own favicons, or at an icon service?
// Because then a child opening notsus.net would send a request to a hundred
// companies, and one of them to Google, before touching anything. The whole
// point of the page is that it is safe to open. Fetching them here means the
// page loads from one origin: ours.
//
// Run: npm run fetch:icons        (every site that has no icon yet)
//      npm run fetch:icons -- --all   (re-fetch everything)
//
// Icons are committed, so the build and the deploy never touch the network.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ICONS = path.join(ROOT, 'home', 'icons');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'catalog.json'), 'utf8'));

const refetchAll = process.argv.includes('--all');
const TIMEOUT = 12000;
// Some sites refuse a request with no user agent. This one says what we are.
const UA = 'NotSusIconFetcher/1.0 (+https://www.notsus.net)';

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function get(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': UA, Accept: '*/*' },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

// What the page itself says its icon is. Bigger is better, and an
// apple-touch-icon is almost always a clean square PNG, so it wins outright.
function iconLinksFrom(html, baseUrl) {
  const out = [];
  const linkRe = /<link\b[^>]*>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const tag = m[0];
    const rel = (/\brel\s*=\s*["']([^"']+)["']/i.exec(tag) || [])[1];
    const href = (/\bhref\s*=\s*["']([^"']+)["']/i.exec(tag) || [])[1];
    if (!rel || !href) continue;
    const rels = rel.toLowerCase().split(/\s+/);
    const isIcon = rels.includes('icon') || rels.includes('shortcut') || rels.includes('apple-touch-icon') || rels.includes('apple-touch-icon-precomposed');
    if (!isIcon) continue;
    const sizes = (/\bsizes\s*=\s*["']([^"']+)["']/i.exec(tag) || [])[1] || '';
    const px = parseInt((/(\d+)x\d+/i.exec(sizes) || [])[1], 10) || 0;
    let abs;
    try { abs = new URL(href, baseUrl).toString(); } catch { continue; }
    const apple = rels.includes('apple-touch-icon') || rels.includes('apple-touch-icon-precomposed');
    const svg = /\.svg(\?|$)/i.test(abs);
    out.push({ abs, score: (apple ? 1000 : 0) + (svg ? 500 : 0) + px });
  }
  return out.sort((a, b) => b.score - a.score).map((x) => x.abs);
}

// The first few bytes of each format we accept. An HTML error page matches
// none of them, which is the whole point.
function looksLikeAnImage(buf) {
  const hex = buf.subarray(0, 12).toString('hex');
  if (hex.startsWith('89504e47')) return true;                 // PNG
  if (hex.startsWith('ffd8ff')) return true;                   // JPEG
  if (hex.startsWith('47494638')) return true;                 // GIF
  if (hex.startsWith('00000100')) return true;                 // ICO
  if (hex.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP') return true;
  const head = buf.subarray(0, 1000).toString('utf8').toLowerCase();
  if (head.includes('<svg')) return true;                      // SVG, with or without a prolog
  return false;
}

function extFor(contentType, url) {
  const t = (contentType || '').toLowerCase();
  if (t.includes('svg')) return '.svg';
  if (t.includes('png')) return '.png';
  if (t.includes('jpeg') || t.includes('jpg')) return '.jpg';
  if (t.includes('webp')) return '.webp';
  if (t.includes('icon') || t.includes('ico')) return '.ico';
  const u = (url.split('?')[0] || '').toLowerCase();
  for (const e of ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico']) if (u.endsWith(e)) return e === '.jpeg' ? '.jpg' : e;
  return '.png';
}

// Everything raster becomes a 64px PNG. A 2000px icon behind a 32px tile is
// the mistake we just finished undoing on our own logo, and a .ico is worse:
// it is a bundle of every size at once, which is how one of these arrived at
// 343 KB. SVG is left alone, because it is already small and scales properly.
//
// Returns the file that ended up on disk, which may not be the one passed in.
function normalise(file) {
  if (file.endsWith('.svg')) return file;
  const png = file.replace(/\.[^.]+$/, '.png');
  try {
    execFileSync('sips', ['-s', 'format', 'png', '-Z', '64', file, '--out', png], { stdio: 'ignore' });
    if (png !== file && fs.existsSync(png)) fs.unlinkSync(file);
    return png;
  } catch {
    // A malformed image defeats sips. It still renders in an <img>, and the
    // page sizes it in CSS, so keep what we have.
    return file;
  }
}

async function fetchOne(app) {
  const name = slug(app.name);
  const existing = fs.readdirSync(ICONS).filter((f) => f.replace(/\.[^.]+$/, '') === name);
  if (existing.length && !refetchAll) return { name: app.name, file: existing[0], status: 'kept' };

  const candidates = [];
  try {
    const res = await get(app.url);
    const html = await res.text();
    candidates.push(...iconLinksFrom(html, res.url || app.url));
  } catch {
    // The homepage refused us. /favicon.ico below may still work.
  }
  // The conventional places, for a site whose homepage we could not read or
  // that declares no icon link.
  for (const guess of ['/apple-touch-icon.png', '/favicon.ico', '/favicon.png', '/favicon-32x32.png', '/static/favicon.ico']) {
    try { candidates.push(new URL(guess, app.url).toString()); } catch { /* skip */ }
  }

  for (const url of candidates.slice(0, 9)) {
    try {
      const res = await get(url);
      const buf = Buffer.from(await res.arrayBuffer());
      // Anything this small is a tracking pixel or an error page, not an icon.
      if (buf.length < 100) continue;
      // And a site with no favicon often answers with its 404 page, at 200,
      // labelled image/png. Two tiles shipped an HTML document as their logo
      // before this check existed, so trust the bytes and not the header.
      if (!looksLikeAnImage(buf)) continue;
      const ext = extFor(res.headers.get('content-type'), url);
      for (const old of existing) fs.unlinkSync(path.join(ICONS, old));
      let file = path.join(ICONS, name + ext);
      fs.writeFileSync(file, buf);
      file = normalise(file);
      return { name: app.name, file: path.basename(file), status: 'fetched', bytes: fs.statSync(file).size };
    } catch {
      // Try the next candidate.
    }
  }
  return { name: app.name, file: null, status: 'none' };
}

(async () => {
  fs.mkdirSync(ICONS, { recursive: true });
  const results = [];
  // Six at a time: fast enough, and not a thundering herd at anyone.
  const queue = catalog.apps.slice();
  async function worker() {
    while (queue.length) {
      const app = queue.shift();
      const r = await fetchOne(app);
      results.push(r);
      const mark = r.status === 'none' ? 'no icon ' : r.status === 'kept' ? 'kept    ' : 'fetched ';
      console.log(`  ${mark} ${r.name}${r.file ? `  ->  ${r.file}` : ''}`);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);

  const missing = results.filter((r) => r.status === 'none');
  console.log(`\n${results.length - missing.length} of ${results.length} sites have an icon.`);
  if (missing.length) {
    console.log('No icon, so these tiles fall back to their emoji:');
    for (const r of missing) console.log(`  ${r.name}`);
  }
})();
