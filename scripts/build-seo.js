#!/usr/bin/env node
// scripts/build-seo.js
//
// Writes the title, the description, the canonical address and the sharing
// tags into every page, and generates sitemap.xml.
//
// The copy lives in data/seo.json. This file only puts it where a search
// engine looks. It is idempotent: run it twice and the second run changes
// nothing, so it can run on every deploy.
//
// Why it exists. Until 2026-11-10 all nine blog posts carried the single
// title "NotSus.net - The Better Browser for Kids". The title is the
// strongest signal a page has and the blue link Google prints, so nine
// articles filed under one name read as nine copies of one page and none of
// them ranked. None of them had a description either, so Google wrote the
// snippets itself out of whatever text it found first, which on those pages
// is the navigation.
//
// Run: npm run build:seo

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const seo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seo.json'), 'utf8'));
const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'blog', 'articles.json'), 'utf8'));
const SITE = seo.site;

/**
 * When a file last changed, as a date.
 *
 * Git's last commit for the file, not its mtime. mtime is the moment this
 * script wrote the file, so using it meant every run produced a new date,
 * which produced a new file, which produced a new date. Nine pages changed
 * on every single run and the sitemap churned with them.
 */
const dateCache = new Map();
function lastChanged(rel) {
  if (dateCache.has(rel)) return dateCache.get(rel);
  let out;
  try {
    const d = execFileSync('git', ['log', '-1', '--format=%cI', '--', rel],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    out = d ? d.slice(0, 10) : undefined;
  } catch (err) { out = undefined; }
  // A file git has never seen, which in practice means a new post not yet
  // committed. Its own timestamp is the best there is.
  if (!out && fs.existsSync(path.join(ROOT, rel))) {
    out = new Date(fs.statSync(path.join(ROOT, rel)).mtime).toISOString().slice(0, 10);
  }
  dateCache.set(rel, out);
  return out;
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Replace a tag if it is there, add it to the head if it is not.
 *
 * Matching on the whole tag rather than on its contents is what makes this
 * safe to run again: a second run finds what the first one wrote and puts
 * the same thing back.
 */
function setTag(html, find, tag) {
  if (find.test(html)) return html.replace(find, tag);
  return html.replace(/<\/head>/, `    ${tag}\n</head>`);
}

function apply(html, { title, description, canonical, type, published }) {
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = setTag(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}">`);
  html = setTag(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}">`);
  html = setTag(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}">`);
  html = setTag(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(description)}">`);
  html = setTag(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}">`);
  html = setTag(html, /<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${type || 'website'}">`);
  html = setTag(html, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${SITE}/public/logo-120.png">`);
  html = setTag(html, /<meta name="twitter:card"[^>]*>/, '<meta name="twitter:card" content="summary">');

  // An article says who wrote it and when, so a search result can too.
  if (type === 'article') {
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title.replace(/ \| NotSus$/, ''),
      description,
      url: canonical,
      datePublished: published,
      author: { '@type': 'Organization', name: 'NotSus Education Inc.' },
      publisher: {
        '@type': 'Organization',
        name: 'NotSus Education Inc.',
        logo: { '@type': 'ImageObject', url: `${SITE}/public/logo-120.png` },
      },
      mainEntityOfPage: canonical,
    };
    const tag = `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
    html = setTag(html, /<script type="application\/ld\+json">[\s\S]*?<\/script>/, tag);
  }
  return html;
}

/**
 * The links a crawler follows out of a page.
 *
 * Each page shipped with its own footer and they held different links, so
 * the blog could be reached from the home page and the home page's own
 * sections could not be reached from the blog. This appends one list to
 * whatever footer the page already has. Nobody sees it: the widget in
 * scripts/footer-dock.js is what is on screen and the stylesheet hides the
 * written footer. It is here to be read, not looked at.
 */
const FOOTER_LINKS = [
  ['/', 'Free websites for kids'],
  ['/about', 'About NotSus'],
  ['/downloads', 'Download the browser'],
  ['/resources', 'Resources'],
  ['/podcast/', 'Radio'],
  ['/blog/', 'Blog'],
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms of Service'],
  ['/delete-account/', 'Delete your account'],
];

function footerNav(selfPath) {
  const links = FOOTER_LINKS
    .filter(([href]) => href !== selfPath)
    .map(([href, label]) => `<a href="${href}">${label}</a>`)
    .join('');
  return `<nav class="site-footer-nav" aria-label="Site">${links}</nav>`;
}

function addFooterNav(html, selfPath) {
  const nav = footerNav(selfPath);
  if (/<nav class="site-footer-nav"[\s\S]*?<\/nav>/.test(html)) {
    return html.replace(/<nav class="site-footer-nav"[\s\S]*?<\/nav>/, nav);
  }
  const at = html.lastIndexOf('</footer>');
  if (at === -1) return html;
  return html.slice(0, at) + nav + html.slice(at);
}

// --------------------------------------------------------------- the pages

let touched = 0;
const urls = [];

function write(rel, html, before) {
  if (html !== before) { fs.writeFileSync(path.join(ROOT, rel), html); touched++; }
}

for (const [rel, meta] of Object.entries(seo.pages)) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.error(`data/seo.json names ${rel}, which is not there.`); process.exit(1); }
  const before = fs.readFileSync(file, 'utf8');
  let html = apply(before, {
    title: meta.title,
    description: meta.description,
    canonical: SITE + meta.path,
  });
  html = addFooterNav(html, meta.path);
  write(rel, html, before);
  urls.push({ loc: SITE + meta.path, file: rel });
}

// The blog posts.
for (const post of articles) {
  const rel = `blog/${post.slug}.html`;
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.error(`blog/articles.json names ${post.slug}, which is not there.`); process.exit(1); }
  const meta = seo.posts[post.slug];
  if (!meta) { console.error(`No title or description for ${post.slug}. Add one to data/seo.json.`); process.exit(1); }
  const before = fs.readFileSync(file, 'utf8');
  const canonical = `${SITE}/${rel}`;
  const published = lastChanged(rel);
  let html = apply(before, { title: meta.title, description: meta.description, canonical, type: 'article', published });
  html = addFooterNav(html, `/${rel}`);
  write(rel, html, before);
  urls.push({ loc: canonical, file: rel });
}

// The home page is generated by build-home.js and already carries its own
// title, description and sharing tags. It needs the canonical and the two
// pieces of structured data that describe the site itself.
{
  const rel = 'home/index.html';
  const before = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  let html = setTag(before, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${SITE}/">`);
  html = setTag(html, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${SITE}/public/logo-120.png">`);
  html = setTag(html, /<meta name="twitter:card"[^>]*>/, '<meta name="twitter:card" content="summary">');
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'Organization',
      name: 'NotSus Education Inc.', url: SITE, logo: `${SITE}/public/logo-120.png`,
      email: 'contact@notsus.net',
      address: {
        '@type': 'PostalAddress', streetAddress: '2015 Main Street',
        addressLocality: 'Vancouver', addressRegion: 'BC', addressCountry: 'CA',
      },
      sameAs: [
        'https://www.linkedin.com/company/notsus', 'https://www.youtube.com/@NotSus_Edu',
        'https://www.instagram.com/notsus_edu/', 'https://www.tiktok.com/@notsus_edu',
        'https://x.com/NotSus_edu',
      ],
    },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'NotSus.net', url: SITE },
  ];
  html = setTag(html, /<script type="application\/ld\+json">\[[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
  write(rel, html, before);
  urls.unshift({ loc: `${SITE}/`, file: rel });
}

// /downloads is rendered by server.js, so it is in the sitemap and its tags
// live over there.
urls.push({ loc: `${SITE}/downloads`, file: 'server.js' });

// ------------------------------------------------------------- the sitemap

const lastmod = (file) => lastChanged(file);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.w3.org/1999/sitemap/0.9">
${urls.map(({ loc, file }) => {
  const m = lastmod(file);
  return `  <url>\n    <loc>${loc}</loc>${m ? `\n    <lastmod>${m}</lastmod>` : ''}\n  </url>`;
}).join('\n')}
</urlset>
`.replace('http://www.w3.org/1999/sitemap/0.9', 'http://www.sitemaps.org/schemas/sitemap/0.9');

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

// robots.txt, so every crawler is told where the sitemap is rather than only
// the one we hand it to in Search Console.
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *
Allow: /

# Nothing here is for a crawler, and /admin holds a dashboard.
Disallow: /admin
Disallow: /api/
Disallow: /download/

Sitemap: ${SITE}/sitemap.xml
`);

console.log(`sitemap.xml  ${urls.length} addresses`);
console.log(`robots.txt   written`);
console.log(`${touched} page(s) changed`);
