#!/usr/bin/env node
// scripts/check-about.js
//
// The about page, checked the way check-home.js checks the home page.
//
// It is the old home page and it carried the old funnel with it: an email
// form, a Free Trial, links to anchors that stopped existing when '/' became
// the new page. This is what keeps those from creeping back, and what holds
// the page to the same colours and shapes as the home page, so the two read
// as one product rather than two.
//
// Run: npm run check:about

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let failures = 0;
function check(name, ok, detail) {
    if (ok) {
        console.log(`  ok    ${name}`);
    } else {
        failures++;
        console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`);
    }
}

// The markup, not the stylesheet above it.
const heroMarkup = h.slice(h.indexOf('<section class="about-hero">'), h.indexOf('<section class="about-show"'));

console.log('\nThe first screen');
check('holds the copy and the two tiers, and nothing else',
    // The links themselves, not every span inside them whose class also
    // starts with hero-tier.
    heroMarkup.length > 0 && (heroMarkup.match(/<a class="hero-tier/g) || []).length === 2);
// Adam's words, 2026-11-07. His to change, not mine to improve.
check("Adam's three lines, as written",
    h.includes('Internet media is manipulating your young child.')
    && h.includes('NotSus is a custom internet for your kids.')
    && h.includes('It&rsquo;s designed as an infinite library, a school, and a workshop.'));
// styles.css makes the header position: fixed, so it takes no room in the
// flow. The section needs the whole screen and clears the header with
// padding; subtracting it from the height left a gap the size of the header
// at the bottom, which is where the video kept showing through.
check('it is the whole screen, with the fixed header cleared by padding',
    /\.about-hero \{[\s\S]*?min-height: 100svh;[\s\S]*?padding: calc\(var\(--ns-header/.test(h)
    && !/min-height: calc\(100svh - var\(--ns-header/.test(h));
check('the header height is measured, not guessed',
    /setProperty\('--ns-header', header\.offsetHeight/.test(h)
    && /ResizeObserver/.test(h));
check('and it is remeasured when the fonts land', /document\.fonts\.ready\.then\(set\)/.test(h));
check('the free one is the obvious first click',
    /class="hero-tier hero-tier-primary"/.test(h));

console.log('\nThe second screen');
check('the video and the gif are one grid, side by side only where there is width',
    /\.about-show-inner \{[\s\S]*?grid-template-columns: 1fr;/.test(h)
    && /@media \(min-width: 900px\) \{ \.about-show-inner \{ grid-template-columns: 1fr 1fr; \} \}/.test(h));
check('both hold the same shape whatever they contain', /aspect-ratio: 16 \/ 9/.test(h));
check('the gif is cropped from the bottom, so its toolbar survives',
    /\.about-show-frame img \{ object-position: top center; \}/.test(h));
check('the founder video appears once, not twice', (h.match(/youtube\.com\/embed/g) || []).length === 1);

console.log('\nThe old funnel is gone');
check('no email form', !/type="email"/.test(h) && !/feedbackForm/.test(h));
check('no Free Trial', !/Free Trial/i.test(h));
check('nothing points at an anchor on a page that moved', !/href="\/#/.test(h));
check('nothing points at the removed tools page', !/\/tools/.test(h));

console.log('\nIt matches the home page');
check('the header is a capsule, not a full-width green band',
    /body > header \.header-left \{[\s\S]*?border-radius: 999px;/.test(h));
check('it uses the home page colours',
    /--ns-cream: #fff3b1/.test(h) && /--ns-ground: #1a1a1a/.test(h));
const MENU_ORDER = ['Download Browser', 'Contact Us', 'Resources', 'Radio', 'Blog'];
const menuLabels = (h.match(/class="nav-link">([^<]+)</g) || []).map((m) => m.slice(17, -1));
check(`the menu reads ${MENU_ORDER.join(', ')}, and nothing else`,
    menuLabels.join('|') === MENU_ORDER.join('|'),
    `it reads ${menuLabels.join(', ')}`);
check('Download in the menu goes to the downloads page',
    h.includes('<a href="/downloads" class="nav-link">Download Browser</a>'));
check('nothing in the menu is About or Tools',
    !/class="nav-link">(About|Tools for Kids)</.test(h));

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
