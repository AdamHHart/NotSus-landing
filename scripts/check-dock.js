#!/usr/bin/env node
// scripts/check-dock.js
//
// The footer and its widgets, run against a DOM small enough to live in this
// file. There is no browser in this sandbox and no port to open one against,
// so the script is executed here and the tree it builds is read back, and the
// clicks are dispatched by hand.
//
// Run: npm run check:dock

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { PLATFORMS, IPAD_MAILTO } = require('../lib/platforms');
const shim = require('./dom-shim');

// The three documents the Legal widget reads, served from disk the way the
// server serves them.
const DOCS = {
  '/docs/PrivacyPolicy.html': 'docs/PrivacyPolicy.html',
  '/docs/TandC.html': 'docs/TandC.html',
  '/delete-account/': 'delete-account/index.html',
};
function DOMParserShim() {
  this.parseFromString = (text) => {
    const root = shim.parse(text.replace(/<style[\s\S]*?<\/style>/g, ''));
    root.body = root;
    root.querySelector = (sel) => root.querySelectorAll(sel)[0] || null;
    return root;
  };
}

let failed = 0, passed = 0;
const ok = (name, cond, detail) => {
  if (cond) { passed++; return; }
  failed++;
  console.error(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`);
};

// ---------------------------------------------------------------- a DOM

class ClassList {
  constructor() { this.s = new Set(); }
  add(c) { this.s.add(c); } remove(c) { this.s.delete(c); }
  contains(c) { return this.s.has(c); }
  toString() { return [...this.s].join(' '); }
}
class Node {
  constructor(tag) {
    this.tagName = (tag || '').toUpperCase();
    this.children = []; this.attrs = {}; this.classList = new ClassList();
    this.style = { setProperty: (k, v) => { this.attrs['style:' + k] = v; } };
    this.listeners = {}; this._html = ''; this._text = ''; this.hidden = false;
  }
  set id(v) { this.attrs.id = String(v); }           get id() { return this.attrs.id; }
  // <details>. The widget fetches a document the first time one is opened,
  // which is where the bug of 2026-11-08 lived: nothing had ever opened one.
  set open(v) { this._open = !!v; this.dispatch('toggle'); }
  get open() { return !!this._open; }
  set href(v) { this.attrs.href = String(v); }       get href() { return this.attrs.href; }
  set target(v) { this.attrs.target = String(v); }   get target() { return this.attrs.target; }
  set rel(v) { this.attrs.rel = String(v); }         get rel() { return this.attrs.rel; }
  set className(v) { this._cls = String(v); this.classList = new ClassList(); String(v).split(/\s+/).filter(Boolean).forEach((c) => this.classList.add(c)); }
  get className() { return this._cls || ''; }
  set innerHTML(v) { this._html = String(v); }       get innerHTML() { return this._html; }
  set textContent(v) { this._text = String(v); }
  get textContent() {
    const own = this._text || this._html.replace(/<[^>]*>/g, '');
    return own + this.children.map((c) => c.textContent).join(' ');
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  appendChild(n) { this.children.push(n); n.parentNode = this; return n; }
  removeChild(n) { this.children = this.children.filter((c) => c !== n); return n; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  dispatch(t, e) { (this.listeners[t] || []).forEach((fn) => fn(e || { target: this })); }
  focus() {}
  getBoundingClientRect() { return { height: 120 }; }
  get all() { return this.children.reduce((a, c) => a.concat([c], c.all), []); }
  matches(sel) {
    if (sel.startsWith('.')) return this.classList.contains(sel.slice(1));
    if (sel.startsWith('[') && sel.endsWith(']')) return sel.slice(1, -1) in this.attrs;
    return this.tagName === sel.toUpperCase();
  }
  closest(sel) {
    let n = this;
    while (n) { if (n.matches && n.matches(sel)) return n; n = n.parentNode; }
    return null;
  }
  querySelectorAll(sel) {
    // Only the shapes this script actually asks for.
    if (sel === '.ns-panel') return this.all.filter((n) => n.classList.contains('ns-panel'));
    if (sel === '.ns-footer-links a') {
      const nav = this.all.find((n) => n.classList.contains('ns-footer-links'));
      return nav ? nav.children.filter((n) => n.tagName === 'A') : [];
    }
    return [];
  }
  hrefs() {
    const out = this.all.filter((n) => n.attrs.href).map((n) => n.attrs.href);
    (this.all.map((n) => n._html).join(' ').match(/href="([^"]+)"/g) || []).forEach((m) => out.push(m.slice(6, -1)));
    return out;
  }
}

function makeDocument(withCard) {
  const doc = new Node('#document');
  doc.head = doc.appendChild(new Node('head'));
  doc.body = doc.appendChild(new Node('body'));
  doc.documentElement = new Node('html');
  doc.readyState = 'complete';
  // The footer the page shipped with, which the widget should stand down.
  const old = new Node('footer');
  old.className = 'site-footer';
  doc.body.appendChild(old);
  doc.oldFooter = old;
  const byId = {};
  // The home page bakes the blog list into itself. Every other page asks for
  // the file instead, which this DOM has no way to answer, so the widget
  // there is checked only for the link out.
  if (withCard) {
    const baked = new Node('script');
    baked.attrs.id = 'ns-articles';
    baked.textContent = fs.readFileSync(path.join(ROOT, 'blog', 'articles.json'), 'utf8');
    byId['ns-articles'] = baked;
  }
  if (withCard) {
    const cta = new Node('div');
    cta.attrs.id = 'cta';
    byId.cta = cta;
    doc.body.appendChild(cta);
  }
  doc.createElement = (t) => new Node(t);
  doc.getElementById = (id) => byId[id] || doc.body.all.find((n) => n.attrs.id === id) || null;
  doc.querySelector = (sel) => {
    if (sel.startsWith('link[')) return doc.head.children.find((n) => n.tagName === 'LINK' && 'data-ns-dock' in n.attrs) || null;
    if (sel.startsWith('script[')) return doc.head.children.find((n) => n.tagName === 'SCRIPT' && 'data-ns-dock' in n.attrs) || null;
    return null;
  };
  doc.querySelectorAll = (sel) => doc.body.querySelectorAll(sel);
  doc.listeners = {};
  doc.addEventListener = Node.prototype.addEventListener.bind(doc);
  return doc;
}

// A fetch that answers at once, so a synchronous check can read what the
// widget drew. Two episodes is enough to prove the shape.
const EPISODES = {
  success: true,
  data: {
    spotifyUrl: 'https://open.spotify.com/show/notsus',
    episodes: [
      { title: 'AI in Schools', description: 'A conversation about what changes.', pubDate: 'Fri, 14 Aug 2026 21:38:27 GMT', duration: '01:05:36', episodePageUrl: 'https://open.spotify.com/episode/one' },
      { title: 'What a nine year old wants', description: 'And what they get instead.', pubDate: 'Mon, 02 Jun 2026 10:00:00 GMT', duration: '48:02' }
    ]
  }
};
// A promise that has already settled, so a synchronous check can read what
// the widget drew without waiting for a tick.
function settled(value, err) {
  const self = {
    then(onOk) {
      if (err) return self;
      try { return settled(onOk(value)); } catch (e) { return settled(undefined, e); }
    },
    catch(onErr) {
      if (!err) return self;
      try { return settled(onErr(err)); } catch (e) { return settled(undefined, e); }
    },
  };
  return self;
}
function instantFetch(url) {
  if (url === '/api/podcast/episodes') {
    return settled({ ok: true, json: () => EPISODES, text: () => '' });
  }
  if (DOCS[url]) {
    const text = fs.readFileSync(path.join(ROOT, DOCS[url]), 'utf8');
    return settled({ ok: true, text: () => text, json: () => JSON.parse(text) });
  }
  return settled(undefined, new Error('404 ' + url));
}

function run(src, withCard) {
  const document = makeDocument(withCard);
  const win = { addEventListener() {}, ResizeObserver: null, fetch: instantFetch, NS_DEBUG: !!process.env.NS_DEBUG };
  new Function('document', 'window', 'requestAnimationFrame', 'MutationObserver', 'fetch', 'DOMParser', src)(
    document, win, (fn) => fn(), function () { this.observe = () => {}; }, instantFetch, DOMParserShim
  );
  return document;
}

// Dispatch a click the way a browser would: the handler asks the target for
// its nearest matching ancestor.
function click(doc, node) {
  const e = { target: node, preventDefault() {}, metaKey: false, ctrlKey: false, shiftKey: false, button: 0 };
  (doc.listeners.click || []).forEach((fn) => fn(e));
}

// ---------------------------------------------------------------- checks

const dockJs = fs.readFileSync(path.join(ROOT, 'scripts', 'footer-dock.js'), 'utf8');
const dockCss = fs.readFileSync(path.join(ROOT, 'home', 'footer-dock.css'), 'utf8');
const chrome = fs.readFileSync(path.join(ROOT, 'scripts', 'site-chrome.js'), 'utf8');
const home = fs.readFileSync(path.join(ROOT, 'home', 'index.html'), 'utf8');

console.log('The footer, and the widget each item opens');

const ITEMS = ['About', 'Download', 'Contact', 'Resources', 'Radio', 'Blog', 'Follow', 'Legal'];
// Every page a footer item can send somebody to with no JavaScript, checked
// against scripts/check-routes.js and against the live site.
const DESTINATIONS = ['/about', '/downloads', 'mailto:contact@notsus.net', '/resources',
  '/podcast/', '/blog/', '/privacy', '/terms', '/delete-account/'];

for (const [label, withCard] of [['home page', true], ['every other page', false]]) {
  const doc = run(dockJs, withCard);
  const root = doc.body.all.find((n) => n.attrs.id === 'ns-dock');
  const footer = doc.body.children.find((n) => n.classList.contains('ns-footer'));

  ok(`${label}: there is a footer at the bottom of the page`, !!footer);
  ok(`${label}: the widget has somewhere to open`, !!root);
  if (!footer || !root) continue;

  ok(`${label}: the page's own footer is stood down`, doc.documentElement.classList.contains('ns-docked'));
  ok(`${label}: the footer names the product`, footer.textContent.includes('NotSus.net'));
  ok(`${label}: and carries the registered address`,
    footer.textContent.includes('2015 Main Street, Vancouver, BC, Canada'));
  ok(`${label}: and not the home address`,
    !footer.textContent.includes('1624') && !/E Broadway/i.test(footer.textContent));

  const links = doc.querySelectorAll('.ns-footer-links a');
  ok(`${label}: the footer reads ${ITEMS.join(', ')}`,
    links.map((a) => a.textContent).join('|') === ITEMS.join('|'),
    `it reads ${links.map((a) => a.textContent).join(', ')}`);
  ok(`${label}: every item is short`, links.every((a) => a.textContent.length <= 9));
  ok(`${label}: every item opens a widget`, links.every((a) => a.getAttribute('data-panel')));
  ok(`${label}: every item still goes somewhere with no JavaScript`,
    links.every((a) => a.attrs.href && a.attrs.href !== '#'));
  ok(`${label}: and goes somewhere that exists`,
    links.every((a) => DESTINATIONS.includes(a.attrs.href) || /^https?:/.test(a.attrs.href)),
    links.filter((a) => !DESTINATIONS.includes(a.attrs.href) && !/^https?:/.test(a.attrs.href)).map((a) => a.attrs.href).join(', '));

  // The scrim is inside the widget's root. A stacking context is created by
  // the root's own z-index, so a scrim outside it painted over every widget
  // on a phone and the panel came up grey and would not answer a tap.
  const scrim = root.children.find((n) => n.classList.contains('ns-scrim'));
  ok(`${label}: the scrim is inside the widget's root`, !!scrim,
    'outside it, the root\'s stacking context puts every panel under it');
  ok(`${label}: and starts out of the way`, scrim && scrim.hidden === true);
  ok(`${label}: nothing is open to begin with`, root.querySelectorAll('.ns-panel').length === 0);

  // Open each item in turn.
  for (const a of links) {
    const key = a.getAttribute('data-panel');
    click(doc, a);
    const panels = root.querySelectorAll('.ns-panel');
    ok(`${label}: ${key} opens one widget`, panels.length === 1,
      `${panels.length} open`);
    if (panels.length !== 1) continue;
    const panel = panels[0];
    ok(`${label}: ${key} is titled ${a.textContent}`,
      panel.getAttribute('aria-label') === a.textContent);
    const close = panel.all.find((n) => n.classList.contains('ns-panel-close'));
    ok(`${label}: ${key} has an X`, !!close && close.innerHTML.includes('&times;'));
    ok(`${label}: ${key} slides in`, panel.classList.contains('is-in'));
    ok(`${label}: ${key} dims the page behind it on a phone`, scrim.hidden === false);
    ok(`${label}: the ${key} item shows as open`, a.getAttribute('aria-expanded') === 'true');
    // Every link inside it goes somewhere, and outside links go away safely.
    const out = panel.all.filter((n) => n.attrs.href && /^https?:/.test(n.attrs.href));
    ok(`${label}: ${key}'s outside links open away from the page`,
      out.every((n) => n.attrs.target === '_blank' && (n.attrs.rel || '').includes('noopener')));
    ok(`${label}: nothing in ${key} points into the middle of another page`,
      !panel.hrefs().some((h) => h.includes('#')));
  }

  // One at a time.
  click(doc, links[0]);
  click(doc, links[1]);
  ok(`${label}: opening a second widget replaces the first`,
    root.querySelectorAll('.ns-panel').length === 1);
  ok(`${label}: and the first item stops showing as open`,
    links[0].getAttribute('aria-expanded') === 'false');

  // The X, and Escape.
  const open = root.querySelectorAll('.ns-panel')[0];
  const x = open.all.find((n) => n.classList.contains('ns-panel-close'));
  (x.listeners.click || [])[0]();
  ok(`${label}: the X closes it`, root.querySelectorAll('.ns-panel').length === 0);
  ok(`${label}: and the page comes back`, scrim.hidden === true);
  click(doc, links[2]);
  (doc.listeners.keydown || []).forEach((fn) => fn({ key: 'Escape' }));
  ok(`${label}: Escape closes it too`, root.querySelectorAll('.ns-panel').length === 0);

  // What is inside each one.
  const bodyOf = (key) => {
    click(doc, links.find((l) => l.getAttribute('data-panel') === key));
    return root.querySelectorAll('.ns-panel')[0];
  };
  ok(`${label}: Contact is the address, as a button`,
    bodyOf('contact').hrefs().includes('mailto:contact@notsus.net'));
  const res = bodyOf('resources').hrefs();
  ok(`${label}: Resources carries the Browser Blocker`,
    res.includes('https://download.notsus.net/Watchdog_installer.msi'));
  ok(`${label}: and the guide`,
    res.includes('https://download.notsus.net/How_to_block_other_browsers.pdf'));
  const followBody = bodyOf('follow');
  const follow = followBody.hrefs();
  ['https://www.linkedin.com/company/notsus', 'https://www.youtube.com/@NotSus_Edu',
   'https://www.instagram.com/notsus_edu/', 'https://www.tiktok.com/@notsus_edu',
   'https://x.com/NotSus_edu'].forEach((u) => ok(`${label}: Follow reaches ${u}`, follow.includes(u)));
  // Adam, 2026-11-08: Follow was pills while everything else was rows, which
  // made it the one widget that looked like something else.
  ok(`${label}: Follow is a list of buttons like the others`,
    followBody.all.filter((n) => n.classList.contains('ns-row')).length === 5);
  ok(`${label}: and no longer a row of pills`,
    !followBody.all.some((n) => n.classList.contains('ns-pill')));
  if (withCard) {
    const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'blog', 'articles.json'), 'utf8'));
    const blog = bodyOf('blog');
    const listed = () => blog.hrefs().filter((h) => /^\/blog\/.+$/.test(h) && h !== '/blog/');
    // Nine made the widget taller than the screen.
    ok(`${label}: Blog opens short`, listed().length === 4, `${listed().length} shown`);
    const more = blog.all.find((n) => n.classList.contains('ns-more'));
    ok(`${label}: and offers the rest`, !!more);
    ok(`${label}: saying how many`, more && /Load 5 more/.test(more.textContent), more && more.textContent);
    if (more) (more.listeners.click || []).forEach((fn) => fn());
    ok(`${label}: which loads them here, not on another page`,
      listed().length === posts.length, `${listed().length} of ${posts.length}`);
    ok(`${label}: each by its own address`,
      posts.every((p) => listed().includes('/blog/' + p.slug + '.html')));
    // The address has to be a file that is there. The check used to assert
    // the link matched the slug, which it did, and nine links all answered
    // 'Cannot GET' because a post is <slug>.html and the widget dropped the
    // extension. An address nobody has opened is not an address.
    listed().forEach((href) => {
      const rel = href.replace(/^\//, '').split('?')[0];
      ok(`${label}: ${rel} is a file that exists`, fs.existsSync(path.join(ROOT, rel)));
    });
    ok(`${label}: and by its own title`,
      posts.every((p) => blog.textContent.includes(p.title)));
    ok(`${label}: the button goes once they are all out`,
      !blog.all.some((n) => n.classList.contains('ns-more')));
    ok(`${label}: and there is no row sending anyone to the blog page`,
      !blog.hrefs().includes('/blog/'), 'Load more replaced it');
  }
  const legalBody = bodyOf('legal');
  const folds = legalBody.all.filter((n) => n.classList.contains('ns-fold'));
  ok(`${label}: Legal holds the documents themselves`, folds.length === 3,
    `${folds.length} headings`);
  ['Privacy Policy', 'Terms of Service', 'Delete your account'].forEach((t) =>
    ok(`${label}: ${t} is one of them`, legalBody.textContent.includes(t)));
  ok(`${label}: and they drop down rather than navigating`,
    folds.every((f) => !f.attrs.href));
  ok(`${label}: Delete your account no longer sends anyone to a page`,
    !legalBody.hrefs().includes('/delete-account/'));

  // Open each one. Nothing ever had, which is how /delete-account/ shipped
  // being handed to JSON.parse and reporting itself as unavailable.
  const DOC_TITLES = ['Privacy Policy', 'Terms of Service', 'Delete your account'];
  folds.forEach((f, i) => {
    f.open = true;
    const sections = f.all.filter((n) => n.classList.contains('ns-fold-inner'));
    ok(`${label}: ${DOC_TITLES[i]} opens into its own sections`, sections.length >= 4,
      `${sections.length} sections`);
    ok(`${label}: ${DOC_TITLES[i]} has words in it`, f.textContent.length > 600,
      `${f.textContent.length} characters`);
    ok(`${label}: ${DOC_TITLES[i]} did not fail to load`,
      !/Could not load/.test(f.textContent));
  });
  ok(`${label}: Delete your account explains how`,
    folds[2].textContent.includes('Delete my account')
    && folds[2].textContent.includes('parent PIN'));

  ok(`${label}: Legal is where the address lives`,
    legalBody.textContent.includes('2015 Main Street'));

  // Adam, 2026-11-08: reading the full story should not take the page away.
  const about = bodyOf('about');
  const story = about.all.find((n) => n.attrs.href === '/about');
  ok(`${label}: About opens the full page in a new tab`,
    story && story.attrs.target === '_blank' && (story.attrs.rel || '').includes('noopener'));

  // About is a short landing page now, in Adam's words. His copy, not mine:
  // if one of these fails it is because somebody rewrote him.
  const LEAD = [
    'Internet media is manipulating your young child.',
    'NotSus is a custom internet for your kids.',
    'It\u2019s designed as an infinite library, a school, and a workshop.'
  ];
  LEAD.forEach((line, i) =>
    ok(`${label}: About opens with line ${i + 1} of Adam's copy`, about.textContent.includes(line)));
  ok(`${label}: and the first line leads`,
    about.all.some((n) => n.classList.contains('ns-lead')));
  const aboutFolds = about.all.filter((n) => n.classList.contains('ns-fold'));
  ok(`${label}: with four headings under it`, aboutFolds.length === 4, `${aboutFolds.length}`);
  ['Why a browser?', 'Forcing action', 'Our values', 'Setup NotSus for your kids (1 minute)']
    .forEach((t) => ok(`${label}: "${t}" is one of them`, about.textContent.includes(t)));
  ['Our environments shape who we become.',
   'blank-canvas tools',
   'Encouraging endless exploration and a passion for discovery.',
   'Returning control to users to make healthy, value-driven choices.',
   'No email \u00b7 No credit card \u00b7 No data',
   'An investment in your kid\u2019s future.']
    .forEach((t) => ok(`${label}: About keeps "${t.slice(0, 38)}"`, about.textContent.includes(t)));
  ok(`${label}: the six values are all there`,
    about.all.filter((n) => n.classList.contains('ns-value')).length === 6);
  // Adam, 2026-11-08: the two ways in first, replaced by the devices.
  {
    const setup = about.all.filter((n) => n.classList.contains('ns-fold'))[3];
    const ways = setup.all.find((n) => n.classList.contains('ns-ways'));
    const picks = setup.all.find((n) => n.classList.contains('ns-picks'));
    ok(`${label}: Setup opens on the two ways in`, ways && ways.hidden !== true);
    ok(`${label}: and the devices wait`, picks && picks.hidden === true);
    const tiers = ways ? ways.children.filter((n) => n.classList.contains('ns-tier')) : [];
    ok(`${label}: both ways in are pressable`, tiers.length === 2 && tiers.every((t) => t.tagName === 'BUTTON'));
    if (tiers.length === 2) {
      (tiers[0].listeners.click || []).forEach((fn) => fn());
      ok(`${label}: picking one shows the devices`, picks.hidden === false);
      ok(`${label}: and takes the two ways away`, ways.hidden === true);
      ok(`${label}: it asks which device, as the card does`,
        picks.textContent.includes('Which device will your child use?'));
      const back = picks.all.find((n) => n.classList.contains('ns-back'));
      ok(`${label}: with a way back`, !!back);
      if (back) {
        (back.listeners.click || []).forEach((fn) => fn());
        ok(`${label}: which returns to the two ways in`, ways.hidden === false && picks.hidden === true);
        (tiers[1].listeners.click || []).forEach((fn) => fn());
        ok(`${label}: the other way in works the same`, picks.hidden === false);
      }
    }
    ok(`${label}: and Setup can actually set it up`,
      PLATFORMS.every((p) => about.hrefs().includes(p.platform === 'ipad' ? IPAD_MAILTO : '/download/' + p.platform)));
  }

  // Emphasis, and none of the marks that make it.
  ok(`${label}: About marks the phrases that should be read first`,
    about.all.some((n) => n.innerHTML.includes('ns-em')));
  ok(`${label}: and no asterisks reach the page`, !about.textContent.includes('**'));
  ok(`${label}: the second opening line stands apart from the third`,
    about.all.some((n) => n.classList.contains('ns-sub')));
  ok(`${label}: the way out says where it goes`,
    about.all.some((n) => n.textContent.includes('Open full about page')));
  ok(`${label}: Adam's typos are corrected and nothing else`,
    !about.textContent.includes('Out environments') && !about.textContent.includes('when you child'));

  // The download, in the widget, not a page away.
  const dl = bodyOf('download');
  ok(`${label}: Download lists every device here`,
    PLATFORMS.every((p) => dl.textContent.includes(p.label)));
  PLATFORMS.forEach((p) => {
    const want = p.platform === 'ipad' ? IPAD_MAILTO : '/download/' + p.platform;
    ok(`${label}: ${p.label}${p.note ? ' (' + p.note + ')' : ''} downloads from the widget`,
      dl.hrefs().includes(want), want);
  });
  ok(`${label}: and does not send anyone to the downloads page instead`,
    !dl.hrefs().includes('/downloads'));

  // Radio asks for the episodes rather than linking away for them.
  const radio = bodyOf('radio');
  const epFolds = radio.all.filter((n) => n.classList.contains('ns-fold'));
  ok(`${label}: Radio lists the episodes here`, epFolds.length === EPISODES.data.episodes.length,
    `${epFolds.length} listed`);
  EPISODES.data.episodes.forEach((e) => {
    ok(`${label}: "${e.title}" is in the widget`, radio.textContent.includes(e.title));
    ok(`${label}: with its notes behind the heading`, radio.textContent.includes(e.description));
  });
  ok(`${label}: and the date and length beside it`, radio.textContent.includes('01:05:36'));
  ok(`${label}: and there is no row sending anyone to the podcast page`,
    !radio.hrefs().includes('/podcast/'), 'Load more replaced it');
  ok(`${label}: nothing in Radio points at one of our own pages`,
    !radio.hrefs().some((h) => h.startsWith('/')));

  // Adam, 2026-11-08: "The goal is to be helpful, while always staying on
  // the same page." Everything a widget links to opens in a new tab, so the
  // page a visitor is using is still there when they come back. Downloads
  // are the exception: a download does not take the page away.
  for (const a of links) {
    const key = a.getAttribute('data-panel');
    const panel = bodyOf(key);
    const leaves = panel.all.filter((n) => n.attrs.href
      && !/^mailto:/.test(n.attrs.href)
      && !/^\/download\//.test(n.attrs.href)
      && n.attrs.target !== '_blank');
    ok(`${label}: nothing in ${key} takes the page away`, leaves.length === 0,
      leaves.map((n) => n.attrs.href).join(', '));
  }

  // Every address a widget offers, against something that answers it.
  //
  // check:routes covers the routes the server declares and this covers the
  // rest, because the blog links were neither: nine of them, all pointing at
  // a file whose name they had dropped the extension from, and nothing
  // noticed until somebody clicked one.
  {
    const ROUTES = ['/about', '/downloads', '/resources', '/privacy', '/terms',
      '/delete-account/', '/podcast/', '/blog/'];
    for (const a of links) {
      const key = a.getAttribute('data-panel');
      const panel = bodyOf(key);
      panel.hrefs()
        .filter((h) => h.startsWith('/'))
        .forEach((h) => {
          const clean = h.split('?')[0].split('#')[0];
          const known = ROUTES.includes(clean)
            || /^\/download\/[a-zA-Z]+$/.test(clean)
            || fs.existsSync(path.join(ROOT, clean.replace(/^\//, '')));
          ok(`${label}: ${key} offers ${h}, and something answers it`, known);
        });
    }
  }

  // It is about the product, not about a person.
  const everything = links.map((a) => { click(doc, a); return root.querySelectorAll('.ns-panel')[0].textContent; }).join(' ');
  ok(`${label}: the About item says About`,
    links.some((a) => a.textContent === 'About') && !links.some((a) => /Adam/.test(a.textContent)));
  ok(`${label}: and nothing in the footer is named after a person`,
    !/Adam/.test(everything) && !/Adam/.test(footer.textContent),
    'it is about NotSus');
}

// ------------------------------------------------------- loading, and CSS

// The widget is a plain browser script and lib/platforms.js is node's, so
// the list is copied. This is what stops the copy drifting.
{
  const m = /var PLATFORMS = (\[[\s\S]*?\n    \]);/.exec(dockJs);
  ok('the widget carries the device list', !!m);
  if (m) {
    // eslint-disable-next-line no-new-func
    const copy = new Function('return ' + m[1])();
    ok('and it is the list lib/platforms.js keeps',
      JSON.stringify(copy) === JSON.stringify(PLATFORMS),
      'they have drifted; copy lib/platforms.js into scripts/footer-dock.js');
  }
  const mail = /var IPAD_MAILTO = '([^']*)'/.exec(dockJs);
  ok('and the same address for the iPad', mail && mail[1] === IPAD_MAILTO);
}

// The legal documents it reads are the ones that exist.
for (const f of ['docs/PrivacyPolicy.html', 'docs/TandC.html']) {
  ok(`Legal reads ${f}, which is there`, fs.existsSync(path.join(ROOT, f)));
  ok(`and the widget asks for it by that name`, dockJs.includes('/' + f));
}
for (const cls of ['privacy-content', 'terms-content']) {
  const file = cls === 'privacy-content' ? 'docs/PrivacyPolicy.html' : 'docs/TandC.html';
  ok(`.${cls} is in ${file}`,
    fs.readFileSync(path.join(ROOT, file), 'utf8').includes(`class="${cls}"`));
  ok(`and the widget looks for it`, dockJs.includes(`.${cls}`));
}

// One footer means every page, including the two that are not files in a
// folder: /downloads is rendered by server.js and /delete-account was simply
// missed. Both are reachable from the widget, so both had to have it.
{
  const glob = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => path.join(dir, e.name));
  const pages = ['.', 'blog', 'podcast', 'docs', 'delete-account', 'android']
    .filter((d) => fs.existsSync(path.join(ROOT, d)))
    .reduce((a, d) => a.concat(glob(d)), [])
    // Not the admin screens, not the generated home page, which loads the
    // widget directly, and not the files kept as references.
    .filter((f) => !/admin|home\/|index4|template|fresh_clone|node_modules/.test(f));
  for (const f of pages) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    ok(`${f} carries the shared footer`, src.includes('/scripts/site-chrome.js'));
  }
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const dl = /function downloadsPage\([\s\S]*?\n\}/.exec(server);
  ok('/downloads carries it too', dl && dl[0].includes('/scripts/site-chrome.js'),
    'it is rendered by server.js, so it is easy to forget');
}

ok('site-chrome loads it', /footer-dock\.js/.test(chrome));
ok('and only once', /document\.querySelector\('script\[data-ns-dock\]'\)/.test(chrome));
ok('the written footer link says About', /label: 'About'/.test(chrome));
ok('and not Adam', !/label: 'Adam'/.test(chrome));

ok('the home page loads the stylesheet', /footer-dock\.css\?v=[a-f0-9]{6,}" data-ns-dock/.test(home));
ok('the home page loads the script', /footer-dock\.js\?v=[a-f0-9]{6,}" defer data-ns-dock/.test(home));
ok('both carry a hash of their contents', /footer-dock\.(css|js)\?v=/.test(home),
  'server.js caches a plain name for a year');
ok('the written footer is still in the page', /<footer class="site-footer">/.test(home));
// Baked in, so the Blog widget needs no request and works in a copy of the
// page with no server behind it.
ok('the home page carries the blog list', /<script id="ns-articles" type="application\/json">\[/.test(home));
{
  const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'blog', 'articles.json'), 'utf8'));
  const m = /<script id="ns-articles" type="application\/json">(.*?)<\/script>/.exec(home);
  const baked = m ? JSON.parse(m[1]) : [];
  ok('and it is the list the blog index is built from',
    baked.length === posts.length && baked.every((b, i) => b.slug === posts[i].slug && b.title === posts[i].title));
  ok('and every post it names is a file that exists',
    baked.every((b) => fs.existsSync(path.join(ROOT, 'blog', b.slug + '.html'))),
    baked.filter((b) => !fs.existsSync(path.join(ROOT, 'blog', b.slug + '.html'))).map((b) => b.slug).join(', '));
}

// The stacking bug, in the stylesheet this time.
ok('the scrim has no z-index of its own', !/\.ns-scrim\s*\{[^}]*z-index/.test(dockCss),
  'DOM order inside the root decides it, and a z-index here would reopen the bug');
ok('the widget hides the page\'s footer', /html\.ns-docked body > footer:not\(\.ns-footer\)/.test(dockCss));
ok('but not its own', /:not\(\.ns-footer\)/.test(dockCss));
ok('no scrim on a wide screen', /@media \(min-width: 761px\)[\s\S]*?\.ns-scrim \{ display: none/.test(dockCss));

// It lines up with the card above it.
ok('a widget is the card\'s width', /--d-w:\s*348px/.test(dockCss));
ok('in the card\'s column', /--d-gap:\s*1\.25rem/.test(dockCss));
ok('with the card\'s corner', /\.ns-panel\s*\{[\s\S]*?border-radius:\s*18px/.test(dockCss));
ok('the card\'s shadow', /\.ns-panel\s*\{[\s\S]*?box-shadow:\s*0 18px 50px rgba\(0, 0, 0, 0\.6\)/.test(dockCss));
ok('and the card\'s half second', /\.ns-panel\s*\{[\s\S]*?500ms cubic-bezier\(0\.16, 1, 0\.3, 1\)/.test(dockCss));
ok('it arrives from below', /\.ns-panel\s*\{[\s\S]*?transform:\s*translateY\(16px\)/.test(dockCss));

ok('a long widget scrolls', /\.ns-panel-body\s*\{[\s\S]*?overflow-y:\s*auto/.test(dockCss));
ok('and is allowed to shrink so it can', /\.ns-panel-body\s*\{[\s\S]*?min-height:\s*0/.test(dockCss));
ok('stopping short of the screen', /max-height:\s*min\(68svh, 560px\)/.test(dockCss),
  'svh, because vh on a phone is taller than the screen');

ok('on a phone it clears the download bar', /bottom:\s*calc\(var\(--d-cta-h\) \+ var\(--d-gap\)\)/.test(dockCss));
ok('and that bar\'s height is measured, not guessed',
  /--d-cta-h/.test(dockJs) && /getBoundingClientRect/.test(dockJs));

ok('nothing is clickable where nothing is open', /\.ns-dock-root\s*\{[\s\S]*?pointer-events:\s*none/.test(dockCss));
ok('the widget itself is', /\.ns-panel\s*\{[\s\S]*?pointer-events:\s*auto/.test(dockCss));
ok('and so is the scrim', /\.ns-scrim\s*\{[\s\S]*?pointer-events:\s*auto/.test(dockCss));

// styles.css carries bare element rules (h2 is centred, p has a bottom
// margin) and this file lands on the pages that load it. Without the reset
// the same widget looked different on /about than on the home page, which is
// the complaint the whole file exists to answer.
ok('the page\'s own element styles are reset first',
  /\.ns-dock-root :where\(h1, h2, h3, p/.test(dockCss));
ok('and the reset weighs nothing, so the rules below it win',
  /:where\([^)]*\)[\s\S]{0,400}?text-align: inherit/.test(dockCss));
ok('it comes before anything it could undo',
  dockCss.indexOf(':where(h1, h2, h3') < dockCss.indexOf('.ns-footer-links a {')
  && dockCss.indexOf(':where(h1, h2, h3') < dockCss.indexOf('.ns-panel {'));
ok('the reset leaves image sizes alone',
  !/:where\([^)]*\)[\s\S]{0,500}?\n  width: auto;/.test(dockCss),
  'CSS beats an <img> width attribute, and the logo rendered at its file size');
ok('and the footer logo is sized in the stylesheet',
  /\.ns-footer-top img \{[^}]*width: 40px; height: 40px/.test(dockCss));
ok('the widget reads left to right wherever it lands',
  /\.ns-panel \{\n  text-align: left;/.test(dockCss));

ok('it brings its own colours', /\.ns-dock-root,\s*\n\.ns-footer\s*\{[\s\S]*?--d-ground:/.test(dockCss));
ok('and never reads the page\'s', !/var\(--(ground|surface|primary|cream|text|border)\b/.test(dockCss),
  'home.css and styles.css carry different values under those names');
// Adam, 2026-11-08: two fixed things share the bottom of a small screen.
{
  const phone = /@media \(max-width: 760px\) \{([\s\S]*?)\n\}/.exec(dockCss);
  ok('there is a phone block', !!phone);
  const p = phone ? phone[1] : '';
  ok('the widget is tighter on a phone', /\.ns-panel-body \{ padding: 0 0\.75rem/.test(p));
  ok('its rows are shorter', /\.ns-row \{ min-height: 36px/.test(p));
  ok('its heading is smaller', /\.ns-panel-title \{ font-size: 0\.88rem/.test(p));
  ok('and the footer gives the page its space back', /\.ns-footer \{ padding: 1\.4rem/.test(p));
}

ok('it holds still when asked to', /prefers-reduced-motion[\s\S]*?\.ns-panel, \.ns-scrim \{ transition: none/.test(dockCss));
ok('it remembers nothing about anyone',
  !/localStorage|sessionStorage|document\.cookie|indexedDB/.test(dockJs.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')));

console.log(`\n  ${passed} checks pass${failed ? `, ${failed} FAIL` : ''}`);
process.exit(failed ? 1 : 0);
