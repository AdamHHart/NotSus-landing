/**
 * One-off helper: merge downloaded *.production files into live blog HTML with updated nav.
 */
const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, '..', 'blog');

const STANDARD_NAV = `        <nav class="mobile-nav" id="mobileNav">
            <a href="/#waitlist-section" class="nav-link">Download Browser</a>
            <a href="/#demo-gif" class="nav-link">About</a>
            <a href="/tools/" class="nav-link">Tools for Kids</a>
            <a href="/podcast/" class="nav-link">Radio</a>
            <a href="/#resources-section" class="nav-link">Resources</a>
            <a href="/#contact-section" class="nav-link">Contact Us</a>
        </nav>`;

const FOOTER_LINKS_FIX = [
    [/href="#how-it-works"/g, 'href="/#how-it-works"'],
    [/href="#resources-section"/g, 'href="/#resources-section"'],
    [/© 2025 NotSus\.net/g, '© 2025-2026 NotSus.net']
];

const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.production'));

files.forEach((prodFile) => {
    const outName = prodFile.replace('.production', '');
    let html = fs.readFileSync(path.join(blogDir, prodFile), 'utf8');

    html = html.replace(/<nav class="mobile-nav"[\s\S]*?<\/nav>/, STANDARD_NAV);
    FOOTER_LINKS_FIX.forEach(([re, rep]) => { html = html.replace(re, rep); });

    html = html.replace(
        /<script src="\/scripts\.js"><\/script>/,
        '<script src="/scripts/site-chrome.js"></script>\n    <script src="/scripts.js"></script>'
    );
    if (!html.includes('site-chrome.js')) {
        html = html.replace(
            '</body>',
            '    <script src="/scripts/site-chrome.js"></script>\n    <script src="/scripts.js"></script>\n</body>'
        );
    }

    const backLink = '<p style="margin-top:2rem;"><a href="/blog/" style="color:var(--secondary-accent);font-weight:600;">← Back to Blog</a></p>';
    if (!html.includes('Back to Blog')) {
        html = html.replace(
            /(<section class="problem-solution"[\s\S]*?<div class="container">)/,
            `$1\n\t\t${backLink}`
        );
    }

    fs.writeFileSync(path.join(blogDir, outName), html);
    console.log('Wrote', outName);
});
