#!/usr/bin/env node
// scripts/check-dock.js
//
// The footer widget, run against a DOM small enough to live in this file.
//
// There is no browser in this sandbox and no port to open one against, so the
// script is executed here and the tree it builds is read back. This catches
// what matters: that the panel is built, that it closes, that every link goes
// somewhere real, and that the one footer is the same footer whichever page
// loads it.
//
// Run: npm run check:dock

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

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
}
class Node {
  constructor(tag) {
    this.tagName = (tag || '').toUpperCase();
    this.children = []; this.attrs = {}; this.classList = new ClassList();
    this.style = { setProperty: (k, v) => { this.attrs['style:' + k] = v; } };
    this.listeners = {}; this._html = ''; this._text = ''; this.hidden = false;
  }
  set id(v) { this.attrs.id = String(v); }
  get id() { return this.attrs.id; }
  // href, target and rel are set as properties by the script and read as
  // attributes by the checks, the way a real element treats them.
  set href(v) { this.attrs.href = String(v); }
  get href() { return this.attrs.href; }
  set target(v) { this.attrs.target = String(v); }
  get target() { return this.attrs.target; }
  set rel(v) { this.attrs.rel = String(v); }
  get rel() { return this.attrs.rel; }
  set className(v) { this._cls = v; String(v).split(/\s+/).filter(Boolean).forEach((c) => this.classList.add(c)); }
  get className() { return this._cls || ''; }
  set innerHTML(v) { this._html = String(v); }
  get innerHTML() { return this._html; }
  set textContent(v) { this._text = String(v); }
  get textContent() {
    const own = this._text || this._html.replace(/<[^>]*>/g, '');
    return own + this.children.map((c) => c.textContent).join(' ');
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  appendChild(n) { this.children.push(n); n.parentNode = this; return n; }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  focus() {}
  getBoundingClientRect() { return { height: 120 }; }
  get all() { return this.children.reduce((a, c) => a.concat([c], c.all), []); }
  find(pred) { return this.all.find(pred); }
  findAll(pred) { return this.all.filter(pred); }
  // Every href in the subtree, from real nodes and from innerHTML alike.
  hrefs() {
    const out = this.all.filter((n) => n.attrs.href).map((n) => n.attrs.href);
    const raw = this.all.map((n) => n._html).join(' ');
    (raw.match(/href="([^"]+)"/g) || []).forEach((m) => out.push(m.slice(6, -1)));
    return out;
  }
}

function makeDocument(withCard) {
  const doc = new Node('#document');
  doc.head = doc.appendChild(new Node('head'));
  doc.body = doc.appendChild(new Node('body'));
  doc.documentElement = new Node('html');
  doc.readyState = 'complete';
  const byId = {};
  if (withCard) {
    const cta = new Node('div');
    cta.attrs.id = 'cta';
    byId.cta = cta;
    doc.body.appendChild(cta);
  }
  doc.createElement = (t) => new Node(t);
  doc.getElementById = (id) => byId[id] || doc.body.find((n) => n.attrs.id === id) || null;
  doc.querySelector = (sel) => {
    if (sel.startsWith('link[')) return doc.head.find((n) => n.tagName === 'LINK' && 'data-ns-dock' in n.attrs) || null;
    if (sel.startsWith('script[')) return doc.head.find((n) => n.tagName === 'SCRIPT' && 'data-ns-dock' in n.attrs) || null;
    return null;
  };
  doc.addEventListener = Node.prototype.addEventListener.bind(doc);
  doc.listeners = {};
  return doc;
}

function run(src, withCard) {
  const document = makeDocument(withCard);
  const sandbox = {
    document,
    window: { addEventListener() {}, ResizeObserver: null },
    requestAnimationFrame: (fn) => fn(),
    MutationObserver: function () { this.observe = () => {}; },
    ResizeObserver: undefined,
  };
  new Function('document', 'window', 'requestAnimationFrame', 'MutationObserver', src)(
    sandbox.document, sandbox.window, sandbox.requestAnimationFrame, sandbox.MutationObserver
  );
  return document;
}

// ---------------------------------------------------------------- checks

const dockJs = fs.readFileSync(path.join(ROOT, 'scripts', 'footer-dock.js'), 'utf8');
const dockCss = fs.readFileSync(path.join(ROOT, 'home', 'footer-dock.css'), 'utf8');
const chrome = fs.readFileSync(path.join(ROOT, 'scripts', 'site-chrome.js'), 'utf8');
const home = fs.readFileSync(path.join(ROOT, 'home', 'index.html'), 'utf8');

console.log('The footer widget');

// It builds, on a page with the download card and on one without.
const withCard = run(dockJs, true);
const noCard = run(dockJs, false);

for (const [label, doc] of [['home page', withCard], ['every other page', noCard]]) {
  const root = doc.body.find((n) => n.attrs.id === 'ns-dock');
  ok(`${label}: the dock is built`, !!root);
  if (!root) continue;

  const trigger = root.find((n) => n.attrs.id === 'ns-dock-open');
  const panel = root.find((n) => n.attrs.id === 'ns-dock-panel');
  const close = root.find((n) => n.attrs.id === 'ns-dock-close');

  ok(`${label}: there is a trigger`, !!trigger);
  ok(`${label}: there is a panel`, !!panel);
  ok(`${label}: the panel has an X`, !!close && close.innerHTML.includes('&times;'));
  ok(`${label}: the X says what it does`, close && close.getAttribute('aria-label') === 'Close');
  ok(`${label}: the panel starts shut`, panel && panel.hidden === true);
  ok(`${label}: the trigger says so`, trigger && trigger.getAttribute('aria-expanded') === 'false');
  ok(`${label}: the trigger names the panel`, trigger && trigger.getAttribute('aria-controls') === 'ns-dock-panel');
  ok(`${label}: the old footer is stood down`, doc.documentElement.classList.contains('ns-docked'));

  // It opens and shuts.
  const open = (trigger.listeners.click || [])[0];
  const shut = (close.listeners.click || [])[0];
  ok(`${label}: the trigger opens it`, typeof open === 'function');
  ok(`${label}: the X closes it`, typeof shut === 'function');
  if (open && shut) {
    open();
    ok(`${label}: open means open`, panel.hidden === false && trigger.hidden === true);
    ok(`${label}: and it slides in`, panel.classList.contains('is-in'));
    shut();
    ok(`${label}: shut means shut`, panel.hidden === true && trigger.hidden === false);
    ok(`${label}: and the trigger comes back`, trigger.getAttribute('aria-expanded') === 'false');
  }
  ok(`${label}: Escape closes it too`, (doc.listeners.keydown || []).length > 0);

  // Every link a visitor can reach from it.
  const hrefs = panel.hrefs();
  const must = ['mailto:contact@notsus.net', '/about', '/blog/', '/podcast/',
    '/privacy', '/terms', '/delete-account',
    'https://download.notsus.net/Watchdog_installer.msi',
    'https://download.notsus.net/How_to_block_other_browsers.pdf',
    'https://www.linkedin.com/company/notsus', 'https://www.youtube.com/@NotSus_Edu',
    'https://www.instagram.com/notsus_edu/', 'https://www.tiktok.com/@notsus_edu',
    'https://x.com/NotSus_edu'];
  must.forEach((h) => ok(`${label}: it reaches ${h}`, hrefs.includes(h)));

  // Nothing points at a fragment on another page any more.
  ok(`${label}: no link into the middle of /about`,
    !hrefs.some((h) => h.includes('#contact-section')),
    'the address is a button in the panel now');

  // Every outside link opens in its own tab and cannot reach back.
  const out = panel.findAll((n) => n.attrs.href && /^https?:/.test(n.attrs.href));
  ok(`${label}: outside links open away from the page`, out.every((n) => n.attrs.target === '_blank'));
  ok(`${label}: and cannot reach back into it`, out.every((n) => (n.attrs.rel || '').includes('noopener')));

  // The address is in the panel, as the law wants it, and the home one is not.
  ok(`${label}: the registered address is the public one`,
    panel.textContent.includes('2015 Main Street, Vancouver, BC, Canada'));
  ok(`${label}: and the home address is nowhere near it`,
    !panel.textContent.includes('1624') && !/E Broadway/i.test(panel.textContent));
}

// The download is offered exactly once per page.
{
  const cardPanel = withCard.body.find((n) => n.attrs.id === 'ns-dock-panel');
  const barePanel = noCard.body.find((n) => n.attrs.id === 'ns-dock-panel');
  ok('home page: the panel does not repeat the download card',
    !cardPanel.hrefs().includes('/downloads'));
  ok('every other page: the panel carries the download',
    barePanel.hrefs().includes('/downloads'),
    'those pages have no card, so the footer is the only way to it');
}

// It is loaded from the one file every page already loads.
ok('site-chrome loads the widget', /footer-dock\.js/.test(chrome));
ok('and only once', /document\.querySelector\('script\[data-ns-dock\]'\)/.test(chrome));
ok('the About link says About', /label: 'About'/.test(chrome));
ok('and not Adam', !/label: 'Adam'/.test(chrome));

// The home page carries it directly, since it is generated and loads no chrome.
ok('the home page loads the widget stylesheet', /footer-dock\.css\?v=[a-f0-9]{6,}" data-ns-dock/.test(home));
ok('the home page loads the widget script', /footer-dock\.js\?v=[a-f0-9]{6,}" defer data-ns-dock/.test(home));
ok('both are asked for by a name that carries their hash',
  /footer-dock\.css\?v=/.test(home) && /footer-dock\.js\?v=/.test(home),
  'server.js caches a plain name for a year');

// The plain footer stays in the HTML for a crawler and for no JavaScript.
ok('the written footer is still in the page', /<footer class="site-footer">/.test(home));
ok('and the stylesheet is what hides it', /html\.ns-docked[\s\S]*?\.site-footer\s*\{\s*display:\s*none/.test(dockCss));

// It is the same object on every page, so it cannot read the page's tokens.
ok('the widget brings its own colours', /\.ns-dock-root\s*\{[\s\S]*?--d-ground:/.test(dockCss));
ok('and never reads the page\'s', !/var\(--(ground|surface|primary|cream|text|border)\b/.test(dockCss),
  'home.css and styles.css carry different values under those names');

// It lines up with the card above it.
ok('it is the card\'s width', /--d-w:\s*348px/.test(dockCss), 'the card is 348px');
ok('in the card\'s column', /--d-gap:\s*1\.25rem/.test(dockCss), 'the card sits 1.25rem from the right');
ok('with the card\'s corner', /\.ns-panel\s*\{[\s\S]*?border-radius:\s*18px/.test(dockCss));
ok('the card\'s edge', /\.ns-panel\s*\{[\s\S]*?border:\s*1px solid var\(--d-border\)/.test(dockCss));
ok('the card\'s shadow', /\.ns-panel\s*\{[\s\S]*?box-shadow:\s*0 18px 50px rgba\(0, 0, 0, 0\.6\)/.test(dockCss));
ok('and the card\'s half second', /\.ns-panel\s*\{[\s\S]*?500ms cubic-bezier\(0\.16, 1, 0\.3, 1\)/.test(dockCss));

// It slides up, where the card slides down.
ok('it arrives from below', /\.ns-panel\s*\{[\s\S]*?transform:\s*translateY\(16px\)/.test(dockCss));

// It scrolls rather than growing off the screen.
ok('a long panel scrolls', /\.ns-panel-body\s*\{[\s\S]*?overflow-y:\s*auto/.test(dockCss));
ok('and stops short of the screen', /max-height:\s*min\(68svh, 560px\)/.test(dockCss),
  'svh, because vh on a phone is taller than the screen');
ok('the head stays put while it scrolls', /\.ns-panel-head\s*\{[\s\S]*?flex:\s*0 0 auto/.test(dockCss));
ok('and the body is allowed to shrink so it can scroll',
  /\.ns-panel-body\s*\{[\s\S]*?min-height:\s*0/.test(dockCss),
  'without this a flex item grows past the panel instead of scrolling inside it');

// A phone.
ok('on a phone it is a sheet, not a corner', /@media \(max-width: 760px\)[\s\S]*?\.ns-panel\s*\{[\s\S]*?position:\s*fixed/.test(dockCss));
ok('with a scrim behind it', /@media \(max-width: 760px\)[\s\S]*?\.ns-scrim\s*\{[\s\S]*?background:\s*rgba\(0, 0, 0, 0\.6\)/.test(dockCss));
ok('and it clears the download bar', /bottom:\s*calc\(var\(--d-cta-h\) \+ var\(--d-gap\)\)/.test(dockCss));
ok('the bar\'s height is measured, not guessed', /--d-cta-h/.test(dockJs) && /getBoundingClientRect/.test(dockJs));
ok('the sheet sits above the bar', /@media \(max-width: 760px\)[\s\S]*?\.ns-panel\s*\{[\s\S]*?z-index:\s*90/.test(dockCss),
  'the bar is z-index 70');
ok('no scrim on a wide screen', /@media \(min-width: 761px\)[\s\S]*?\.ns-scrim\s*\{\s*display:\s*none/.test(dockCss));

// It does not sit on top of the page it is not using.
ok('the empty space between trigger and panel is not clickable', /\.ns-dock-root\s*\{[\s\S]*?pointer-events:\s*none/.test(dockCss));
ok('but the widget itself is', /\.ns-dock-trigger\s*\{\s*\n\s*pointer-events:\s*auto/.test(dockCss));

// Motion, for anyone who has asked for less of it.
ok('it holds still when asked to', /prefers-reduced-motion[\s\S]*?\.ns-panel, \.ns-scrim \{ transition: none/.test(dockCss));

// It writes nothing to the browser, like the card above it.
ok('it remembers nothing about anyone',
  !/localStorage|sessionStorage|document\.cookie|indexedDB/.test(dockJs.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')));

console.log(`\n  ${passed} checks pass${failed ? `, ${failed} FAIL` : ''}`);
process.exit(failed ? 1 : 0);
