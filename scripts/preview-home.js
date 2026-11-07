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
html = html.replace(/<link rel="icon"[^>]*>\n?/, '').replace(/<link rel="apple-touch-icon"[^>]*>\n?/, '');
html = html.replace(/src="\/public\/logo-120\.png\?v=[a-f0-9]+"/g, `src="${dataUri('public/logo-120.png')}"`);
html = html.replace(/src="\/(home\/icons\/[^"?]+)\?v=[a-f0-9]+"/g, (_, rel) => `src="${dataUri(rel)}"`);
html = html.replace(/<title>[^<]*<\/title>/, '<title>NotSus Home Screen</title>');

// Preview only. The card remembers being dismissed for 30 days, per browser,
// which is right on the live site and wrong here: dismiss it once while
// looking at a draft and every later draft opens without it. Each preview
// gets its own key, so each one shows the card again.
html = html.replace(
  "var KEY = 'notsus.cta.dismissedAt';",
  `var KEY = 'notsus.cta.preview.${Date.now().toString(36)}';`,
);

fs.writeFileSync(out, html);
console.log(`${out}  ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB, nothing left to fetch`);
const left = html.match(/(?:src|href)="\/[^"]*"/g) || [];
if (left.length) console.log(`  still pointing at the site: ${[...new Set(left)].join(', ')}`);
