#!/usr/bin/env node
// scripts/check-home.js
//
// Checks the generated home page without a browser and without a dependency.
//
// This page is built, not written, so the mistakes it can make are mechanical:
// a tile that lost its rel="noopener", a suggestion pointing at a site that
// was removed, a search term that matches nothing. Those are exactly the
// mistakes a person reading the page would not notice, so they are worth a
// script.
//
// Run: npm run check:home

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'home', 'index.html'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'catalog.json'), 'utf8'));
const synonyms = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'search-synonyms.json'), 'utf8'));

let failures = 0;
function check(name, ok, detail) {
  if (ok) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`);
  }
}

// Pull the tiles back out of the page, so the checks read what shipped rather
// than what the build intended.
const tileRe = /<a class="app-button" href="([^"]+)"([^>]*)>/g;
const tiles = [];
let m;
while ((m = tileRe.exec(html)) !== null) {
  const attrs = m[2];
  const get = (k) => {
    const found = new RegExp(`data-${k}="([^"]*)"`).exec(attrs);
    return found ? found[1] : null;
  };
  tiles.push({
    href: m[1],
    cat: get('cat'),
    ageMin: get('agemin'),
    terms: get('terms'),
    newTab: /target="_blank"/.test(attrs),
    safe: /rel="noopener noreferrer"/.test(attrs),
  });
}

console.log('\nThe page');
check(`one tile per active site (${catalog.apps.length})`, tiles.length === catalog.apps.length,
  `page has ${tiles.length}`);
check('every tile opens in a new tab', tiles.every((t) => t.newTab));
check('every tile carries rel="noopener noreferrer"', tiles.every((t) => t.safe),
  tiles.filter((t) => !t.safe).map((t) => t.href).join(', '));
check('every tile is https', tiles.every((t) => t.href.startsWith('https://')),
  tiles.filter((t) => !t.href.startsWith('https://')).map((t) => t.href).join(', '));
check('every tile has a category and an age', tiles.every((t) => t.cat && t.ageMin !== null));
check('every tile has search terms', tiles.every((t) => t.terms && t.terms.length > 10));

const names = catalog.apps.map((a) => a.name);
check('no duplicate sites', new Set(names).size === names.length,
  names.filter((n, i) => names.indexOf(n) !== i).join(', '));
check('no duplicate links', new Set(tiles.map((t) => t.href)).size === tiles.length,
  tiles.map((t) => t.href).filter((h, i, a) => a.indexOf(h) !== i).join(', '));

// A page that needs JavaScript to show its links is invisible to a search
// engine and to a child on a slow connection.
check('no tile is hidden in the markup', !/class="app-button"[^>]*hidden/.test(html));
check('the heading and the tiles are in the HTML', /<h1 class="finder-title">/.test(html) && tiles.length > 0);
check('the card starts hidden, so it cannot block a tile before it slides in',
  /<aside id="cta" class="cta" hidden/.test(html));
check('assets are asked for by a content hash, so a deploy is not cached for a year',
  /home\.css\?v=[a-f0-9]{10}/.test(html) && /home\.js\?v=[a-f0-9]{10}/.test(html));
check('the header logo is the small copy, not the 3.2 MB original',
  /public\/logo-120\.png\?v=/.test(html) && !html.includes('/public/logo.png'));
check('the public address is the one that may be published',
  html.includes('2015 Main Street') && !html.includes('Broadway'));

console.log('\nThe search');

// The page's rule, in one line: every typed word has to appear in the tile's
// terms. These are the phrases a child is most likely to start with.
function hits(query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return tiles.filter((t) => words.every((w) => t.terms.indexOf(w) !== -1));
}

const queries = [
  ['make a game', 3], ['draw', 3], ['times tables', 1], ['dinosaurs', 1],
  ['space', 2], ['learn to read', 2], ['edit video', 3], ['music', 4],
  ['3d print', 1], ['homework', 3], ['coolmath', 1], ['cant draw', 0],
  ['story', 3], ['robot', 2], ['museum', 4], ['essay', 2],
];
for (const [q, least] of queries) {
  const n = hits(q).length;
  check(`"${q}" finds at least ${least}`, n >= least, `found ${n}`);
}

console.log('\nThe sites we do not carry');
const notCarried = synonyms._asked_for_but_not_carried;
for (const [brand, suggestions] of Object.entries(notCarried)) {
  if (brand.startsWith('_')) continue;
  const unknown = suggestions.filter((s) => !names.includes(s));
  check(`"${brand}" suggests only sites the page has`, unknown.length === 0, unknown.join(', '));
}
check('the copy for a miss is present', Boolean(notCarried._miss_line && notCarried._empty_line && notCarried._download_line));
check('the download line and the mapping both reached the page',
  html.includes('"notCarried"') && html.includes('miss-data'));

console.log('\nThe catalogue and the synonyms agree');
check('every site has synonyms', names.every((n) => synonyms.apps[n]),
  names.filter((n) => !synonyms.apps[n]).join(', '));
check('no synonyms for a site that is gone',
  Object.keys(synonyms.apps).every((n) => names.includes(n)),
  Object.keys(synonyms.apps).filter((n) => !names.includes(n)).join(', '));
check('every category has a child-facing label and an emoji',
  catalog.categoryOrder.every((c) => synonyms.categories[c] && synonyms.categories[c].label && synonyms.categories[c].emoji),
  catalog.categoryOrder.filter((c) => !synonyms.categories[c]).join(', '));

// The age filter is only worth having if each band has something to show.
console.log('\nThe age filter');
for (const [label, maxAge, least] of [['Not reading yet', 5, 12], ['Starting to read', 7, 30], ['8 and 9', 9, 50], ['10 and 11', 11, 70]]) {
  const n = tiles.filter((t) => Number(t.ageMin) <= maxAge).length;
  check(`"${label}" shows at least ${least} sites`, n >= least, `shows ${n}`);
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}\n`);
process.exit(failures === 0 ? 0 : 1);
