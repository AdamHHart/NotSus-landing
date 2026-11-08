/**
 * The site footer, as a widget.
 *
 * Loaded by scripts/site-chrome.js, which every page on the site already
 * loads, so there is one footer and it is the same object on the home page,
 * on /about, on the blog and on the legal pages. Before this each of those
 * had its own, with different links in a different order, and moving between
 * them meant learning the footer again.
 *
 * Shut, it is one line in the bottom right corner, in the same column and at
 * the same width as the download card in the top right. Open, it is a panel
 * that slides up with everything in it: the way to reach a person, the pages
 * worth reading, the Windows add-on, the accounts, and the legal links. It
 * closes with the X, with Escape, and on a phone by tapping outside it.
 *
 * Nothing in here navigates away for something that is one line of text. The
 * contact address used to be a link to a section most of the way down
 * /about; it is a button in the panel now.
 *
 * The page's own <footer> is left in the HTML and hidden by the stylesheet.
 * A crawler still reads those links, and a visitor with no JavaScript gets
 * the plain footer and a page that works.
 */
(function initFooterDock() {
    'use strict';

    var CSS_HREF = '/home/footer-dock.css';

    // Drawn, not typed. A "->" or an "x" glyph renders at a different weight
    // in every font on every platform, and these sit next to each other.
    var ICON = {
        up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V6M6 12l6-6 6 6"/></svg>',
        arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M12 6l6 6-6 6"/></svg>',
        person: '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
        pen: '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
        mic: '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>',
        shield: '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6Z"/></svg>',
        down: '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/></svg>',
        doc: '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/></svg>'
    };

    var SOCIAL = [
        { name: 'LinkedIn', url: 'https://www.linkedin.com/company/notsus' },
        { name: 'YouTube', url: 'https://www.youtube.com/@NotSus_Edu' },
        { name: 'Instagram', url: 'https://www.instagram.com/notsus_edu/' },
        { name: 'TikTok', url: 'https://www.tiktok.com/@notsus_edu' },
        { name: 'X', url: 'https://x.com/NotSus_edu' }
    ];

    // The order is the point. Reaching a person is what a footer is opened
    // for, so it is first and needs no scroll. The Windows add-on is the
    // narrowest thing here and sits below the pages anyone might read. The
    // legal links are last, present and quiet.
    var BLOCKS = [
        {
            title: 'Get in touch',
            line: 'Angels, designers, programmers, parents and teachers: tell us how to make the learning environment better for our children.',
            mail: { href: 'mailto:contact@notsus.net', label: 'contact@notsus.net' }
        },
        {
            title: 'Read',
            rows: [
                { href: '/about', icon: ICON.person, name: 'About Adam', note: 'Who built this', colour: '#FFB300' },
                { href: '/blog/', icon: ICON.pen, name: 'Blog', note: '9 articles', colour: '#00A86B' },
                { href: '/podcast/', icon: ICON.mic, name: 'Radio', note: 'Podcast', colour: '#6aa9ff' }
            ]
        },
        {
            title: 'Resources',
            line: 'An optional Windows add-on that stops a child opening other browsers on the same computer.',
            rows: [
                { href: 'https://download.notsus.net/Watchdog_installer.msi', icon: ICON.shield, name: 'Browser Blocker', note: 'Windows', colour: '#FFB300' },
                { href: 'https://download.notsus.net/How_to_block_other_browsers.pdf', icon: ICON.doc, name: 'How to set it up', note: 'PDF', colour: '#989797', blank: true }
            ]
        },
        { title: 'Follow', pills: SOCIAL },
        {
            title: 'The small print',
            fine: [
                { href: '/privacy', label: 'Privacy Policy' },
                { href: '/terms', label: 'Terms of Service' },
                { href: '/delete-account', label: 'Delete your account' }
            ],
            copy: '© 2026 NotSus Education Inc. All rights reserved. 2015 Main Street, Vancouver, BC, Canada.'
        }
    ];

    function el(tag, cls, html) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html != null) n.innerHTML = html;
        return n;
    }

    function outbound(a, href, blank) {
        a.href = href;
        if (blank || /^https?:/i.test(href)) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        }
    }

    function buildBlock(spec) {
        var block = el('div', 'ns-block');
        block.appendChild(el('h3', 'ns-block-title', spec.title));
        if (spec.line) block.appendChild(el('p', 'ns-block-line', spec.line));

        if (spec.mail) {
            var mail = el('a', 'ns-cta-mail');
            mail.href = spec.mail.href;
            mail.appendChild(el('span', null, spec.mail.label));
            mail.appendChild(el('span', 'ns-chip', ICON.arrow));
            block.appendChild(mail);
        }

        (spec.rows || []).forEach(function (r) {
            var a = el('a', 'ns-row');
            outbound(a, r.href, r.blank);
            if (r.colour) a.style.setProperty('--d-row', r.colour);
            a.innerHTML = r.icon;
            a.appendChild(el('span', 'ns-row-name', r.name));
            if (r.note) a.appendChild(el('span', 'ns-row-note', r.note));
            block.appendChild(a);
        });

        if (spec.pills) {
            var pills = el('div', 'ns-pills');
            spec.pills.forEach(function (p) {
                var a = el('a', 'ns-pill');
                outbound(a, p.url);
                a.setAttribute('aria-label', 'NotSus on ' + p.name);
                a.textContent = p.name;
                pills.appendChild(a);
            });
            block.appendChild(pills);
        }

        if (spec.fine) {
            var fine = el('div', 'ns-fine');
            spec.fine.forEach(function (f) {
                var a = el('a');
                a.href = f.href;
                a.textContent = f.label;
                fine.appendChild(a);
            });
            block.appendChild(fine);
        }

        if (spec.copy) block.appendChild(el('p', 'ns-copy', spec.copy));
        return block;
    }

    /**
     * The home page carries the download card, so the panel would be offering
     * the same thing twice. Every other page has no card at all, and a footer
     * there that cannot reach the download is a footer with a hole in it.
     */
    function blocks() {
        if (document.getElementById('cta')) return BLOCKS;
        var out = BLOCKS.slice();
        out.splice(1, 0, {
            title: 'Get NotSus',
            rows: [{ href: '/downloads', icon: ICON.down, name: 'Download the browser', note: 'Free', colour: '#00A86B' }]
        });
        return out;
    }

    function build() {
        var root = el('div', 'ns-dock-root');
        root.id = 'ns-dock';

        var scrim = el('button', 'ns-scrim');
        scrim.type = 'button';
        scrim.hidden = true;
        scrim.setAttribute('aria-label', 'Close the footer');

        var trigger = el('button', 'ns-dock-trigger');
        trigger.type = 'button';
        trigger.id = 'ns-dock-open';
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-controls', 'ns-dock-panel');
        trigger.innerHTML =
            '<img class="ns-dock-mark" src="/public/logo-120.png" width="28" height="28" alt="" loading="lazy">' +
            '<span class="ns-dock-words">' +
            '<span class="ns-dock-name">NotSus.net</span>' +
            '<span class="ns-dock-sub">Contact, resources and more</span>' +
            '</span>' +
            '<span class="ns-chip">' + ICON.up + '</span>';

        var panel = el('div', 'ns-panel');
        panel.id = 'ns-dock-panel';
        panel.hidden = true;
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Site footer');

        var head = el('div', 'ns-panel-head');
        head.appendChild(el('h2', 'ns-panel-title', 'NotSus.net'));
        var close = el('button', 'ns-panel-close', '&times;');
        close.type = 'button';
        close.id = 'ns-dock-close';
        close.setAttribute('aria-label', 'Close');
        head.appendChild(close);

        var body = el('div', 'ns-panel-body');
        blocks().forEach(function (b) { body.appendChild(buildBlock(b)); });

        panel.appendChild(head);
        panel.appendChild(body);
        root.appendChild(trigger);
        root.appendChild(panel);
        document.body.appendChild(scrim);
        document.body.appendChild(root);

        return { root: root, trigger: trigger, panel: panel, close: close, scrim: scrim, body: body };
    }

    /**
     * On a phone the download card is a bar along the bottom of the screen and
     * its height changes as it opens, so the dock cannot sit at a fixed
     * distance from the bottom. Measure the card and let CSS do the sum.
     */
    function trackCard(root) {
        var card = document.getElementById('cta');
        if (!card) return;
        var set = function () {
            var h = card.hidden ? 0 : card.getBoundingClientRect().height;
            root.style.setProperty('--d-cta-h', Math.round(h) + 'px');
        };
        set();
        if (window.ResizeObserver) new ResizeObserver(set).observe(card);
        window.addEventListener('resize', set);
        // The card is revealed half a second after load and grows each time a
        // step inside it opens, and neither is a resize of the card's box in
        // every browser.
        new MutationObserver(set).observe(card, { attributes: true, attributeFilter: ['hidden', 'class'], subtree: true });
    }

    function start() {
        if (document.getElementById('ns-dock')) return;

        if (!document.querySelector('link[data-ns-dock]')) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = CSS_HREF;
            link.setAttribute('data-ns-dock', '');
            document.head.appendChild(link);
        }

        var ui = build();
        document.documentElement.classList.add('ns-docked');

        var open = function () {
            ui.panel.hidden = false;
            ui.scrim.hidden = false;
            ui.trigger.hidden = true;
            ui.trigger.setAttribute('aria-expanded', 'true');
            requestAnimationFrame(function () {
                ui.panel.classList.add('is-in');
                ui.scrim.classList.add('is-in');
            });
            ui.close.focus();
        };
        var shut = function () {
            ui.panel.classList.remove('is-in');
            ui.scrim.classList.remove('is-in');
            ui.panel.hidden = true;
            ui.scrim.hidden = true;
            ui.trigger.hidden = false;
            ui.trigger.setAttribute('aria-expanded', 'false');
        };

        ui.trigger.addEventListener('click', open);
        ui.close.addEventListener('click', shut);
        ui.scrim.addEventListener('click', shut);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !ui.panel.hidden) shut();
        });

        // 'Contact Us' pointed at a section most of the way down /about: a
        // whole page load and a scroll, for an email address. The link still
        // says where it goes, and still goes there without JavaScript, but
        // here it opens the panel at the address instead.
        document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('a[href*="#contact-section"]');
            if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
            e.preventDefault();
            open();
            ui.body.scrollTop = 0;
        });

        trackCard(ui.root);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
