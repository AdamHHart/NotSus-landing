#!/usr/bin/env node
// scripts/check-ratelimit.js
//
// Nothing that counts or identifies a caller may trust X-Forwarded-For.
//
// The thing this exists to stop happening again: until 2026-11-10 every rate
// limiter keyed on X-Forwarded-For, which the client writes. A request can
// carry any value, and a different one per request, so the login limiter, the
// download limiter and the human-check limiter counted nobody and never
// fired. Rotating one header walked past all of them.
//
// The site is behind Cloudflare, which overwrites CF-Connecting-IP with the
// address it actually received the connection from. That is the header to
// trust; the socket address is the only fallback.
//
// Run: npm run check:ratelimit

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

let failed = 0, passed = 0;
const ok = (name, cond, detail) => {
  if (cond) { passed++; return; }
  failed++;
  console.error(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`);
};

console.log('No caller is identified by a header they control');

// 1. The helper exists and trusts the right source.
ok('there is a clientIp() helper', /function clientIp\s*\(/.test(server));
const body = (() => {
  const m = server.match(/function clientIp\s*\(req\)\s*\{([\s\S]*?)\n\}/);
  return m ? m[1] : '';
})();
ok('clientIp reads cf-connecting-ip', /cf-connecting-ip/.test(body),
  'Cloudflare sets this to the real client address and the client cannot forge it');
ok('clientIp never falls back to x-forwarded-for', !/x-forwarded-for/i.test(body),
  'a present-but-forged value is worse than none');
ok('clientIp falls back to the socket address', /remoteAddress/.test(body));

// 2. Nothing security-relevant reads the spoofable header directly.
//    A comment explaining why it is avoided is allowed; a read is not.
const codeLines = server.split('\n')
  .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
const reads = codeLines.filter((l) => /\bx-forwarded-for\b/i.test(l));
ok('no code line reads x-forwarded-for', reads.length === 0,
  reads.map((l) => l.trim()).join('\n        '));

// 3. The three places that once trusted it now call clientIp.
const limiterKey = server.match(/const key = ([^\n;]+)/);
ok('the rate limiter keys on clientIp', !!limiterKey && /clientIp\(req\)/.test(limiterKey[1]),
  limiterKey ? `keys on: ${limiterKey[1].trim()}` : 'no "const key =" found');
ok('the Turnstile check sends clientIp as remoteip', /remoteip:\s*clientIp\(req\)/.test(server));
ok('the download row records clientIp', /INSERT INTO app_downloads[\s\S]{0,200}clientIp\(req\)/.test(server));

// 4. The limiter that matters most is actually applied to the login route.
ok('the admin login route is rate limited',
  /app\.use\('\/auth',\s*loginLimiter/.test(server),
  'the limiter is pointless if it is not on the route it protects');

console.log(failed
  ? `\n  ${passed} pass, ${failed} FAIL\n`
  : `\n  ${passed} checks pass\n`);
process.exit(failed ? 1 : 0);
