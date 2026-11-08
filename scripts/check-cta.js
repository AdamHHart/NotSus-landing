#!/usr/bin/env node
// scripts/check-cta.js
//
// The download card on the home page, clicked all the way through.
//
// This exists because the card quietly stopped working. `ctaDevices` and
// `ctaBack` were used in home/home.js and never declared: `if (ctaBack)`
// threw at load so nothing after it ran, and clicking a tier hid the tier
// list and then threw before it could show the devices, leaving the card as
// a heading and nothing else. It is the only route to a download on that
// page, and nothing noticed. Every check below is a step a parent takes.
//
// Run: npm run check:cta

const fs = require('fs');
const path = require('path');
const { makeDocument, runScript, parse } = require('./dom-shim');

const ROOT = path.join(__dirname, '..');
const { PLATFORMS } = require('../lib/platforms');

let failed = 0, passed = 0;
const ok = (name, cond, detail) => {
  if (cond) { passed++; return; }
  failed++;
  console.error(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`);
};

const html = fs.readFileSync(path.join(ROOT, 'home', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'home', 'home.js'), 'utf8');

console.log('The download card, clicked through');

// The page, as far as the card is concerned: the header and the data the
// script reads out of the document.
const doc = makeDocument();
const header = /<header class="site-header">[\s\S]*?<\/header>/.exec(html)[0];
parse(header).children.forEach((n) => doc.body.appendChild(n));
const missData = /<script id="miss-data"[^>]*>([\s\S]*?)<\/script>/.exec(html);
const miss = parse(`<script id="miss-data" type="application/json"></script>`).children[0];
miss.textContent = missData ? missData[1] : '{}';
doc.body.appendChild(miss);
['q', 'cat', 'age', 'clear', 'result-count', 'miss', 'picks'].forEach((id) => {
  const n = parse(`<div id="${id}"></div>`).children[0];
  doc.body.appendChild(n);
});

let win;
let threw = null;
try { win = runScript(js, doc); } catch (err) { threw = err; }
ok('home.js runs without throwing', !threw, threw && threw.message);
if (threw) { console.error(`\n  ${passed} checks pass, ${failed} FAIL`); process.exit(1); }

const $ = (id) => doc.getElementById(id);
const cta = $('cta'), go = $('cta-open'), more = $('cta-more'), devices = $('cta-devices'), back = $('cta-back');

ok('the card is in the page', !!cta);
ok('it has its one button', !!go);
ok('it has the two options', !!more);
ok('it has the device list', !!devices, 'this is the one that went missing');
ok('it has a way back', !!back);

ok('the card starts hidden', cta.hidden === true);
win.flush();
ok('and is handed over half a second later', cta.hidden === false);
ok('arriving rather than appearing', cta.classList.contains('is-in'));

// Step one: the button.
ok('before the first click, the button is the card',
  go.hidden === false && more.hidden === true && devices.hidden === true);
go.dispatch('click');
ok('clicking it shows the two options', more.hidden === false);
ok('and the button steps aside', go.hidden === true);
ok('and the card says it is open', cta.classList.contains('is-open'),
  'the stylesheet lays the shut card out as one line on a phone');
ok('and says so to a screen reader', go.getAttribute('aria-expanded') === 'true');

// Step two: either option.
const tiers = doc.querySelectorAll('[data-to-devices]');
ok('both options lead on', tiers.length === 2);
tiers[0].dispatch('click');
ok('picking one shows the devices', devices.hidden === false,
  'this is the step that threw, leaving the card empty');
ok('and takes the options away', more.hidden === true);
ok('the card is never left with nothing in it',
  [go, more, devices].some((n) => n.hidden === false));

// Every device, with somewhere to go.
const rows = doc.querySelectorAll('.cta-device');
ok(`all ${PLATFORMS.length} devices are offered`, rows.length === PLATFORMS.length,
  `${rows.length} offered`);
PLATFORMS.forEach((p) => {
  const row = rows.find((r) => r.textContent.includes(p.label) &&
    (!p.note || r.textContent.includes(p.note)));
  ok(`${p.label}${p.note ? ' (' + p.note + ')' : ''} is there`, !!row);
  if (!row) return;
  const href = row.getAttribute('href');
  ok(`${p.label}${p.note ? ' (' + p.note + ')' : ''} goes somewhere`,
    href === `/download/${p.platform}` || /^mailto:/.test(href), href);
});

// Step three: back.
back.dispatch('click');
ok('Back returns to the two options', more.hidden === false && devices.hidden === true);
ok('and the card stays open', cta.classList.contains('is-open'));

// The second option behaves like the first.
tiers[1].dispatch('click');
ok('the other option reaches the devices too', devices.hidden === false);

// The card does not disappear, and writes nothing to the browser.
const code = js.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
ok('the card cannot be dismissed', !/dismiss/i.test(code));
ok('and remembers nothing about anyone',
  !/localStorage|sessionStorage|document\.cookie|indexedDB/.test(code));

// Nothing is used before it is declared. The strict-mode run above is what
// enforces it; this is the note for whoever reads the failure.
ok('every name the card uses is declared',
  /var ctaDevices = document\.getElementById\('cta-devices'\)/.test(js)
  && /var ctaBack = document\.getElementById\('cta-back'\)/.test(js));

console.log(`\n  ${passed} checks pass${failed ? `, ${failed} FAIL` : ''}`);
process.exit(failed ? 1 : 0);
