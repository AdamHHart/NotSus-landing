/**
 * The site footer, and the widget each of its items opens.
 *
 * Loaded by scripts/site-chrome.js, which every page on the site already
 * loads, so there is one footer and it is the same object on the home page,
 * on /about, on the blog and on the legal pages. Before this each of those
 * had its own, with different links in a different order, and moving between
 * them meant learning the footer again.
 *
 * The footer sits at the bottom of the page, where a footer goes. Clicking
 * an item opens that item, and only that item, as a widget in the bottom
 * right corner, in the same column and at the same width as the download
 * card in the top right. One at a time: opening a second replaces the first.
 * Each one closes with its X, with Escape, and on a phone by tapping
 * outside it.
 *
 * Every item is a real link to a real page, so with no JavaScript the footer
 * is an ordinary footer and every item still goes somewhere. The widget is
 * what happens instead when the click can be caught.
 *
 * The page's own <footer> stays in the HTML and the stylesheet hides it. A
 * crawler reads those links, and so does anyone whose JavaScript did not run.
 */
(function initFooterDock() {
    'use strict';

    var CSS_HREF = '/home/footer-dock.css';

    // Drawn, not typed. These sit next to each other, and a glyph renders at
    // a different weight in every font on every platform.
    var ICON = {
        arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M12 6l6 6-6 6"/></svg>',
        person: '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
        down: '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/></svg>',
        pen: '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
        mic: '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>',
        shield: '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6Z"/></svg>',
        doc: '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/></svg>',
        lock: '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'
    };

    var SOCIAL = [
        { name: 'LinkedIn', url: 'https://www.linkedin.com/company/notsus' },
        { name: 'YouTube', url: 'https://www.youtube.com/@NotSus_Edu' },
        { name: 'Instagram', url: 'https://www.instagram.com/notsus_edu/' },
        { name: 'TikTok', url: 'https://www.tiktok.com/@notsus_edu' },
        { name: 'X', url: 'https://x.com/NotSus_edu' }
    ];

    // Rewritten by scripts/preview-home.js, which builds a copy of this
    // page that is opened from somewhere other than notsus.net.
    var BLOG_BASE = '/blog/';

    /**
     * Every device, the same list lib/platforms.js keeps and the download
     * card offers. A copy, because this file is a plain browser script that
     * every page loads and that file is node's. check:dock fails if the two
     * stop matching, field for field.
     */
    var PLATFORMS = [
        { platform: 'mac', label: 'Mac', note: 'Apple Silicon', colour: '#a78bfa',
          icon: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M1 20h22"/>' },
        { platform: 'windows', label: 'Windows', note: '', colour: '#38bdf8',
          icon: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>' },
        { platform: 'ipad', label: 'iPad', note: 'write to us', colour: '#2dd4bf',
          icon: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18.5h2"/>' },
        { platform: 'android', label: 'Android', note: 'not on Play yet', colour: '#4ade80',
          icon: '<rect x="5" y="7" width="14" height="12" rx="3"/><path d="M8 7 6.5 4M16 7l1.5-3M9.5 12h.01M14.5 12h.01"/>' },
        { platform: 'linux', label: 'Linux', note: '', colour: '#fbbf24',
          icon: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>' },
        { platform: 'macIntel', label: 'Mac', note: 'Intel', colour: '#94a3b8',
          icon: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M1 20h22"/>' }
    ];
    var IPAD_MAILTO = 'mailto:contact@notsus.net?subject=iPad%20early%20access';

    // How many articles the Blog widget shows before it offers the rest. The
    // widget was taller than the screen with nine in it.
    var BLOG_FIRST = 4;

    var ADDRESS = '© 2026 NotSus Education Inc. All rights reserved. 2015 Main Street, Vancouver, BC, Canada.';

    /**
     * The footer. Each item is the label in the footer, the href it goes to
     * with no JavaScript, and the widget it opens instead when it can.
     *
     * Short labels. A footer is a list of places, not a list of sentences.
     */
    var ITEMS = [
        {
            key: 'about', label: 'About', href: '/about', title: 'About',
            line: 'NotSus is a custom internet for children: an infinite library, a school and a workshop, with no feed and nothing to sell them.',
            rows: [{ href: '/about', icon: ICON.person, name: 'Read the full story', colour: '#FFB300', blank: true }]
        },
        {
            key: 'download', label: 'Download', href: '/downloads', title: 'Download',
            line: 'Free. No email, no credit card, no data.',
            devices: true
        },
        {
            key: 'contact', label: 'Contact', href: 'mailto:contact@notsus.net', title: 'Contact',
            line: 'Angels, designers, programmers, parents and teachers: tell us how to make the learning environment better for our children.',
            mail: { href: 'mailto:contact@notsus.net', label: 'contact@notsus.net' }
        },
        {
            key: 'resources', label: 'Resources', href: '/resources', title: 'Resources',
            line: 'An optional Windows add-on that stops a child opening other browsers on the same computer.',
            rows: [
                { href: 'https://download.notsus.net/Watchdog_installer.msi', icon: ICON.shield, name: 'Browser Blocker', note: 'Windows', colour: '#FFB300' },
                { href: 'https://download.notsus.net/How_to_block_other_browsers.pdf', icon: ICON.doc, name: 'How to set it up', note: 'PDF', colour: '#989797' }
            ]
        },
        {
            key: 'radio', label: 'Radio', href: '/podcast/', title: 'Radio',
            episodes: true
        },
        {
            key: 'blog', label: 'Blog', href: '/blog/', title: 'Blog',
            articles: true
        },
        { key: 'follow', label: 'Follow', href: SOCIAL[0].url, title: 'Follow', pills: SOCIAL },
        { key: 'legal', label: 'Legal', href: '/privacy', title: 'Legal', legal: true, copy: ADDRESS }
    ];

    function el(tag, cls, html) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html != null) n.innerHTML = html;
        return n;
    }

    function outbound(a, href, blank) {
        a.href = href;
        if (blank || /^https?:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    }

    /**
     * A row. Anything in here that goes to one of our own pages opens in a
     * new tab: the point of the widget is that the page a visitor is using
     * is still there when they are done reading. Downloads are the
     * exception, because a download does not take the page away.
     */
    function row(r) {
        var a = el('a', 'ns-row');
        outbound(a, r.href, r.blank);
        if (r.colour) a.style.setProperty('--d-row', r.colour);
        a.innerHTML = r.icon;
        a.appendChild(el('span', 'ns-row-name', r.name));
        if (r.note) a.appendChild(el('span', 'ns-row-note', r.note));
        return a;
    }

    /**
     * A heading that drops down. Descriptions, episode notes and the legal
     * text all live behind one of these in a small font, so a widget opens
     * as a list of headings rather than as a wall.
     */
    function fold(title, note) {
        var d = el('details', 'ns-fold');
        var sum = el('summary', 'ns-fold-head');
        sum.appendChild(el('span', 'ns-fold-title', title));
        if (note) sum.appendChild(el('span', 'ns-fold-note', note));
        d.appendChild(sum);
        var body = el('div', 'ns-fold-body');
        d.appendChild(body);
        d.body = body;
        return d;
    }

    function deviceRow(p) {
        var a = el('a', 'ns-row');
        outbound(a, p.platform === 'ipad' ? IPAD_MAILTO : '/download/' + p.platform);
        a.style.setProperty('--d-row', p.colour);
        a.innerHTML = '<svg class="ns-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
            + ' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            + p.icon + '</svg>';
        a.appendChild(el('span', 'ns-row-name', p.label));
        if (p.note) a.appendChild(el('span', 'ns-row-note', p.note));
        return a;
    }

    /**
     * A copy baked into the page, if there is one.
     *
     * Only scripts/preview-home.js writes these. That file is a standalone
     * copy of the page opened from somewhere with no server behind it, so
     * every request from it fails and the widgets read as broken when they
     * were not.
     */
    function baked(id) {
        var n = document.getElementById(id);
        return n ? n.textContent : null;
    }

    /** Fetch, and say so if it does not arrive, rather than sitting empty. */
    function load(target, url, render, bakedId) {
        var have = bakedId && baked(bakedId);
        if (have) {
            try { return render(url.slice(-5) === '.html' ? have : JSON.parse(have)); } catch (err) {}
        }
        var wait = el('p', 'ns-wait', 'Loading\u2026');
        target.appendChild(wait);
        if (!window.fetch) { wait.textContent = 'Could not load that right now.'; return; }
        fetch(url).then(function (r) {
            if (!r.ok) throw new Error(r.status);
            return url.slice(-5) === '.html' ? r.text() : r.json();
        }).then(function (data) {
            wait.remove ? wait.remove() : null;
            render(data);
        }).catch(function () {
            wait.textContent = 'Could not load that right now.';
        });
    }

    function bodyFor(item) {
        var body = el('div', 'ns-panel-body');
        if (item.line) body.appendChild(el('p', 'ns-block-line', item.line));

        if (item.mail) {
            var mail = el('a', 'ns-cta-mail');
            mail.href = item.mail.href;
            mail.appendChild(el('span', null, item.mail.label));
            mail.appendChild(el('span', 'ns-chip', ICON.arrow));
            body.appendChild(mail);
        }

        // The same device list the download card offers, here rather than on
        // a page of its own, so nobody has to leave to get the file.
        if (item.devices) {
            var list = el('div', 'ns-list');
            PLATFORMS.forEach(function (p) { list.appendChild(deviceRow(p)); });
            body.appendChild(list);
        }

        if (item.pills) {
            var pills = el('div', 'ns-pills');
            item.pills.forEach(function (p) {
                var a = el('a', 'ns-pill');
                outbound(a, p.url);
                a.setAttribute('aria-label', 'NotSus on ' + p.name);
                a.textContent = p.name;
                pills.appendChild(a);
            });
            body.appendChild(pills);
        }

        // The articles, read from the file the blog index is built from, so
        // the widget cannot list a post that is no longer there. Four, and
        // then the rest on request: nine made the widget taller than the
        // screen.
        if (item.articles) {
            var posts = el('div', 'ns-list');
            body.appendChild(posts);
            var fill = function (all) {
                var shown = 0;
                var more = el('button', 'ns-more');
                more.type = 'button';
                var draw = function (n) {
                    all.slice(shown, shown + n).forEach(function (p) {
                        posts.appendChild(row({ href: BLOG_BASE + p.slug, icon: ICON.pen, name: p.title, colour: '#00A86B', blank: true }));
                    });
                    shown = Math.min(shown + n, all.length);
                    if (shown >= all.length) { more.remove ? more.remove() : null; }
                    else { more.textContent = 'Show ' + (all.length - shown) + ' more'; }
                };
                more.addEventListener('click', function () { draw(all.length); });
                draw(BLOG_FIRST);
                if (shown < all.length) body.appendChild(more);
            };
            var baked = document.getElementById('ns-articles');
            if (baked) {
                try { fill(JSON.parse(baked.textContent)); } catch (err) {}
            } else {
                load(body, '/blog/articles.json', fill);
            }
            body.appendChild(row({ href: BLOG_BASE, icon: ICON.pen, name: 'The blog', colour: '#00A86B', blank: true }));
        }

        // The episodes, from the same place /podcast/ reads them. Each one is
        // a heading that drops down to its notes, so six fit above the fold.
        if (item.episodes) {
            var eps = el('div', 'ns-list');
            body.appendChild(eps);
            load(eps, '/api/podcast/episodes', function (payload) {
                var d = payload.data || payload;
                var list = d.episodes || [];
                if (!list.length) {
                    eps.appendChild(el('p', 'ns-wait', 'No episodes yet.'));
                    return;
                }
                list.forEach(function (ep) {
                    var when = ep.pubDate ? new Date(ep.pubDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
                    var f = fold(ep.title, [when, ep.duration].filter(Boolean).join(' \u00b7 '));
                    if (ep.description) f.body.appendChild(el('p', 'ns-small', ep.description.slice(0, 400) + (ep.description.length > 400 ? '\u2026' : '')));
                    var where = ep.episodePageUrl || d.spotifyUrl;
                    if (where) {
                        var a = el('a', 'ns-row');
                        outbound(a, where);
                        a.style.setProperty('--d-row', '#1DB954');
                        a.innerHTML = ICON.mic;
                        a.appendChild(el('span', 'ns-row-name', 'Listen'));
                        f.body.appendChild(a);
                    }
                    eps.appendChild(f);
                });
            }, 'ns-episodes');
            body.appendChild(row({ href: '/podcast/', icon: ICON.mic, name: 'All episodes', colour: '#6aa9ff', blank: true }));
        }

        // The policies themselves, in the widget. Each one opens into its own
        // numbered sections, which is how both documents are written, and the
        // text is fetched only when somebody asks for it.
        if (item.legal) {
            [
                { title: 'Privacy Policy', url: '/docs/PrivacyPolicy.html', pick: '.privacy-content', baked: 'ns-legal-privacy' },
                { title: 'Terms of Service', url: '/docs/TandC.html', pick: '.terms-content', baked: 'ns-legal-terms' }
            ].forEach(function (doc) {
                var f = fold(doc.title);
                var done = false;
                f.addEventListener('toggle', function () {
                    if (done || !f.open) return;
                    done = true;
                    load(f.body, doc.url, function (text) {
                        var parsed = new DOMParser().parseFromString(text, 'text/html');
                        var scope = parsed.querySelector(doc.pick) || parsed.body;
                        var heads = Array.prototype.slice.call(scope.querySelectorAll('h2'));
                        if (!heads.length) { f.body.appendChild(el('p', 'ns-small', scope.textContent.trim().slice(0, 4000))); return; }
                        heads.forEach(function (h) {
                            var sec = fold(h.textContent.trim());
                            sec.classList.add('ns-fold-inner');
                            var n = h.nextElementSibling;
                            while (n && n.tagName !== 'H2') {
                                var t = n.textContent.trim();
                                if (t) sec.body.appendChild(el('p', 'ns-small', t));
                                n = n.nextElementSibling;
                            }
                            f.body.appendChild(sec);
                        });
                    }, doc.baked);
                });
                body.appendChild(f);
            });
            body.appendChild(row({ href: '/delete-account/', icon: ICON.doc, name: 'Delete your account', colour: '#989797', blank: true }));
        }

        (item.rows || []).forEach(function (r) { body.appendChild(row(r)); });
        if (item.copy) body.appendChild(el('p', 'ns-copy', item.copy));
        return body;
    }

    /** The footer itself, the same one on every page. */
    function buildFooter() {
        var f = el('footer', 'ns-footer');

        var top = el('div', 'ns-footer-top');
        top.innerHTML = '<img src="/public/logo-120.png" width="40" height="40" alt="" loading="lazy">';
        top.appendChild(el('p', 'ns-footer-brand', 'NotSus.net'));
        top.appendChild(el('p', 'ns-footer-tagline', 'The better browser for kids.'));
        f.appendChild(top);

        var nav = el('nav', 'ns-footer-links');
        nav.setAttribute('aria-label', 'Site');
        ITEMS.forEach(function (item) {
            var a = el('a');
            a.href = item.href;
            a.setAttribute('data-panel', item.key);
            a.textContent = item.label;
            nav.appendChild(a);
        });
        f.appendChild(nav);
        f.appendChild(el('p', 'ns-footer-copy', ADDRESS));
        return f;
    }

    /**
     * On a phone the download card is a bar along the bottom of the screen
     * and its height changes as it opens, so a widget cannot sit at a fixed
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
        // step inside it opens, and neither is a resize of the card's own box
        // in every browser.
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

        // The widget lives here. The scrim is INSIDE it on purpose: the root
        // is positioned and has a z-index, so it is a stacking context, and
        // a scrim outside it painted over every widget on a phone however
        // high the widget's own z-index was. Inside, the panel paints above
        // the scrim because it comes after it.
        var root = el('div', 'ns-dock-root');
        root.id = 'ns-dock';
        var scrim = el('button', 'ns-scrim');
        scrim.type = 'button';
        scrim.hidden = true;
        scrim.setAttribute('aria-label', 'Close');
        root.appendChild(scrim);
        document.body.appendChild(root);

        var current = null;

        var shut = function () {
            if (current) { current.panel.remove ? current.panel.remove() : null; current = null; }
            root.querySelectorAll && Array.prototype.slice.call(root.querySelectorAll('.ns-panel')).forEach(function (p) {
                p.parentNode.removeChild(p);
            });
            scrim.hidden = true;
            scrim.classList.remove('is-in');
            Array.prototype.slice.call(document.querySelectorAll('.ns-footer-links a')).forEach(function (a) {
                a.setAttribute('aria-expanded', 'false');
            });
        };

        // One at a time: opening a second widget replaces the first.
        var open = function (item, trigger) {
            shut();
            var panel = el('div', 'ns-panel');
            panel.id = 'ns-dock-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-label', item.title);

            var head = el('div', 'ns-panel-head');
            head.appendChild(el('h2', 'ns-panel-title', item.title));
            var close = el('button', 'ns-panel-close', '&times;');
            close.type = 'button';
            close.className = 'ns-panel-close';
            close.setAttribute('aria-label', 'Close');
            close.addEventListener('click', shut);
            head.appendChild(close);

            panel.appendChild(head);
            panel.appendChild(bodyFor(item));
            root.appendChild(panel);

            scrim.hidden = false;
            requestAnimationFrame(function () {
                panel.classList.add('is-in');
                scrim.classList.add('is-in');
            });
            if (trigger) trigger.setAttribute('aria-expanded', 'true');
            close.focus();
            current = { panel: panel, item: item };
        };

        scrim.addEventListener('click', shut);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && current) shut();
        });

        // The footer, in place of whatever footer the page shipped with. The
        // old one stays in the HTML, hidden, for a crawler and for no
        // JavaScript.
        document.documentElement.classList.add('ns-docked');
        var footer = buildFooter();
        document.body.appendChild(footer);

        var byKey = {};
        ITEMS.forEach(function (i) { byKey[i.key] = i; });

        document.addEventListener('click', function (e) {
            if (!e.target.closest) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
            // Any footer item, and any Contact Us link anywhere on the site:
            // that one pointed at a section most of the way down /about, a
            // page load and a scroll for an email address.
            var a = e.target.closest('[data-panel]') || e.target.closest('a[href*="#contact-section"]');
            if (!a) return;
            var item = byKey[a.getAttribute('data-panel')] || byKey.contact;
            if (!item) return;
            e.preventDefault();
            open(item, a);
        });

        trackCard(root);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
