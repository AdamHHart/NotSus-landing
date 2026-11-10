#!/usr/bin/env node
// scripts/check-seo.js
//
// What a search engine is given, checked against what it needs.
//
// The thing this exists to stop happening again: until 2026-11-10 all nine
// blog posts carried the single title "NotSus.net - The Better Browser for
// Kids". Nothing was broken, nothing threw, every page served 200, and none
// of those articles could rank because to a search engine they read as nine
// copies of one page.
//
// Run: npm run check:seo

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const seo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seo.json'), 'utf8'));
const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'blog', 'articles.json'), 'utf8'));
const SITE = seo.site;

let failed = 0, passed = 0;
const ok = (name, cond, detail) => {
  if (cond) { passed++; return; }
  failed++;
  console.error(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`);
};

console.log('What a search engine is given');

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const tagOf = (html, re) => { const m = re.exec(html); return m ? m[1] : null; };
const titleOf = (html) => tagOf(html, /<title>([\s\S]*?)<\/title>/);
const descOf = (html) => tagOf(html, /<meta name="description" content="([^"]*)"/);
const canonOf = (html) => tagOf(html, /<link rel="canonical" href="([^"]*)"/);

// Every page that is meant to be found.
const pages = [
  ['home/index.html', '/'],
  ...Object.entries(seo.pages).map(([rel, m]) => [rel, m.path]),
  ...articles.map((a) => [`blog/${a.slug}.html`, `/blog/${a.slug}.html`]),
];

const titles = new Map();
for (const [rel, urlPath] of pages) {
  const html = read(rel);
  const title = titleOf(html);
  const desc = descOf(html);
  const canon = canonOf(html);

  ok(`${rel} has a title`, !!title && title.trim().length > 0);
  ok(`${rel} has a description`, !!desc && desc.trim().length > 0);
  ok(`${rel} says which address it is`, canon === SITE + urlPath,
    `canonical is ${canon}, should be ${SITE}${urlPath}`);

  if (title) {
    // 60 is roughly where Google stops printing the blue link.
    ok(`${rel} has a title that fits`, title.length <= 60, `${title.length} characters`);
    const seen = titles.get(title);
    ok(`${rel} has a title of its own`, !seen,
      seen ? `it shares "${title}" with ${seen}` : '');
    if (!seen) titles.set(title, rel);
  }
  if (desc) {
    ok(`${rel} has a description that fits`, desc.length >= 80 && desc.length <= 170,
      `${desc.length} characters`);
  }
  ok(`${rel} can be shared`, /<meta property="og:title"/.test(html) && /<meta property="og:image"/.test(html));

  // The widget is JavaScript. These are the links a crawler follows without
  // running any, and every page needs some or the blog is an island.
  const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1])
    .filter((h) => !/\.(css|js|png|ico|svg|jpg|webp)/.test(h));
  ok(`${rel} links to the rest of the site without JavaScript`, new Set(hrefs).size >= 6,
    `${new Set(hrefs).size} links`);
}

// One footer, in the HTML, on every page.
//
// Each page shipped with its own and they held different links, so the blog
// could be reached from the home page and the home page could not be reached
// from a legal page. The widget is identical everywhere already, but the
// widget is JavaScript. This is the list a crawler reads.
{
  const CANON = ['/', '/about', '/downloads', '/resources', '/podcast/', '/blog/',
    '/privacy', '/terms', '/delete-account/'];
  for (const [rel, urlPath] of pages) {
    if (rel === 'home/index.html') continue; // it is generated with its own
    const html = read(rel);
    const m = /<nav class="site-footer-nav"[^>]*>([\s\S]*?)<\/nav>/.exec(html);
    ok(`${rel} carries the shared footer list`, !!m);
    if (!m) continue;
    const got = [...m[1].matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
    // A page does not link to itself, and that is the only difference
    // allowed between one page's list and another's.
    const want = CANON.filter((h) => h !== urlPath);
    ok(`${rel}'s list is the shared one, minus itself`,
      got.join('|') === want.join('|'),
      `it reads ${got.join(', ')}`);
  }
}

// The old title, by name, because it is the one that caused this.
ok('no page still carries the old shared title',
  !pages.some(([rel]) => titleOf(read(rel)) === 'NotSus.net - The Better Browser for Kids'));

// Each blog post says it is an article, and says so in a form a search
// engine reads rather than guesses at.
for (const a of articles) {
  const html = read(`blog/${a.slug}.html`);
  ok(`${a.slug} is marked up as an article`, /"@type":"Article"/.test(html));
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  let parsed = null;
  try { parsed = m ? JSON.parse(m[1]) : null; } catch (err) { parsed = null; }
  ok(`${a.slug}'s markup is valid JSON`, !!parsed);
  if (parsed) {
    ok(`${a.slug} says when it was published`, /^\d{4}-\d{2}-\d{2}$/.test(parsed.datePublished || ''));
    ok(`${a.slug} says where it lives`, parsed.url === `${SITE}/blog/${a.slug}.html`);
  }
}

// The home page describes the business, which is what a search engine shows
// beside a brand search.
{
  const html = read('home/index.html');
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  let ld = null;
  try { ld = m ? JSON.parse(m[1]) : null; } catch (err) { ld = null; }
  ok('the home page describes the organisation', Array.isArray(ld) && ld.some((x) => x['@type'] === 'Organization'));
  ok('and the site', Array.isArray(ld) && ld.some((x) => x['@type'] === 'WebSite'));
  const org = Array.isArray(ld) ? ld.find((x) => x['@type'] === 'Organization') : null;
  ok('with the public address, not the registered one',
    org && org.address && org.address.streetAddress === '2015 Main Street'
    && !JSON.stringify(ld).includes('1624') && !/E Broadway/i.test(JSON.stringify(ld)));
  ok('and the five accounts', org && (org.sameAs || []).length === 5);
}

// The sitemap.
{
  const file = path.join(ROOT, 'sitemap.xml');
  ok('there is a sitemap', fs.existsSync(file));
  if (fs.existsSync(file)) {
    const xml = fs.readFileSync(file, 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    ok('it names the sitemap schema', xml.includes('http://www.sitemaps.org/schemas/sitemap/0.9'));
    for (const [, urlPath] of pages) {
      ok(`the sitemap lists ${urlPath}`, locs.includes(SITE + urlPath));
    }
    ok('every address in it is on this site', locs.every((l) => l.startsWith(SITE + '/')));
    ok('and none of them is a redirect',
      !locs.some((l) => l === `${SITE}/resources` || l === `${SITE}/tools` || l === `${SITE}/home`),
      'a sitemap should list where a page is, not where it forwards from');
    ok('no duplicates', new Set(locs).size === locs.length);
  }
}

// robots.txt.
{
  const file = path.join(ROOT, 'robots.txt');
  ok('there is a robots.txt', fs.existsSync(file));
  if (fs.existsSync(file)) {
    const txt = fs.readFileSync(file, 'utf8');
    ok('it points at the sitemap', txt.includes(`Sitemap: ${SITE}/sitemap.xml`));
    ok('it lets the site be crawled', /^Allow: \/$/m.test(txt));
    ok('and keeps crawlers out of the dashboard', /^Disallow: \/admin$/m.test(txt));
    ok('and off the download counter', /^Disallow: \/download\/$/m.test(txt),
      'every hit there writes a row');
  }
}

// Both files have to be reachable, or none of the above counts.
{
  const server = read('server.js');
  const staticAt = server.indexOf('express.static');
  ok('the server serves files from the project root', staticAt !== -1);
  ok('so /sitemap.xml and /robots.txt are served',
    fs.existsSync(path.join(ROOT, 'sitemap.xml')) && fs.existsSync(path.join(ROOT, 'robots.txt'))
    && staticAt !== -1);
}

// The generated home page is rebuilt on every boot, and build-seo has to run
// after it or the canonical and the structured data are thrown away.
{
  const pkg = JSON.parse(read('package.json'));
  ok('the home page is rebuilt and then given its tags again',
    /build-home\.js && node scripts\/build-seo\.js/.test(pkg.scripts.prestart || ''),
    'prestart regenerates home/index.html, which would drop what build-seo wrote');
  const render = read('render.yaml');
  ok('and the deploy does the same', /build:home && npm run build:seo/.test(render));
}

console.log(`\n  ${passed} checks pass${failed ? `, ${failed} FAIL` : ''}`);
process.exit(failed ? 1 : 0);
