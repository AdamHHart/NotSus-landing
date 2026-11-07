#!/usr/bin/env node
// scripts/build-home.js
//
// Builds home/index.html: notsus.net as a replica of the NotSus browser's home
// screen. See WEBSITE-REPLICA-PRD.md in the app repository.
//
// Every tile is in the generated HTML, as a real link. The search, the chips
// and the age filter are an enhancement over a page that is already complete,
// so it works for a search engine and for a child on a bad connection.
//
// Run: npm run build:home   (after bash scripts/sync-catalog.sh)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'catalog.json'), 'utf8'));
const synonyms = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'search-synonyms.json'), 'utf8'));

// The bands the app uses. A site shows for a band when its ageMin is at or
// below that band's top age, which is the app's own rule: a child sees
// everything for their band and younger.
const BANDS = [
  { id: 'all', label: 'Any age', maxAge: 99 },
  { id: 'pre-reader', label: 'Not reading yet (4 to 5)', maxAge: 5 },
  { id: 'early-reader', label: 'Starting to read (6 to 7)', maxAge: 7 },
  { id: '8plus', label: '8 and 9', maxAge: 9 },
  { id: '10plus', label: '10 and 11', maxAge: 11 },
  { id: '12plus', label: '12 and up', maxAge: 99 },
];

// server.js serves everything that is not .html with
// `Cache-Control: immutable, max-age=31536000`, so a stylesheet changed after a
// deploy would stay stale in a visitor's browser for a year. The page asks for
// each asset by a name that carries a hash of its contents, which changes when
// the file does.
function stamp(rel) {
  const full = path.join(ROOT, rel);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex').slice(0, 10);
  return `/${rel}?v=${hash}`;
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// What a tile is searchable by: its name, its description, its tags, the terms
// written for it, and the terms written for its category. One lowercase blob,
// because the alternative is five comparisons per tile per keystroke.
function searchBlob(app) {
  const cat = synonyms.categories[app.category] || { terms: [] };
  return [
    app.name,
    app.description,
    ...(app.tags || []),
    ...(synonyms.apps[app.name] || []),
    ...cat.terms,
    cat.label || '',
  ].join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
}

function tile(app) {
  const blob = searchBlob(app);
  return `          <a class="app-button" href="${esc(app.url)}" target="_blank" rel="noopener noreferrer"
             data-cat="${esc(app.category)}" data-agemin="${app.ageMin == null ? 0 : app.ageMin}"
             data-terms="${esc(blob)}">
            <span class="app-icon" aria-hidden="true">${esc(app.icon || '•')}</span>
            <span class="app-name">${esc(app.name)}</span>
            <span class="app-description">${esc(app.description)}</span>
          </a>`;
}

function section(category) {
  const apps = catalog.apps.filter((a) => a.category === category);
  if (!apps.length) return '';
  const meta = synonyms.categories[category] || { label: category, emoji: '' };
  return `      <section class="app-section" data-section="${esc(category)}">
        <h2 class="section-title"><span aria-hidden="true">${esc(meta.emoji)}</span> ${esc(meta.label)}</h2>
        <div class="app-grid">
${apps.map(tile).join('\n')}
        </div>
      </section>`;
}

const chips = catalog.categoryOrder.map((c) => {
  const m = synonyms.categories[c] || { label: c, emoji: '' };
  return `        <button type="button" class="chip" data-chip="${esc(c)}" aria-pressed="false"><span aria-hidden="true">${esc(m.emoji)}</span> ${esc(m.label)}</button>`;
}).join('\n');

const ageOptions = BANDS.map((b) =>
  `          <option value="${b.maxAge}"${b.id === 'all' ? ' selected' : ''}>${esc(b.label)}</option>`).join('\n');

// The brands children ask for that this page cannot give them. Each one is a
// reason to mention the browser, because in the browser a parent can add any
// site. The copy sits beside the mapping in search-synonyms.json.
const notCarried = {};
for (const [k, v] of Object.entries(synonyms._asked_for_but_not_carried)) {
  if (!k.startsWith('_')) notCarried[k] = v;
}
const missData = {
  notCarried,
  missLine: synonyms._asked_for_but_not_carried._miss_line,
  emptyLine: synonyms._asked_for_but_not_carried._empty_line,
  downloadLine: synonyms._asked_for_but_not_carried._download_line,
};

const total = catalog.apps.length;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NotSus.net - ${total} free tools and libraries for kids</title>
<meta name="description" content="${total} free websites for children to learn, make and look things up. Chosen by hand, no ads to click through, nothing to sign up for. The same list that opens inside the NotSus browser.">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:title" content="NotSus.net - free tools and libraries for kids">
<meta property="og:description" content="${total} hand-picked free websites for children. Search by what you want to do.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://www.notsus.net/">
<link rel="stylesheet" href="${stamp('home/home.css')}">
</head>
<body>

<a class="skip" href="#tools">Skip to the tools</a>

<header class="site-header">
  <a class="brand" href="/">
    <img src="${stamp('public/logo-120.png')}" width="40" height="40" alt="" fetchpriority="high">
    <span class="brand-text">
      <span class="brand-name">NotSus.net</span>
      <span class="brand-tagline">The better browser for kids.</span>
    </span>
  </a>
  <nav class="site-nav" aria-label="Main">
    <a href="/blog/">Blog</a>
    <a href="/podcast/">Radio</a>
    <a href="/downloads">Get the browser</a>
  </nav>
</header>

<main>

  <div class="finder">
    <h1 class="finder-title">What do you want to do?</h1>
    <p class="finder-sub">${total} free websites for kids. Hand picked, no sign up, nothing to pay.</p>

    <div class="search-wrap">
      <span class="search-icon" aria-hidden="true">🔎</span>
      <input type="search" id="q" class="search-input" autocomplete="off"
             placeholder="Try: make a game, draw, times tables, dinosaurs"
             aria-label="Search the tools" aria-describedby="result-count">
      <button type="button" id="clear" class="search-clear" hidden aria-label="Clear the search">&times;</button>
    </div>

    <div class="chips" role="group" aria-label="Filter by what it is for">
${chips}
    </div>

    <div class="age-row">
      <label for="age">Show me things for</label>
      <select id="age">
${ageOptions}
      </select>
    </div>

    <p id="result-count" class="result-count" role="status" aria-live="polite"></p>

    <div id="miss" class="miss" hidden></div>
  </div>

  <div id="tools" class="tools">
${catalog.categoryOrder.map(section).filter(Boolean).join('\n')}
  </div>

</main>

<aside id="cta" class="cta" hidden aria-label="Get the NotSus browser">
  <button type="button" class="cta-close" id="cta-close" aria-label="Close">&times;</button>
  <div class="cta-first">
    <p class="cta-lead">This website is meant to be a browser.</p>
    <p class="cta-sub">Set it up for your kids.</p>
    <button type="button" class="cta-go" id="cta-open">Set up</button>
  </div>
  <div class="cta-more" id="cta-more" hidden>
    <a class="cta-tier" href="/downloads">
      <strong>Basic Kid's Browser</strong>
      <span>Free. No email, no credit card, no data.</span>
    </a>
    <a class="cta-tier cta-tier-alt" href="/downloads">
      <strong>Custom Kid's Browser</strong>
      <span>You choose every site. Set up inside the browser.</span>
    </a>
  </div>
</aside>

<footer class="site-footer">
  <p class="footer-brand">NotSus.net</p>
  <p class="footer-note">Every site here opens in a new tab and belongs to somebody else. We chose them;
    we do not run them. The browser is where a parent decides what their child can open.</p>
  <nav class="footer-links" aria-label="Footer">
    <a href="/downloads">Get the browser</a>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
    <a href="/delete-account">Delete your account</a>
    <a href="/blog/">Blog</a>
  </nav>
  <p class="footer-copy">&copy; 2026 NotSus Education Inc. 2015 Main Street, Vancouver, BC, Canada.</p>
</footer>

<script id="miss-data" type="application/json">${JSON.stringify(missData)}</script>
<script src="${stamp('home/home.js')}" defer></script>
</body>
</html>
`;

fs.mkdirSync(path.join(ROOT, 'home'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'home', 'index.html'), html);

const bytes = Buffer.byteLength(html);
console.log(`home/index.html  ${total} tiles, ${(bytes / 1024).toFixed(0)} KB`);
for (const c of catalog.categoryOrder) {
  const n = catalog.apps.filter((a) => a.category === c).length;
  const m = synonyms.categories[c] || {};
  console.log(`  ${String(n).padStart(3)}  ${c.padEnd(10)} shown as "${m.label || c}"`);
}
