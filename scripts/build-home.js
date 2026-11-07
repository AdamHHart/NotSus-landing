#!/usr/bin/env node
// scripts/build-home.js
//
// Builds home/index.html: notsus.net as a replica of the NotSus browser's home
// screen. See WEBSITE-REPLICA-PRD.md in the app repository.
//
// Every tile is in the generated HTML, as a real link. The search and the two
// dropdowns are an enhancement over a page that is already complete, so it
// works for a search engine and for a child on a bad connection.
//
// Run: npm run build:home   (after bash scripts/sync-catalog.sh)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'catalog.json'), 'utf8'));
const synonyms = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'search-synonyms.json'), 'utf8'));
const homePicks = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'home-picks.json'), 'utf8'));

// The bands the app uses. A site shows for a band when its ageMin is at or
// below that band's top age, which is the app's own rule: a child sees
// everything for their band and younger.
const BANDS = [
  { label: 'Any age', maxAge: 99 },
  { label: 'Not reading yet', maxAge: 5 },
  { label: 'Starting to read', maxAge: 7 },
  { label: '8 and 9', maxAge: 9 },
  { label: '10 and 11', maxAge: 11 },
  { label: '12 and up', maxAge: 99 },
];

// The nav and the social links belong to the whole site, and scripts/site-chrome.js
// is where they are kept. Reading them from there rather than retyping them
// means the new page cannot drift from every other page when a link changes.
function siteChrome() {
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'site-chrome.js'), 'utf8');
  const grab = (name) => {
    const m = new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n    \\]);`).exec(src);
    if (!m) throw new Error(`Could not read ${name} from scripts/site-chrome.js`);
    // eslint-disable-next-line no-new-func
    return new Function(`return ${m[1]}`)();
  };
  return { nav: grab('NAV_LINKS'), social: grab('SOCIAL_LINKS') };
}

// server.js serves everything that is not .html with
// `Cache-Control: immutable, max-age=31536000`, so a stylesheet changed after a
// deploy would stay stale in a visitor's browser for a year. The page asks for
// each asset by a name that carries a hash of its contents, which changes when
// the file does.
const stampCache = new Map();
function stamp(rel) {
  if (stampCache.has(rel)) return stampCache.get(rel);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').slice(0, 10);
  const out = `/${rel}?v=${hash}`;
  stampCache.set(rel, out);
  return out;
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// scripts/fetch-icons.js downloaded each site's own icon into home/icons, so
// the page loads from one origin and a child opening it does not announce
// themselves to a hundred companies. Sites that refused get their emoji.
const iconFiles = fs.existsSync(path.join(ROOT, 'home', 'icons'))
  ? fs.readdirSync(path.join(ROOT, 'home', 'icons'))
  : [];
function logoFor(app) {
  const slug = app.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const file = iconFiles.find((f) => f.replace(/\.[^.]+$/, '') === slug);
  return file ? stamp(`home/icons/${file}`) : null;
}

// What a tile is searchable by: its name, its tagline, its full description,
// its tags, the terms written for it, and the terms written for its category.
// One lowercase blob, because the alternative is six comparisons per tile per
// keystroke. The long description stays in here even though the tile no longer
// shows it, so "encyclopedia" still finds Britannica.
function searchBlob(app) {
  const cat = synonyms.categories[app.category] || { terms: [] };
  return [
    app.name,
    app.label || '',
    app.short || '',
    app.description,
    ...(app.tags || []),
    ...(synonyms.apps[app.name] || []),
    ...cat.terms,
    cat.label || '',
  ].join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
}

function tile(app) {
  const logo = logoFor(app);
  const mark = logo
    ? `<img class="app-logo" src="${esc(logo)}" alt="" width="34" height="34" loading="lazy" decoding="async">`
    : `<span class="app-logo app-logo-emoji" aria-hidden="true">${esc(app.icon || '•')}</span>`;
  return `          <a class="app-button" href="${esc(app.url)}" target="_blank" rel="noopener noreferrer"
             data-cat="${esc(app.category)}" data-agemin="${app.ageMin == null ? 0 : app.ageMin}"
             data-terms="${esc(searchBlob(app))}">
            ${mark}
            <span class="app-name">${esc(app.label || app.name)}</span>
            <span class="app-description">${esc(app.short || app.description)}</span>
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

// The two rows the browser itself opens with, above the twelve categories.
// They are the view when nobody has typed anything, and the script hides them
// the moment a filter is on, so a site never shows up twice in a result.
function picksRow(row) {
  const apps = row.apps.map((name) => {
    const app = catalog.apps.find((a) => a.name === name);
    if (!app) {
      console.error(`home-picks.json names "${name}", which is not in the catalogue.`);
      process.exit(1);
    }
    return app;
  });
  return `      <section class="app-section picks" data-picks="${esc(row.key)}">
        <h2 class="section-title"><span aria-hidden="true">${esc(row.emoji)}</span> ${esc(row.label)}</h2>
        <div class="app-grid">
${apps.map(tile).join('\n')}
        </div>
      </section>`;
}

const categoryOptions = ['        <option value="">Everything</option>']
  .concat(catalog.categoryOrder.map((c) => {
    const m = synonyms.categories[c] || { label: c, emoji: '' };
    return `        <option value="${esc(c)}">${esc(m.emoji)} ${esc(m.label)}</option>`;
  })).join('\n');

const ageOptions = BANDS.map((b, i) =>
  `        <option value="${b.maxAge}"${i === 0 ? ' selected' : ''}>${esc(b.label)}</option>`).join('\n');

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

const { nav, social } = siteChrome();
const total = catalog.apps.length;

// Everything the old navigation held moves to the footer, except About, so the
// top of the page is a brand, one link, and the card.
const footerNav = nav
  .map(({ href, label }) => `      <a href="${esc(href)}">${esc(label)}</a>`).join('\n');
const footerSocial = social
  .map(({ name, url, label }) => `      <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}">${esc(name)}</a>`).join('\n');

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

<main>
<div class="first-screen">
<header class="site-header">
  <a class="brand" href="/">
    <img src="${stamp('public/logo-120.png')}" width="32" height="32" alt="" fetchpriority="high">
    <span class="brand-text">
      <span class="brand-name">NotSus.net</span>
      <span class="brand-tagline">The better browser for kids.</span>
    </span>
  </a>

  <div class="header-right">
    <div id="cta" class="cta" hidden>
      <button type="button" class="cta-close" id="cta-close" aria-label="Close">&times;</button>
      <p class="cta-lead">This website is intended to be a browser.</p>
      <button type="button" class="cta-go" id="cta-open" aria-expanded="false" aria-controls="cta-more">Setup now for your kids</button>
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
    </div>
  </div>
</header>

  <div class="finder">
    <h1 class="finder-title">${total} free websites for kids, hand picked</h1>

    <div class="capsule">
      <div class="capsule-search">
        <span class="capsule-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        </span>
        <input type="search" id="q" class="capsule-input" autocomplete="off"
               placeholder="Search..."
               aria-label="Search the tools" aria-describedby="result-count">
        <button type="button" id="clear" class="capsule-clear" hidden aria-label="Clear the search">&times;</button>
      </div>

      <div class="capsule-pick">
        <label class="visually-hidden" for="cat">What it is for</label>
        <select id="cat">
${categoryOptions}
        </select>
      </div>
      <div class="capsule-pick">
        <label class="visually-hidden" for="age">Age</label>
        <select id="age">
${ageOptions}
        </select>
      </div>
    </div>

    <p id="result-count" class="result-count" role="status" aria-live="polite"></p>

    <div id="miss" class="miss" hidden></div>
  </div>

  <div id="tools" class="tools">
    <div id="picks" class="picks-block">
${homePicks.rows.map(picksRow).join('\n')}
    </div>
  </div>
</div>

  <div class="tools everything">
${catalog.categoryOrder.map(section).filter(Boolean).join('\n')}
  </div>

</main>

<footer class="site-footer">
  <div class="footer-top">
    <img src="${stamp('public/logo-120.png')}" width="44" height="44" alt="" loading="lazy">
    <p class="footer-brand">NotSus.net</p>
    <p class="footer-tagline">The better browser for kids.</p>
  </div>

  <nav class="footer-links" aria-label="Site">
${footerNav}
  </nav>

  <nav class="footer-links footer-legal" aria-label="Legal">
    <a href="/privacy">Privacy Policy</a>
    <a href="/terms">Terms of Service</a>
    <a href="/delete-account">Delete your account</a>
  </nav>

  <nav class="footer-social" aria-label="Social media">
${footerSocial}
  </nav>

  <p class="footer-copy">&copy; 2026 NotSus Education Inc. All rights reserved. 2015 Main Street, Vancouver, BC, Canada.</p>
</footer>

<script id="miss-data" type="application/json">${JSON.stringify(missData)}</script>
<script src="${stamp('home/home.js')}" defer></script>
</body>
</html>
`;

fs.mkdirSync(path.join(ROOT, 'home'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'home', 'index.html'), html);

const pickCount = homePicks.rows.reduce((n, r) => n + r.apps.length, 0);
const withLogos = catalog.apps.filter((a) => logoFor(a)).length;
console.log(`home/index.html  ${total} tiles, ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
console.log(`  ${withLogos} of ${total} tiles carry the site's own logo; the rest fall back to an emoji`);
console.log(`  ${pickCount} picks above the categories, from ${homePicks.rows.map((r) => r.label).join(' and ')}`);
for (const c of catalog.categoryOrder) {
  const n = catalog.apps.filter((a) => a.category === c).length;
  const m = synonyms.categories[c] || {};
  console.log(`  ${String(n).padStart(3)}  ${c.padEnd(10)} shown as "${m.label || c}"`);
}
