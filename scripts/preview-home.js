#!/usr/bin/env node
// scripts/preview-home.js
//
// Writes one self-contained copy of the home page: stylesheet, script, logo
// and all 95 site icons inlined. Nothing is fetched, so it can be opened from
// a file or shared as a single page when there is no server to point at.
//
// Run: node scripts/preview-home.js [output-path]

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const out = process.argv[2] || path.join(ROOT, 'home', 'preview.html');

let html = fs.readFileSync(path.join(ROOT, 'home', 'index.html'), 'utf8');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel));

const TYPES = { '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
function dataUri(rel) {
  const ext = path.extname(rel).toLowerCase();
  return `data:${TYPES[ext] || 'application/octet-stream'};base64,${read(rel).toString('base64')}`;
}

html = html.replace(/<link rel="stylesheet" href="[^"]*">/, `<style>\n${read('home/home.css')}\n</style>`);
html = html.replace(/<script src="[^"]*home\.js[^"]*" defer><\/script>/, `<script>\n${read('home/home.js')}\n</script>`);
// The footer widget. Its script reaches for its own stylesheet by URL when it
// cannot find one, which a file with no server behind it cannot answer, so
// both go in here and the link keeps the attribute that tells it to stop.
html = html.replace(/<link rel="stylesheet" href="[^"]*footer-dock\.css[^"]*" data-ns-dock>/, `<style data-ns-dock>\n${read('home/footer-dock.css')}\n</style>`);
html = html.replace(/<script src="[^"]*footer-dock\.js[^"]*" defer data-ns-dock><\/script>/, `<script data-ns-dock>\n${read('scripts/footer-dock.js')}\n</script>`);
html = html.replace(/<link rel="icon"[^>]*>\n?/, '').replace(/<link rel="apple-touch-icon"[^>]*>\n?/, '');
html = html.replace(/src="\/public\/logo-120\.png(\?v=[a-f0-9]+)?"/g, `src="${dataUri('public/logo-120.png')}"`);
html = html.replace(/src="\/(home\/icons\/[^"?]+)\?v=[a-f0-9]+"/g, (_, rel) => `src="${dataUri(rel)}"`);
html = html.replace(/<title>[^<]*<\/title>/, '<title>NotSus Home Screen</title>');

// Site links, pointed at the site.
//
// This file is opened from somewhere that is not notsus.net, so every
// href="/about" in it was being resolved against whatever host it was
// sitting on and landing on that host's 404 page. Adam reported the widget
// as broken on 2026-11-07 because of it, and it was not.
const SITE = 'https://www.notsus.net';
html = html.replace(/href="(\/[^"]*)"/g, (_, p) => `href="${SITE}${p}"`);
// The script builds its own links from paths in its source, so they need the
// same treatment. Only the ones that are addresses.
html = html.replace(/(href: ')(\/[^']*)(')/g, (_, a, p, b) => `${a}${SITE}${p}${b}`);
html = html.replace(/var BLOG_BASE = '\/blog\/';/, `var BLOG_BASE = '${SITE}/blog/';`);

// The Radio and Legal widgets ask the server for their contents. This copy
// has no server behind it and is opened from another origin, so both of
// those requests fail and the widgets read as broken when they are not.
// Bake the answers in; footer-dock.js prefers them over a request.
const bake = [];
const legal = [
  ['ns-legal-privacy', 'docs/PrivacyPolicy.html'],
  ['ns-legal-terms', 'docs/TandC.html'],
];
for (const [id, rel] of legal) {
  // Only the part the widget reads. The rest of those pages is their own
  // header, footer, modals and stylesheet, which would land inert in this
  // file and make every link in them look like one this page failed to
  // inline. The stylesheet has to go first: it names .privacy-content too,
  // and searching for that string found the CSS rule rather than the div.
  const whole = read(rel).toString('utf8')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '');
  const cls = id === 'ns-legal-privacy' ? 'privacy-content' : 'terms-content';
  const at = whole.indexOf(`<div class="${cls}">`);
  const end = whole.indexOf('<footer', at);
  const text = at === -1 ? whole : whole.slice(at, end === -1 ? undefined : end);
  bake.push(`<script id="${id}" type="text/plain">${text.replace(/<\/script>/g, '<\\/script>')}</script>`);
}
const episodes = path.join(ROOT, 'data', 'podcast-episodes.json');
if (fs.existsSync(episodes)) {
  bake.push(`<script id="ns-episodes" type="application/json">${fs.readFileSync(episodes, 'utf8')}</script>`);
} else {
  console.log('  no data/podcast-episodes.json, so the Radio widget will say it could not load');
}
html = html.replace('</body>', bake.join('\n') + '\n</body>');


fs.writeFileSync(out, html);
console.log(`${out}  ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB, nothing left to fetch`);
const left = html.match(/(?:src|href)="\/[^"]*"/g) || [];
if (left.length) console.log(`  still pointing at the site: ${[...new Set(left)].join(', ')}`);
