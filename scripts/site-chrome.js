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
    const NAV_LINKS = [
        { href: '/downloads', label: 'Download Browser' },
        { href: '/podcast/', label: 'Radio' },
        { href: '/blog/', label: 'Blog' },
        { href: '/resources', label: 'Resources' },
        { href: '/about#contact-section', label: 'Contact Us' }
    ];

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

    function init() {
        applySiteNav();
        injectFooterSocial();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
