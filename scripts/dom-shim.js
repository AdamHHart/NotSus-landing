// scripts/dom-shim.js
//
// A DOM small enough to live in one file, for running the site's browser
// scripts under node and reading back the tree they build.
//
// There is no browser in this sandbox and no port to open one against, so
// this is how scripts/check-dock.js and scripts/check-cta.js exercise code
// that otherwise only ever runs in a visitor's browser. It is deliberately
// thin: it answers the calls those scripts actually make and nothing else,
// so a call it has not been taught about fails loudly rather than quietly
// returning undefined.

class ClassList {
  constructor(node) { this.node = node; this.s = new Set(); }
  add(...c) { c.forEach((x) => this.s.add(x)); }
  remove(...c) { c.forEach((x) => this.s.delete(x)); }
  toggle(c, on) { if (on === undefined) on = !this.s.has(c); on ? this.s.add(c) : this.s.delete(c); return on; }
  contains(c) { return this.s.has(c); }
  toString() { return [...this.s].join(' '); }
}

class Node {
  constructor(tag) {
    this.tagName = (tag || '').toUpperCase();
    this.children = []; this.attrs = {}; this.dataset = {};
    this.classList = new ClassList(this);
    this.style = { setProperty: (k, v) => { this.attrs['style:' + k] = v; } };
    this.listeners = {}; this._html = ''; this._text = ''; this.hidden = false;
    this.value = ''; this.scrollTop = 0;
  }
  set id(v) { this.attrs.id = String(v); }         get id() { return this.attrs.id; }
  set href(v) { this.attrs.href = String(v); }     get href() { return this.attrs.href; }
  set target(v) { this.attrs.target = String(v); } get target() { return this.attrs.target; }
  set rel(v) { this.attrs.rel = String(v); }       get rel() { return this.attrs.rel; }
  set type(v) { this.attrs.type = String(v); }     get type() { return this.attrs.type; }
  set className(v) {
    this._cls = String(v);
    this.classList = new ClassList(this);
    String(v).split(/\s+/).filter(Boolean).forEach((c) => this.classList.add(c));
  }
  get className() { return this._cls || ''; }
  set innerHTML(v) { this._html = String(v); this.children = []; }
  get innerHTML() { return this._html; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() {
    const own = this._text || this._html.replace(/<[^>]*>/g, '');
    return own + this.children.map((c) => c.textContent).join(' ');
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  hasAttribute(k) { return k in this.attrs; }
  appendChild(n) { this.children.push(n); n.parentNode = this; return n; }
  removeChild(n) { this.children = this.children.filter((c) => c !== n); return n; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn); }
  dispatch(t, e) { (this.listeners[t] || []).forEach((fn) => fn(e || { target: this, preventDefault() {} })); }
  focus() {} blur() {}
  getBoundingClientRect() { return { top: 0, left: 0, width: 348, height: 120 }; }
  scrollIntoView() {}

  get all() { return this.children.reduce((a, c) => a.concat([c], c.all), []); }

  matches(sel) {
    return sel.split(',').map((s) => s.trim()).some((one) => {
      // tag, .class, [attr], and :not(...) of those, in any combination.
      const not = [];
      one = one.replace(/:not\(([^)]*)\)/g, (_, inner) => { not.push(inner); return ''; });
      if (not.some((n) => this.matches(n))) return false;
      const parts = one.match(/\.[\w-]+|\[[\w-]+\]|^[\w-]+/g) || [];
      if (!parts.length) return true;
      return parts.every((p) => {
        if (p.startsWith('.')) return this.classList.contains(p.slice(1));
        if (p.startsWith('[')) return p.slice(1, -1) in this.attrs || (p.slice(1, -1) === 'hidden' && this.hidden);
        return this.tagName === p.toUpperCase();
      });
    });
  }
  closest(sel) {
    let n = this;
    while (n) { if (n.matches && n.matches(sel)) return n; n = n.parentNode; }
    return null;
  }
  querySelectorAll(sel) {
    // A descendant combinator, one level deep, is all any of these need.
    const steps = sel.split(/\s+/).filter(Boolean);
    let pool = this.all;
    if (steps.length > 1) {
      const scopes = this.all.filter((n) => n.matches(steps[0]));
      pool = scopes.reduce((a, s) => a.concat(s.all), []);
      return pool.filter((n) => n.matches(steps.slice(1).join(' ')));
    }
    return pool.filter((n) => n.matches(sel));
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  hrefs() {
    const out = this.all.filter((n) => n.attrs.href).map((n) => n.attrs.href);
    (this.all.map((n) => n._html).join(' ').match(/href="([^"]+)"/g) || []).forEach((m) => out.push(m.slice(6, -1)));
    return out;
  }
}

function makeDocument() {
  const doc = new Node('#document');
  doc.head = doc.appendChild(new Node('head'));
  doc.body = doc.appendChild(new Node('body'));
  doc.documentElement = new Node('html');
  doc.readyState = 'complete';
  doc.activeElement = null;
  doc.createElement = (t) => new Node(t);
  doc.getElementById = (id) => doc.all.find((n) => n.attrs.id === id) || null;
  doc.querySelectorAll = (sel) => doc.body.querySelectorAll(sel);
  doc.querySelector = (sel) => doc.body.querySelector(sel);
  doc.listeners = {};
  doc.addEventListener = Node.prototype.addEventListener.bind(doc);
  doc.dispatch = Node.prototype.dispatch.bind(doc);
  return doc;
}

/** A window with the handful of things the site's scripts reach for. */
function makeWindow(doc, extra) {
  const timers = [];
  const frames = [];
  const win = Object.assign({
    document: doc,
    scrollY: 0,
    scrollTo() {},
    addEventListener() {},
    removeEventListener() {},
    setTimeout(fn) { timers.push(fn); return timers.length; },
    clearTimeout() {},
    requestAnimationFrame(fn) { frames.push(fn); return frames.length; },
    ResizeObserver: null,
    MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {}; },
    fetch: null,
    turnstile: undefined,
    /** Run everything the script asked to be run later. */
    flush() {
      while (timers.length) timers.shift()();
      let n = 0;
      while (frames.length && n++ < 50) frames.shift()();
    },
  }, extra || {});
  return win;
}

/**
 * Run a browser script against a document.
 *
 * The globals it is given are the only ones it has. Reading a name that was
 * never declared throws here rather than silently reaching for the real
 * node global, which is how `ctaDevices` stayed undeclared in home.js long
 * enough to break every download on the home page.
 */
function runScript(src, doc, extra) {
  const win = makeWindow(doc, extra);
  const fn = new Function(
    'window', 'document', 'setTimeout', 'clearTimeout', 'requestAnimationFrame',
    'MutationObserver', 'ResizeObserver', 'fetch', 'console', 'JSON', 'Array',
    'Object', 'String', 'Number', 'Math', 'Date', 'RegExp', 'parseInt', 'parseFloat',
    'encodeURIComponent', 'decodeURIComponent', 'isNaN', 'Boolean', 'Error', 'Promise',
    '"use strict";\n' + src
  );
  fn(win, doc, win.setTimeout, win.clearTimeout, win.requestAnimationFrame,
     win.MutationObserver, win.ResizeObserver, win.fetch, console, JSON, Array,
     Object, String, Number, Math, Date, RegExp, parseInt, parseFloat,
     encodeURIComponent, decodeURIComponent, isNaN, Boolean, Error, Promise);
  return win;
}

/**
 * Build a tree out of a slice of real HTML.
 *
 * Only tags, classes, ids, href, hidden and data- attributes, which is what
 * the checks look at. Text is kept as the node's own text.
 */
function parse(html) {
  const root = new Node('div');
  let node = root;
  const re = /<(\/)?([a-zA-Z][\w-]*)((?:\s+[^<>]*?)?)(\/)?>|([^<]+)/g;
  const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'path', 'rect', 'circle']);
  let m;
  while ((m = re.exec(html))) {
    const [, close, tag, attrText, selfClose, text] = m;
    if (text) { node._text = (node._text || '') + text; continue; }
    const name = tag.toLowerCase();
    if (close) { if (node.parentNode) node = node.parentNode; continue; }
    const el = new Node(name);
    (attrText || '').replace(/([\w-]+)(?:="([^"]*)")?/g, (_, k, v) => {
      if (!k) return '';
      if (k === 'class') el.className = v || '';
      else if (k === 'hidden') el.hidden = true;
      else el.attrs[k] = v === undefined ? '' : v;
      return '';
    });
    node.appendChild(el);
    if (!selfClose && !VOID.has(name)) node = el;
  }
  return root;
}

module.exports = { Node, ClassList, makeDocument, makeWindow, runScript, parse };
