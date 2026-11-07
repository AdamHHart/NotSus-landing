#!/usr/bin/env node
// scripts/check-routes.js
//
// Dispatches real requests through the real app, with sendFile stubbed and no
// port opened, and checks which file each one would send.
//
// This exists because of a bug that reached production on 2026-11-07. The '/'
// route was registered after express.static, and express.static serves
// __dirname/index.html for a request to '/' by itself, so the route was never
// reached and the old home page kept being served whatever HOME_PAGE said. It
// looked like it worked for as long as both answers were the same file, which
// is exactly the kind of fault a person reading the code does not see.
//
// Run: npm run check:routes

const { EventEmitter } = require('node:events');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

const express = require(path.join(ROOT, 'node_modules', 'express'));

let served = null;
express.response.sendFile = function (p) {
    served = path.relative(ROOT, p);
    this.end();
    return this;
};

// server.js does not export the app, so take it from inside listen, where
// `this` is the app, and never open a socket.
let app = null;
express.application.listen = function (port, cb) {
    app = this;
    const s = new EventEmitter();
    s.close = (f) => f && f();
    if (cb) setImmediate(cb);
    return s;
};

const quiet = console.log;
console.log = () => {};
require(path.join(ROOT, 'server.js'));
console.log = quiet;

if (!app) {
    console.error('server.js never reached listen(); cannot check the routes.');
    process.exit(1);
}

function get(url) {
    served = null;
    const req = Object.assign(new EventEmitter(), {
        method: 'GET', url, headers: { host: 'www.notsus.net' },
        socket: {}, connection: {}, httpVersion: '1.1',
    });
    const res = Object.assign(new EventEmitter(), {
        setHeader() {}, getHeader() {}, removeHeader() {}, writeHead() {},
        write() {}, end() {}, headersSent: false,
    });
    app(req, res, () => {});
    // express.static stats the file before giving up, so anything registered
    // after it answers on a later tick.
    return new Promise((r) => setTimeout(() => r(served), 60));
}

const classic = (process.env.HOME_PAGE || '').toLowerCase() === 'classic';

// Only the paths where a route has to beat express.static.
//
// /home, /delete-account and /android are not here on purpose: each is a real
// directory, so express.static answers first with a redirect to the trailing
// slash and serves its index.html. Their routes exist as a fallback and never
// run. That is correct and has always been how they worked, and a test that
// expected otherwise would fail for the wrong reason.
const cases = [
    ['/', classic ? 'index.html' : 'home/index.html',
        classic ? 'HOME_PAGE=classic puts the old page back' : 'the rebuilt home screen is the default'],
    ['/about', 'index.html',
        'the old page needs an address that does not move when / changes'],
];

(async () => {
    let bad = 0;
    for (const [url, want, why] of cases) {
        const got = await get(url);
        const ok = got === want;
        if (!ok) bad++;
        console.log(`  ${ok ? 'ok  ' : 'FAIL'}  GET ${url.padEnd(16)} -> ${got === null ? '(nothing; express.static answered, or nothing matched)' : got}`);
        if (!ok) console.log(`          expected ${want}: ${why}`);
    }
    console.log(bad === 0 ? '\nEvery route sends the file it should.\n' : `\n${bad} route(s) wrong.\n`);
    process.exit(bad ? 1 : 0);
})();
