/**
 * Shared site chrome: navigation labels and footer social links.
 */
(function initSiteChrome() {
    // The menu, as Adam set it on 2026-11-07. Four links, each to a page that
    // exists.
    //
    // 'Tools for Kids' is gone: the home page is that page now, and the menu
    // sits on top of it. 'About' is gone from the menu too, and lives in the
    // footer, where a person goes looking for it rather than being offered it.
    // 'Download Browser' goes to /downloads and not to an anchor on a page
    // that no longer has one.
    // Adam's order, 2026-11-07: the thing a visitor came for first, then the
    // ways to reach us, then the things to read.
    const NAV_LINKS = [
        { href: '/downloads', label: 'Download Browser' },
        { href: '/about#contact-section', label: 'Contact Us' },
        { href: '/resources', label: 'Resources' },
        { href: '/podcast/', label: 'Radio' },
        { href: '/blog/', label: 'Blog' }
    ];

    // The footer carries one more, in front: the page about the person who
    // built this. It is not in the menu, which sits over a page a child is
    // using.
    //
    // Labelled 'About'. It was 'Adam' for a day, which was a misreading of
    // the order Adam gave for these links rather than a name he asked to put
    // on one, and a visitor has no way to know who Adam is before they have
    // clicked it.
    const FOOTER_EXTRA = { href: '/about', label: 'About' };

    const SOCIAL_LINKS = [
        { name: 'LinkedIn', url: 'https://www.linkedin.com/company/notsus', label: 'NotSus on LinkedIn' },
        { name: 'YouTube', url: 'https://www.youtube.com/@NotSus_Edu', label: 'NotSus on YouTube' },
        { name: 'Instagram', url: 'https://www.instagram.com/notsus_edu/', label: 'NotSus on Instagram' },
        { name: 'TikTok', url: 'https://www.tiktok.com/@notsus_edu', label: 'NotSus on TikTok' },
        { name: 'X', url: 'https://x.com/NotSus_edu', label: 'NotSus on X' }
    ];

    function applySiteNav() {
        const mobileNav = document.getElementById('mobileNav');
        if (!mobileNav) return;

        mobileNav.innerHTML = NAV_LINKS.map(({ href, label }) =>
            `<a href="${href}" class="nav-link">${label}</a>`
        ).join('\n            ');
    }

    function injectFooterSocial() {
        const footerContent = document.querySelector('.footer-content');
        if (!footerContent || footerContent.querySelector('.footer-social')) return;

        const social = document.createElement('div');
        social.className = 'footer-social';
        social.setAttribute('aria-label', 'Social media');

        SOCIAL_LINKS.forEach(({ name, url, label }) => {
            const a = document.createElement('a');
            a.href = url;
            a.className = 'footer-social-link';
            a.setAttribute('aria-label', label);
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
            a.textContent = name;
            social.appendChild(a);
        });

        const copyright = footerContent.querySelector('.footer-copyright');
        if (copyright) {
            footerContent.insertBefore(social, copyright);
        } else {
            footerContent.appendChild(social);
        }
    }

    // One footer for the whole site, as a widget in the bottom right corner.
    // Every page loads this file, so loading it from here is what makes the
    // footer the same object on all of them. It hides whatever footer the
    // page already has, which stays in the HTML for crawlers and for anyone
    // without JavaScript.
    function loadFooterDock() {
        if (document.querySelector('script[data-ns-dock]')) return;
        const s = document.createElement('script');
        s.src = '/scripts/footer-dock.js';
        s.setAttribute('data-ns-dock', '');
        s.defer = true;
        document.head.appendChild(s);
    }

    function init() {
        applySiteNav();
        injectFooterSocial();
        loadFooterDock();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
