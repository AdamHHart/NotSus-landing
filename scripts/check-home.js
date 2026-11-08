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

const cssSrc = fs.readFileSync(path.join(ROOT, 'home', 'home.css'), 'utf8');
const jsSrc = fs.readFileSync(path.join(ROOT, 'home', 'home.js'), 'utf8');

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
// Everything below the two picks rows. Those rows repeat fifteen sites on
// purpose, so counting them would make every total wrong.
const EVERYTHING = '<div class="tools everything">';
const everything = html.slice(html.indexOf(EVERYTHING));
const tileRe = /<a class="app-button" href="([^"]+)"([^>]*)>/g;
const tiles = [];
let m;
while ((m = tileRe.exec(everything)) !== null) {
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

const catalogNames = catalog.apps.map((a) => a.name);
check('no duplicate sites', new Set(catalogNames).size === catalogNames.length,
  catalogNames.filter((n, i) => catalogNames.indexOf(n) !== i).join(', '));
check('no duplicate links', new Set(tiles.map((t) => t.href)).size === tiles.length,
  tiles.map((t) => t.href).filter((h, i, a) => a.indexOf(h) !== i).join(', '));

const picks = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'home-picks.json'), 'utf8'));
const pickNames = picks.rows.flatMap((r) => r.apps);
check(`the browser's own ${pickNames.length} picks are above the categories`,
  (html.slice(0, html.indexOf(EVERYTHING)).match(/class="app-button"/g) || []).length === pickNames.length);
check('every pick is a site the catalogue has',
  pickNames.every((n) => catalog.apps.some((a) => a.name === n)),
  pickNames.filter((n) => !catalog.apps.some((a) => a.name === n)).join(', '));
check('the picks block can be hidden as one thing when a filter is on',
  /<div id="picks" class="picks-block">/.test(html));

// A page that needs JavaScript to show its links is invisible to a search
// engine and to a child on a slow connection.
check('no tile is hidden in the markup', !/class="app-button"[^>]*hidden/.test(html));
check('there is still one h1, for a screen reader and a search engine',
  (html.match(/<h1\b/g) || []).length === 1);
check('the page says nothing above the search box',
  !/finder-sub/.test(html) && !/picks-lead/.test(html));
check('the tiles are in the HTML', tiles.length > 0);
check('the card starts hidden, so it cannot block a tile before it slides in',
  /<div id="cta" class="cta" hidden>/.test(html));
// Adam, 2026-11-07: it does not disappear. It used to remember being
// dismissed for thirty days, so a parent who closed it once on a shared
// family machine never saw the only thing on the page explaining what
// NotSus is.
check('the card cannot be dismissed',
  !/cta-close/.test(html) && !/cta-close/.test(cssSrc) && !/cta-close/.test(jsSrc));
// Against the code, not the comment that explains why the code is gone.
const jsCode = jsSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
check('and nothing remembers that it was',
  !/localStorage/.test(jsCode) && !/dismiss/i.test(jsCode));
check('a bar nobody can close leaves the page usable under it',
  /@media \(max-width: 760px\)[\s\S]*?body \{ padding-bottom:/.test(cssSrc)
  && /\.cta \{[\s\S]*?max-height: 72svh;[\s\S]*?overflow-y: auto;/.test(cssSrc));
check('the card sits level with the top of the logo bar, not below the header',
  /\.cta \{[\s\S]*?position: absolute;[\s\S]*?top: 0\.75rem;/.test(cssSrc)
  && /\.site-header \{[^}]*padding: 0\.75rem/.test(cssSrc));
check('the bar does not wrap to a second line on a phone',
  !/@media \(max-width: 760px\)[\s\S]*?\.capsule \{[^}]*flex-wrap/.test(cssSrc));
check('the card is in the header, hung off its right',
  html.indexOf('id="cta"') < html.indexOf('</header>'));
check('the logo bar is a capsule on the dark chrome, not a green field',
  /\.brand \{[\s\S]*?background: var\(--surface\);[\s\S]*?border-radius: 999px;/.test(cssSrc));
check('green is an accent on this page, never a large surface',
  !/\.(brand|cta) \{[^}]*background: var\(--primary\);/.test(cssSrc));
check('every tile is exactly the same height',
  /\.app-button \{[\s\S]*?\n  height: var\(--tile-h\);/.test(cssSrc));
// The whole point of fixed tracks: a card in a category is the same card as
// one in Learn. 1fr stretches a track to fill the leftover, which is how the
// two blocks ended up with different-sized cards in the first place.
check('every grid uses the one tile width, not a stretched fraction',
  /\.app-grid \{[\s\S]*?grid-template-columns: repeat\(auto-fill, var\(--tile\)\);/.test(cssSrc)
  && /\.picks \.app-grid \{ grid-template-columns: repeat\(3, var\(--tile\)\); \}/.test(cssSrc));
check('the tile grows with the screen and then stops',
  /--tile: clamp\(/.test(cssSrc) && /--tile-h: clamp\(/.test(cssSrc));
check('the search bar is exactly as wide as the three tiles under it',
  /--block: calc\(3 \* var\(--tile\) \+ 2 \* var\(--tile-gap\)\);/.test(cssSrc)
  && /\.capsule \{[\s\S]*?max-width: var\(--block\);/.test(cssSrc));
// The bar used to slide down the screen as somebody typed: the whole block
// was centred, hiding the picks made it shorter, and the centring moved.
check('the search bar is anchored, and only what is under it is centred',
  /<div class="first-screen-body">/.test(html)
  && !/\.first-screen-body \{[^}]*margin-block: auto/.test(cssSrc)
  && /\.first-screen \.tools \{[\s\S]*?justify-content: center;/.test(cssSrc));
check('a filter stops the first screen reserving a screenful',
  /body\.is-filtering \.first-screen \{ min-height: 0; \}/.test(cssSrc)
  && /classList\.toggle\('is-filtering', filtering\)/.test(jsSrc));
check('a long name cannot stretch its column out of line with the others',
  /\.app-button \{ min-width: 0; \}/.test(cssSrc));
check('a name and a tagline get one line each, and are clipped if longer',
  /\.app-name \{[\s\S]*?white-space: nowrap;[\s\S]*?text-overflow: ellipsis;/.test(cssSrc)
  && /\.app-description \{[\s\S]*?white-space: nowrap;[\s\S]*?text-overflow: ellipsis;/.test(cssSrc));

check('the card drops over half a second, half a second after load',
  /\.cta \{[\s\S]*?transition: transform 500ms/.test(cssSrc) && /\}, 500\);/.test(jsSrc));
check('the search box says Search', /placeholder="Search\.\.\."/.test(html));
// Adam's own words, 2026-11-07, and they are his to change, not mine to
// improve. The second line is in the button, which is where he asked for it.
check('the card says what Adam wrote, with the second line in the button',
  html.includes('<p class="cta-lead">Designed to be a browser.</p>')
  && /class="cta-go"[\s\S]{0,200}>Setup now for your kids</.test(html));
check('both tiers keep their full names',
  html.includes('Basic Kid&rsquo;s Browser') && html.includes('Custom Kid&rsquo;s Browser'));
check('Basic lists what it does not ask for',
  html.includes('No email &middot; No credit card &middot; No data'));
check('Custom says what Adam wrote, on two lines',
  html.includes('<span class="cta-tier-line">Parent input.</span>')
  && html.includes('<span class="cta-tier-line">An investment in your kid&rsquo;s future.</span>'));
check('the free option is the filled one, so there is an obvious first click',
  /class="cta-tier cta-tier-primary"/.test(html)
  && /\.cta-tier-primary \{[\s\S]*?background: var\(--primary\);/.test(cssSrc));
check('only the free one is badged',
  (html.match(/class="cta-tier-badge"/g) || []).length === 1);
// One button, one alternative. Two panels of equal weight make a visitor
// compare rather than act.
check('there is one filled option and one outlined one',
  (html.match(/class="cta-tier cta-tier-primary"/g) || []).length === 1
  && (html.match(/class="cta-tier cta-tier-quiet"/g) || []).length === 1
  && /\.cta-tier-quiet \{[\s\S]*?background: transparent;/.test(cssSrc));

// The downloads live in the card now, so a parent never leaves it.
const platforms = require(path.join(ROOT, 'lib', 'platforms.js')).PLATFORMS;
check(`the card offers all ${platforms.length} devices`,
  (html.match(/class="cta-device"/g) || []).length === platforms.length);
check('every device in the card is the one server.js serves',
  platforms.every((p) => html.includes(p.platform === 'ipad'
    ? 'mailto:contact@notsus.net'
    : `href="/download/${p.platform}"`)));
// A class rule setting `display` beats the browser's own
// `[hidden] { display: none }`, so anything the script hides has to say so in
// the stylesheet. The Setup button did not, stayed on screen once the card
// opened, and made the card look cramped because it held two things at once.
for (const c of ['cta', 'cta-more', 'cta-devices', 'cta-go']) {
  const setsDisplay = new RegExp(`\\.${c} \\{[^}]*display:`, 'm').test(cssSrc);
  const hasHiddenRule = new RegExp(`\\.${c}\\[hidden\\]`, 'm').test(cssSrc);
  check(`.${c} can actually be hidden`, !setsDisplay || hasHiddenRule,
    'it sets display in a class rule, which overrides [hidden]');
}
check('the card can be stepped back from the devices',
  /id="cta-back"/.test(html) && /id="cta-devices" hidden/.test(html));
check('the human check sits on the device step, not before the choice',
  html.indexOf('id="cta-devices"') < html.indexOf('cta-gate') || !html.includes('cta-gate'));
check('the round target cannot drift out of the right-hand edge',
  /\.cta-tier \{[\s\S]*?display: flex;/.test(cssSrc)
  && /\.cta-tier-text \{ display: flex;[^}]*flex: 1 1 auto; \}/.test(cssSrc));
check('everything pressable on the card ends in a round target',
  (html.match(/class="cta-chip"/g) || []).length === 3
  && /\.cta-chip \{[\s\S]*?border-radius: 50%;/.test(cssSrc));
check('the primary sits on its own light, so it reads as raised',
  /\.cta-tier-primary \{[\s\S]*?box-shadow: 0 8px 22px rgba\(0, 168, 107/.test(cssSrc)
  && /\.cta-go \{[\s\S]*?box-shadow: 0 6px 18px rgba\(0, 168, 107/.test(cssSrc));
check('both options answer a press', (cssSrc.match(/\.cta-(tier|go):active/g) || []).length === 2);
check('the card carries no explanatory small print', !/class="cta-foot"/.test(html));
check('the arrows are drawn, not typed', !/&rarr;|→/.test(html));
check('the card has no coloured rail down its side',
  !/\.cta \{[^}]*border-left:/.test(cssSrc));
check('the header, the bar and the two picks rows are one screenful',
  /<div class="first-screen">/.test(html)
  && /\.first-screen \{[\s\S]*?min-height: 100svh;/.test(cssSrc));
check('the footer no longer explains who runs the sites', !html.includes('footer-note'));
check('assets are asked for by a content hash, so a deploy is not cached for a year',
  /home\.css\?v=[a-f0-9]{10}/.test(html) && /home\.js\?v=[a-f0-9]{10}/.test(html));
check('the header logo is the small copy, not the 3.2 MB original',
  /public\/logo-120\.png\?v=/.test(html) && !html.includes('/public/logo.png'));
check('the public address is the one that may be published',
  html.includes('2015 Main Street') && !html.includes('Broadway'));

console.log('\nThe chrome');
// The header is the logo bar and the card. Every link that used to live up
// there, About included, is in the footer now.
const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
// The two links inside the card both go to /downloads and are the card, not
// navigation, so they are counted out before the rest is checked.
const headerOutsideCard = header.slice(0, header.indexOf('<div id="cta"'));
check('the header holds the logo bar and the card, and no navigation',
  (headerOutsideCard.match(/<a /g) || []).length === 1 && /class="brand"/.test(headerOutsideCard));
// The about page sits in the footer and not in the menu. Its label was
// 'Adam' for a day, which read the order Adam gave for these links as a name
// he wanted on one of them. A visitor cannot know who Adam is until they
// have been to the page, so it says About.
for (const label of ['About', 'Blog', 'Radio']) {
  check(`"${label}" is in the footer, not the header`,
    !header.includes(`>${label}<`) && html.indexOf(`>${label}<`) > html.indexOf('</header>'));
}
// Tools for Kids and Resources were dropped on 2026-11-07: the home page is
// the tools page now, and Resources pointed at an anchor rather than a page.
// Adam's order, 2026-11-07.
const FOOTER_ORDER = ['About', 'Download Browser', 'Contact Us', 'Resources', 'Radio', 'Blog'];
const footerBlock = html.slice(html.indexOf('aria-label="Site"'), html.indexOf('aria-label="Legal"'));
const footerLabels = (footerBlock.match(/>([^<]+)<\/a>/g) || []).map((m) => m.slice(1, -4));
check(`the footer reads ${FOOTER_ORDER.join(', ')}`,
  footerLabels.join('|') === FOOTER_ORDER.join('|'),
  `it reads ${footerLabels.join(', ')}`);
// The written footer below is no longer what a visitor sees: the widget in
// the bottom right is. It stays in the HTML so a crawler reads these links
// and so the page works with no JavaScript, and scripts/check-dock.js checks
// that the widget carries every one of them.
check('the written footer is kept, and says why',
  /<!-- The footer a crawler reads/.test(html));
// Adam set the order of the two rows on 2026-11-08. They are the first
// fifteen tiles anybody sees, so they are not left to whatever order the
// catalogue happens to be in.
{
  const ORDER = {
    LEARN: ['Khan Academy', 'Nat Geo Kids', 'Storyline Online', 'Wikipedia', 'Windy', 'Perplexity'],
    CREATE: ['Tinkercad', 'Canva', 'Scratch', 'Photopea', 'CapCut', 'Replit',
             'Google Docs', 'Google Slides', 'Google Sheets'],
  };
  for (const [key, want] of Object.entries(ORDER)) {
    const m = new RegExp(`data-picks="${key}"([\\s\\S]*?)</section>`).exec(html);
    const got = m ? [...m[1].matchAll(/<span class="app-name">([^<]+)</g)].map((x) => x[1]) : [];
    check(`${key} reads ${want.join(', ')}`, got.join('|') === want.join('|'),
      `it reads ${got.join(', ')}`);
  }
}

// Google Docs, Sheets and Slides all carried the same multicoloured G,
// because that is the favicon google.com serves and all three were fetched
// from it. Three products, three marks.
{
  const crypto = require('crypto');
  const dir = path.join(ROOT, 'home', 'icons');
  const sum = (f) => crypto.createHash('md5').update(fs.readFileSync(path.join(dir, f))).digest('hex');
  const g = ['google-docs.png', 'google-sheets.png', 'google-slides.png'];
  for (const f of g) check(`${f} is there`, fs.existsSync(path.join(dir, f)));
  if (g.every((f) => fs.existsSync(path.join(dir, f)))) {
    check('Docs, Sheets and Slides each have their own mark',
      new Set(g.map(sum)).size === 3,
      'at least two of them are the same image');
  }

  // Any other two tiles sharing an image. Two pairs are meant to: one
  // organisation with two entries in the catalogue has one logo.
  const ALLOWED = [
    ['code-org-for-pre-readers.svg', 'code-org.svg'],
    ['nasa-climate-kids.png', 'nasa-kids-club.png'],
  ].map((p) => p.join('|'));
  const byHash = {};
  for (const f of fs.readdirSync(dir)) (byHash[sum(f)] = byHash[sum(f)] || []).push(f);
  const dupes = Object.values(byHash).filter((v) => v.length > 1).map((v) => v.sort().join('|'));
  check('no two sites share a logo unless they are the same organisation',
    dupes.every((d) => ALLOWED.includes(d)),
    dupes.filter((d) => !ALLOWED.includes(d)).join('  '));
}

check('nothing in the footer points at the page that was removed',
  !html.includes('/tools'));
check('the about page is reachable, and by a page address',
  html.includes('<a href="/about">About</a>'));
for (const name of ['LinkedIn', 'YouTube', 'Instagram', 'TikTok', 'X']) {
  check(`the footer carries ${name}`, new RegExp(`aria-label="NotSus on ${name}"`).test(html));
}
check('nothing in the footer points at an anchor on a page that may move',
  !/href="\/#/.test(html));

console.log('\nThe tiles');
const logos = (everything.match(/class="app-logo" src="/g) || []).length;
check(`most tiles carry the site's own logo (${logos} of ${tiles.length})`, logos >= tiles.length * 0.85,
  `only ${logos}`);
check('every logo is served from this site, not from the site it belongs to',
  (html.match(/class="app-logo" src="([^"]*)"/g) || []).every((m) => m.includes('/home/icons/')));
check('every logo carries a content hash',
  (html.match(/\/home\/icons\/[^"?]+\?v=[a-f0-9]{10}/g) || []).length === (html.match(/class="app-logo" src="/g) || []).length);
check('a tile with no logo falls back to its emoji',
  (everything.match(/app-logo-emoji/g) || []).length === tiles.length - logos);
const descs = (html.match(/<span class="app-description">([^<]*)<\/span>/g) || [])
  .map((m) => m.replace(/<[^>]+>/g, ''));
check('every tile description is three words or fewer',
  descs.every((d) => d.split(/\s+/).length <= 3),
  descs.filter((d) => d.split(/\s+/).length > 3).join(' | '));
// The export enforces this too. It is checked again here because it is what
// decides whether a row of tiles looks like a row or like a mistake.
const names = (html.match(/<span class="app-name">([^<]*)<\/span>/g) || [])
  .map((m) => m.replace(/<[^>]+>/g, ''));
check('every name on a tile fits on one line',
  names.every((n) => n.length <= 19),
  names.filter((n) => n.length > 19).join(' | '));
check('a shortened name is still findable by its real one',
  tiles.some((t) => t.terms.includes('national geographic kids') && t.terms.includes('nat geo kids')));

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
  const unknown = suggestions.filter((s) => !catalogNames.includes(s));
  check(`"${brand}" suggests only sites the page has`, unknown.length === 0, unknown.join(', '));
}
check('the copy for a miss is present', Boolean(notCarried._miss_line && notCarried._empty_line && notCarried._download_line));
check('the download line and the mapping both reached the page',
  html.includes('"notCarried"') && html.includes('miss-data'));

console.log('\nThe catalogue and the synonyms agree');
check('the capsule holds the search and both dropdowns',
  /class="capsule"/.test(html) && /id="q"/.test(html) && /id="cat"/.test(html) && /id="age"/.test(html));
check('the search keeps a capsule of its own, and each filter is a segment',
  /class="capsule-search"/.test(html) && (html.match(/class="capsule-pick"/g) || []).length === 2);
const css = cssSrc;
check('each filter has a concave left edge, and the vendor-prefixed twin',
  /\.capsule-pick \{[\s\S]*?-webkit-mask-image: radial-gradient\(circle at left center/.test(css)
  && /\.capsule-pick \{[\s\S]*?\n  mask-image: radial-gradient\(circle at left center/.test(css));
check('the filters are pulled back so the bite lands on the capsule before them',
  /margin-left: calc\(var\(--cap\) \* -1\)/.test(css));
// 999px is a capsule end; 50% is the round clear button, which is the same
// curve. A square corner anywhere in the bar is the thing being watched for.
check('every piece of the bar is a capsule, at every width',
  (css.match(/\.capsule[^{]*\{[^}]*border-radius:[^;]+;/g) || [])
    .every((r) => /border-radius:\s*(999px|50%)\s*;/.test(r)));
check('DuckDuckGo is in Look things up',
  catalog.apps.some((a) => a.name === 'DuckDuckGo' && a.category === 'REFERENCE'));
check('DuckDuckGo forces safe search',
  catalog.apps.some((a) => a.name === 'DuckDuckGo' && a.url === 'https://safe.duckduckgo.com'));
check('DuckDuckGo waits for a parent to turn it on',
  catalog.apps.some((a) => a.name === 'DuckDuckGo' && a.requiresApproval === true));
check('there is no search button to press', !/type="submit"/.test(html));
check('every site has synonyms', catalogNames.every((n) => synonyms.apps[n]),
  catalogNames.filter((n) => !synonyms.apps[n]).join(', '));
check('no synonyms for a site that is gone',
  Object.keys(synonyms.apps).every((n) => catalogNames.includes(n)),
  Object.keys(synonyms.apps).filter((n) => !catalogNames.includes(n)).join(', '));
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
