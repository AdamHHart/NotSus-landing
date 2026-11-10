// lib/platforms.js
//
// Every platform NotSus runs on, in one place.
//
// This used to live in server.js alone. The CTA card on the new home page now
// offers the same list, and that page is generated at build time by
// scripts/build-home.js, so a second copy would drift the first time a
// version number changed. Both read this.

/**
 * Every platform NotSus runs on, in one list.
 *
 * Adam, 2026-10-06: "one Download Now, requires a parent email, it leads to a
 * page with all downloads available. There are no separate rules for Android."
 * So Android sits with the rest rather than on a page of its own, and the
 * email is asked for once rather than per platform.
 *
 * Every button goes through /download/:platform, which counts the download and
 * then redirects to the file. A visitor who came through an old email carries a
 * token and is recorded against their address; everyone else is counted without
 * one. Linking straight at the files would leave the count to Google Analytics
 * alone, and honest download numbers were the only real reason the email gate
 * existed.
 */
const PLATFORMS = [
    {
        platform: 'mac', label: 'Mac', note: 'Apple Silicon', colour: '#a78bfa',
        icon: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M1 20h22"/>',
    },
    {
        platform: 'windows', label: 'Windows', note: '', colour: '#38bdf8',
        icon: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
    },
    {
        platform: 'ipad', label: 'iPad', note: 'write to us', colour: '#2dd4bf',
        icon: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18.5h2"/>',
    },
    {
        platform: 'android', label: 'Android', note: 'not on Play yet', colour: '#4ade80',
        icon: '<rect x="5" y="7" width="14" height="12" rx="3"/><path d="M8 7 6.5 4M16 7l1.5-3M9.5 12h.01M14.5 12h.01"/>',
    },
    {
        platform: 'linux', label: 'Linux', note: 'AppImage', colour: '#fbbf24',
        icon: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
    },
    {
        platform: 'macIntel', label: 'Mac', note: 'Intel', colour: '#94a3b8',
        icon: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M1 20h22"/>',
    },
];

/**
 * Where a platform's file actually lives. iPad has none yet; it is an email.
 *
 * These names carry no version. They used to, which meant every release
 * needed an edit here to match, and when that edit was missed the site went
 * on offering the previous build: 2.1.1 was still being handed out after the
 * app had moved on. The release uploads to the name below and keeps a
 * versioned copy beside it for rollback, so this file stops changing.
 *
 * Linux is an AppImage rather than a .deb. electron-builder builds a .deb by
 * shelling out to ar, and macOS's ar writes a static library instead: it
 * produced a 96 byte "package" once. An AppImage runs on any distribution
 * without a package manager, so it is the whole Linux release.
 */
const DOWNLOAD_URLS = {
    windows: 'https://download.notsus.net/NotSus_Browser.exe',
    mac: 'https://download.notsus.net/NotSus_Browser-arm64.dmg',
    macIntel: 'https://download.notsus.net/NotSus_Browser-x64.dmg',
    linux: 'https://download.notsus.net/NotSus_Browser.AppImage',
    android: 'https://download.notsus.net/NotSus-2.2.0.apk',
};

const IPAD_MAILTO = 'mailto:contact@notsus.net?subject=iPad%20early%20access';

module.exports = { PLATFORMS, DOWNLOAD_URLS, IPAD_MAILTO };
