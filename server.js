// server.js
console.log('[NotSus] Starting server...');
console.log('[NotSus] Loading dependencies (first run on this machine can take 1–2 minutes — please wait)...');

require('dotenv').config();
const crypto = require('crypto');

console.log('[NotSus]   • loading Express...');
const express = require('express');
console.log('[NotSus]   • Express ready');

const cors = require('cors');
const path = require('path');

// pg and rss-parser can take 30–90s on first require; load only when needed.
let db;
function getDb() {
    if (!db) {
        console.log('[NotSus] Loading database (first use may take a minute)...');
        db = require('./db');
    }
    return db;
}

// bcrypt and resend are slow to load on first require (~30–90s). Load lazily so the site starts immediately.
let authRoutesCache;
function getAuthRoutes() {
    if (!authRoutesCache) authRoutesCache = require('./routes/auth');
    return authRoutesCache;
}

function lazyAuthenticateToken(req, res, next) {
    return require('./auth').authenticateToken(req, res, next);
}

function lazyRequireAdmin(req, res, next) {
    return require('./auth').requireAdmin(req, res, next);
}

console.log('[NotSus] Loading Express app...');
const app = express();

// Express tells every visitor what it is, which is free reconnaissance.
app.disable('x-powered-by');

// Security headers. Deliberately no Content-Security-Policy: the pages carry
// inline scripts and styles, Google Analytics and a YouTube embed, so a
// policy written blind would break the site rather than protect it. That one
// is worth doing properly, page by page, as its own piece of work.
app.use((req, res, next) => {
    // A year, and Cloudflare is already terminating TLS, so this only closes
    // the first plain-HTTP request a browser makes before it learns better.
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Stops a browser deciding a .txt is really a script.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Nobody has a reason to frame notsus.net but us.
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    next();
});

/**
 * A small fixed-window limiter, in memory.
 *
 * In memory is honest about what it is: the site runs as one Render instance,
 * so one counter is the whole picture, and it resets on deploy. It is here to
 * stop a password being guessed ten thousand times and a form being hammered,
 * not to survive a determined attack. If the site ever runs on more than one
 * instance this has to move to the database or to Cloudflare.
 */
function rateLimit({ windowMs, max, message }) {
    const hits = new Map();
    return (req, res, next) => {
        const now = Date.now();
        const key = req.headers['x-forwarded-for']?.split(',')[0].trim()
            || req.socket.remoteAddress
            || 'unknown';
        const entry = hits.get(key);
        if (!entry || now > entry.resetAt) {
            hits.set(key, { count: 1, resetAt: now + windowMs });
        } else if (entry.count >= max) {
            res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
            return res.status(429).json({ success: false, error: message });
        } else {
            entry.count++;
        }
        // The map would otherwise grow for every address that ever called.
        if (hits.size > 5000) {
            for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
        }
        return next();
    };
}

const corsOptions = {
    origin: [
        'https://www.notsus.net', 
        'https://notsus.net',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve static files — long cache for assets, no cache for HTML (so deploys show up immediately)
app.use(express.static(path.join(__dirname), {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// Root route to serve the index.html page.
//
// HOME_PAGE=replica serves the rebuilt home screen (home/index.html) here
// instead. It is an environment variable rather than an edit so the switch can
// be thrown, and thrown back, from the Render dashboard without a deploy.
// Anything other than 'replica' keeps the old page, which is the default.
const HOME_PAGE = (process.env.HOME_PAGE || 'classic').toLowerCase();

app.get('/', (req, res) => {
    if (HOME_PAGE === 'replica') {
        return res.sendFile(path.join(__dirname, 'home', 'index.html'));
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});
// The admin login page, served to anyone, which is correct: it is a login
// form and nothing else. Everything behind it needs a token.
//
// There used to be a second registration of this route further down, wrapped
// in authenticateToken and requireAdmin. It read the token from an
// Authorization header, and a browser typing /admin into the address bar
// sends no such header, so that route could only ever have answered 401. The
// unwrapped one above it was the reason the page worked at all. The wrapped
// one is deleted rather than this one. 2026-11-07.
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Legal pages at short URLs (the /docs/ paths keep working; the homepage modals load them)
app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'docs', 'PrivacyPolicy.html'));
});
app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'docs', 'TandC.html'));
});

app.get('/podcast', (req, res) => {
    res.redirect(301, '/podcast/');
});

// Google Play requires a public page for account deletion, reachable by
// someone who has already uninstalled the app. The in-app route still exists
// and is described here; this page is the one the store listing links to.
app.get('/delete-account', (req, res) => {
    res.sendFile(path.join(__dirname, 'delete-account', 'index.html'));
});

app.get('/android', (req, res) => {
    res.sendFile(path.join(__dirname, 'android', 'index.html'));
});

// The browser's home screen, as a web page: every site in the catalogue, with
// a search and filters built for a child who knows what they want to do and
// not which site does it. Generated by scripts/build-home.js.
//
// It lives at /home always, and also at '/' when HOME_PAGE=replica. Keeping
// this address means a link to it does not break when the switch is thrown.
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'home', 'index.html'));
});

// The old home page, which the new one does not replace so much as move.
// It holds About, How It Works, Resources and Contact Us, and the footer of
// the new page links to those anchors, so it needs an address of its own that
// does not depend on which page is at '/'.
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tools', (req, res) => {
    res.redirect(301, '/tools/');
});

app.get('/blog', (req, res) => {
    res.redirect(301, '/blog/');
});

// Legacy blog URLs → production filenames
const blogRedirects = {
    'screen-quality-vs-time-parents-guide': 'screen-quality-vs-time',
    'understanding-dopamine-loops-digital-age': 'dopamine-loops',
    'childhood-tech-experience-for-kids': '90s-computer-experience-for-kids',
    'kid-safe-search-engines-creativity': 'Why-Kid-Safe-Search-Engines-Still-Fail-the-Creativity-Test',
    'minecraft-to-masterpiece-screen-time': 'from-minecraft-to-masterpiece',
    'adhd-and-attention-economy': 'adhd-and-the-attention-economy'
};
Object.entries(blogRedirects).forEach(([from, to]) => {
    app.get(`/blog/${from}`, (req, res) => res.redirect(301, `/blog/${to}.html`));
    app.get(`/blog/${from}.html`, (req, res) => res.redirect(301, `/blog/${to}.html`));
});

app.get('/api/podcast/episodes', async (req, res) => {
    try {
        const { getPodcastEpisodes } = require('./services/podcastService');
        const data = await getPodcastEpisodes();
        res.json({ success: true, data });
    } catch (err) {
        console.error('Podcast API error:', err);
        res.status(503).json({
            success: false,
            message: 'Unable to load podcast episodes',
            error: err.message
        });
    }
});

// Downloads
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Auth routes (loaded on first /auth request)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many sign-in attempts. Try again in a few minutes.',
});
app.use('/auth', loginLimiter, (req, res, next) => getAuthRoutes()(req, res, next));

console.log('[NotSus] Core routes registered...');

// Validation middleware
const validateFeedback = (req, res, next) => {
    const { email, concerns } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: 'Email is required'
        });
    }

    // Only validate concerns array if present
    if (concerns && !Array.isArray(concerns)) {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: 'Concerns must be an array'
        });
    }

    next();
};

// API endpoint for submitting feedback - Updated to handle all fields
const formLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: 'Too many submissions. Try again shortly.',
});

app.post('/api/feedback', formLimiter, validateFeedback, async (req, res, next) => {
    try {
        // The body carries a name and an email address, so it does not go in
        // the logs. Render keeps those, and they are not the right home for
        // somebody's details.
        console.log('Received feedback submission');
        
        const result = await getDb().transaction(async (client) => {
            const {
                name,
                email,
                concerns,
                gains,
                otherDescription,
                gainsDescription
            } = req.body;

            console.log('Processing values:', {
                name,
                email,
                concerns,
                gains,
                otherDescription,
                gainsDescription
            });

            const query = `
                INSERT INTO user_feedback (
                    name,
                    email,
                    screen_time_addiction,
                    consumptive_habits,
                    inappropriate_content,
                    bad_influences,
                    safety,
                    false_information,
                    social_distortion,
                    other_concern,
                    other_description
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id;
            `;

            const values = [
                name,
                email,
                concerns?.includes('screen-time'),
                concerns?.includes('consumptive'),
                concerns?.includes('inappropriate'),
                concerns?.includes('influences'),
                concerns?.includes('safety'),
                concerns?.includes('false-info'),
                concerns?.includes('social'),
                concerns?.includes('other'),
                otherDescription
            ];

            console.log('Executing query with values:', values);
            
            try {
                const queryResult = await client.query(query, values);
                console.log('Query result:', queryResult);
                return queryResult;
            } catch (dbError) {
                console.error('Database error details:', {
                    code: dbError.code,
                    message: dbError.message,
                    detail: dbError.detail,
                    table: dbError.table,
                    constraint: dbError.constraint
                });
                throw dbError;
            }
        });

        console.log('Transaction completed successfully:', result);

        // Create email verification token (24h) and send verification email
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await getDb().query(`
            INSERT INTO email_verification_tokens (email, token, expires_at)
            VALUES ($1, $2, $3)
        `, [req.body.email, verificationToken, expiresAt]);

        const { sendVerificationEmail } = require('./services/email');
        await sendVerificationEmail(req.body.email, verificationToken);

        res.json({
            success: true,
            id: result.rows[0].id,
            requireVerification: true,
            message: 'check_email'
        });
    } catch (err) {
        console.error('Full error details:', {
            message: err.message,
            stack: err.stack,
            code: err.code,
            detail: err.detail
        });
        res.status(500).json({
            success: false,
            error: 'Failed to save feedback',
            detail: err.message
        });
    }
});

// API endpoint for tracking download attempts (email or token for verified users)
app.post('/api/track-download', formLimiter, async (req, res) => {
    try {
        const { email, token, platform, action, browserInfo } = req.body;
        let resolvedEmail = email;
        if (token && !email) {
            const row = await getDb().query(
                'SELECT email FROM download_tokens WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP',
                [token]
            );
            if (row.rows.length > 0) resolvedEmail = row.rows[0].email;
        }

        console.log('Tracking download:', { email: resolvedEmail, platform, action });

        await getDb().query(`
            INSERT INTO download_tracking (
                email,
                platform,
                action,
                browser_name,
                browser_version,
                os_name,
                os_version,
                user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            resolvedEmail || null,
            platform,
            action,
            (browserInfo && browserInfo.browser && browserInfo.browser.name) || 'Unknown',
            (browserInfo && browserInfo.browser && browserInfo.browser.version) || 'Unknown',
            (browserInfo && browserInfo.os && browserInfo.os.name) || 'Unknown',
            (browserInfo && browserInfo.os && browserInfo.os.version) || 'Unknown',
            (browserInfo && browserInfo.userAgent) || ''
        ]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error tracking download:', err);
        res.json({ success: true });
    }
});

// Admin endpoint to get feedback data
app.get('/api/admin/feedback', lazyAuthenticateToken, lazyRequireAdmin, async (req, res) => {
    try {
        const dateFilter = req.query.date;

        // Get submissions
        let query = `
            SELECT *
            FROM user_feedback
        `;

        if (dateFilter) {
            query += ` WHERE DATE(created_at) = $1`;
        }

        query += ` ORDER BY created_at DESC`;

        const result = await getDb().query(query, dateFilter ? [dateFilter] : []);

        // Get statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today,
                CASE 
                    WHEN COUNT(*) FILTER (WHERE screen_time_addiction) > COUNT(*) FILTER (WHERE safety) THEN 'Screen Time'
                    WHEN COUNT(*) FILTER (WHERE safety) > COUNT(*) FILTER (WHERE inappropriate_content) THEN 'Safety'
                    ELSE 'Content'
                END as top_concern
            FROM user_feedback;
        `;

        const statsResult = await getDb().query(statsQuery);

        res.json({
            success: true,
            submissions: result.rows,
            stats: {
                total: statsResult.rows[0].total,
                today: statsResult.rows[0].today,
                topConcern: statsResult.rows[0].top_concern
            }
        });
    } catch (err) {
        console.error('Error fetching feedback:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch feedback data'
        });
    }
});

// NEW: Admin endpoint to view download statistics
app.get('/api/admin/downloads', lazyAuthenticateToken, lazyRequireAdmin, async (req, res) => {
    try {
        // Get download statistics
        const statsQuery = `
            SELECT 
                platform,
                action,
                COUNT(*) as count,
                MAX(created_at) as last_attempt
            FROM download_tracking
            GROUP BY platform, action
            ORDER BY platform, action
        `;

        const statsResult = await getDb().query(statsQuery);

        // Get recent download attempts
        const recentQuery = `
            SELECT
                id,
                email,
                platform,
                action,
                browser_name,
                browser_version,
                os_name,
                os_version,
                created_at
            FROM download_tracking
            ORDER BY created_at DESC
            LIMIT 50
        `;

        const recentResult = await getDb().query(recentQuery);

        res.json({
            success: true,
            stats: statsResult.rows,
            recent: recentResult.rows
        });
    } catch (err) {
        console.error('Error fetching download stats:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch download statistics'
        });
    }
});

// Admin endpoint to export all completed downloads (full historical data)
app.get('/api/admin/downloads/export', lazyAuthenticateToken, lazyRequireAdmin, async (req, res) => {
    try {
        const completedDownloadsQuery = `
            SELECT
                id,
                email,
                platform,
                action,
                browser_name,
                browser_version,
                os_name,
                os_version,
                user_agent,
                created_at
            FROM download_tracking
            WHERE action = 'complete'
            ORDER BY created_at DESC
        `;

        const result = await getDb().query(completedDownloadsQuery);

        res.json({
            success: true,
            downloads: result.rows
        });
    } catch (err) {
        console.error('Error exporting completed downloads:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to export completed download data'
        });
    }
});

// Verify email: validate token, mark used, create download token, redirect to home with download_token
const BASE_URL = process.env.BASE_URL || 'https://www.notsus.net';
app.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.redirect(`${BASE_URL}/?verify=missing`);
    }
    try {
        const row = await getDb().query(`
            SELECT id, email FROM email_verification_tokens
            WHERE token = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
        `, [token]);
        if (row.rows.length === 0) {
            return res.redirect(`${BASE_URL}/?verify=invalid`);
        }
        const { id, email } = row.rows[0];
        await getDb().query(`UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

        const downloadToken = crypto.randomBytes(32).toString('hex');
        const downloadExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await getDb().query(`
            INSERT INTO download_tokens (email, token, expires_at) VALUES ($1, $2, $3)
        `, [email, downloadToken, downloadExpiresAt]);

        const downloadNowUrl = `${BASE_URL}/download-now?token=${encodeURIComponent(downloadToken)}`;
        return res.redirect(downloadNowUrl);
    } catch (err) {
        console.error('Verify email error:', err);
        return res.redirect(`${BASE_URL}/?verify=error`);
    }
});

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
        platform: 'linux', label: 'Linux', note: '', colour: '#fbbf24',
        icon: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
    },
    {
        platform: 'macIntel', label: 'Mac', note: 'Intel', colour: '#94a3b8',
        icon: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M1 20h22"/>',
    },
];

/* ------------------------------------------------------------------ human */

/*
 * A Cloudflare Turnstile check in front of the downloads.
 *
 * Be clear about what this is and is not. The installers live on
 * download.notsus.net and answer an anonymous request directly, so anything
 * that wants the file can still take it without coming near this. What this
 * does is keep the route a person uses for people: no drive-by scripted
 * fetches through notsus.net, no crawler writing a row into app_downloads
 * every time it walks the site, and a number at the end of the month that
 * means something.
 *
 * Turnstile rather than reCAPTCHA. It sets no cookies, builds no profile, and
 * usually asks a person for nothing at all. On a site aimed at children,
 * handing every visitor to Google to be fingerprinted is the wrong trade, and
 * it is the same reason the app bundles its fonts instead of calling Google
 * Fonts.
 *
 * The whole thing is off unless both keys are set, so the site runs exactly as
 * it does today until Adam creates them in the Cloudflare dashboard.
 */
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || '';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const HUMAN_COOKIE = 'notsus_human';
const HUMAN_TTL_MINUTES = 30;

function humanCheckEnabled() {
    return Boolean(TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY && process.env.JWT_SECRET);
}

function readCookie(req, name) {
    const raw = req.headers.cookie;
    if (!raw) return null;
    for (const part of raw.split(';')) {
        const i = part.indexOf('=');
        if (i === -1) continue;
        if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1));
    }
    return null;
}

/** Has this browser passed the check in the last half hour? */
function alreadyHuman(req) {
    const value = readCookie(req, HUMAN_COOKIE);
    if (!value) return false;
    try {
        require('jsonwebtoken').verify(value, process.env.JWT_SECRET);
        return true;
    } catch {
        return false;
    }
}

const verifyLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 30,
    message: 'Too many attempts. Try again shortly.',
});

app.post('/api/verify-human', verifyLimiter, async (req, res) => {
    if (!humanCheckEnabled()) {
        return res.json({ success: true, enabled: false });
    }
    const token = (req.body && req.body.token) || '';
    if (!token) {
        return res.status(400).json({ success: false, error: 'No token.' });
    }
    try {
        const body = new URLSearchParams({
            secret: TURNSTILE_SECRET_KEY,
            response: token,
            remoteip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
        });
        const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body,
            signal: AbortSignal.timeout(8000),
        }).then((r) => r.json());

        if (!result.success) {
            console.warn('Turnstile rejected a token:', result['error-codes']);
            return res.status(403).json({ success: false, error: 'Could not verify. Try again.' });
        }

        // A signed cookie rather than a flag, so it cannot simply be set by
        // hand, and short-lived because it is a doorway and not a session.
        const pass = require('jsonwebtoken').sign(
            { h: 1 },
            process.env.JWT_SECRET,
            { expiresIn: `${HUMAN_TTL_MINUTES}m` },
        );
        res.setHeader('Set-Cookie', [
            `${HUMAN_COOKIE}=${encodeURIComponent(pass)}`,
            'Path=/',
            'HttpOnly',
            'Secure',
            'SameSite=Lax',
            `Max-Age=${HUMAN_TTL_MINUTES * 60}`,
        ].join('; '));
        return res.json({ success: true, enabled: true });
    } catch (err) {
        console.error('Turnstile verification failed:', err.message);
        return res.status(502).json({ success: false, error: 'Could not reach the checker. Try again.' });
    }
});

/**
 * Does this look like a crawler rather than a parent?
 *
 * Only used to decide whether a download is worth counting. It is not a
 * defence and must never be used as one: a user agent is a string the client
 * chooses, and anything that wanted past this would simply say Chrome.
 */
function looksLikeABot(userAgent) {
    if (!userAgent) return true;
    return /bot|crawler|spider|crawling|slurp|curl|wget|python-requests|httpclient|headless|scrapy|facebookexternalhit|preview|monitor|uptime|pingdom|lighthouse|semrush|ahrefs/i
        .test(userAgent);
}

/** Where a platform's file actually lives. iPad has none yet; it is an email. */
const DOWNLOAD_URLS = {
    windows: 'https://download.notsus.net/NotSus_Browser_2.1.1.exe',
    mac: 'https://download.notsus.net/NotSus_Browser-2.1.1-arm64.dmg',
    macIntel: 'https://download.notsus.net/NotSus_Browser-2.1.1.dmg',
    linux: 'https://download.notsus.net/notsusbrowser_2.1.1_amd64.deb',
    android: 'https://download.notsus.net/NotSus-2.2.0.apk',
};

const IPAD_MAILTO = 'mailto:contact@notsus.net?subject=iPad%20early%20access';

function downloadsPage(token, { verified = false } = {}) {
    const gate = humanCheckEnabled() && !token && !verified;
    const tokenEnc = token ? encodeURIComponent(token) : '';
    const links = PLATFORMS.map((entry) => {
        const href = entry.platform === 'ipad'
            ? IPAD_MAILTO
            : `/download/${entry.platform}${tokenEnc ? `?token=${tokenEnc}` : ''}`;
        return { ...entry, href };
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Download NotSus | NotSus.net</title>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-JP7D4XPL7X"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-JP7D4XPL7X');
    </script>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/png" href="/favicon.png">
    ${gate ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}
    <style>
        .dl-gate { max-width: 460px; margin: 2rem auto 0; text-align: center; }
        .dl-gate p { margin: 0 0 0.9rem; opacity: 0.85; }
        .dl-gate .cf-turnstile { display: inline-block; }
        .dl-grid.is-locked { opacity: 0.35; pointer-events: none; }
        .dl-grid { display: grid; gap: 0.85rem; max-width: 460px; margin: 2rem auto 0; }
        /* Each row carries its platform's colour, so a parent finds their own
           device by looking rather than by reading every line. */
        .dl-grid a {
            display: flex; align-items: center; gap: 1rem;
            padding: 1rem 1.25rem;
            border: 1px solid color-mix(in srgb, var(--dl-colour) 35%, transparent);
            background: color-mix(in srgb, var(--dl-colour) 8%, transparent);
            border-radius: 12px;
            text-decoration: none;
            color: var(--text-primary, #fff);
            transition: border-color 0.15s, background 0.15s, transform 0.15s;
        }
        .dl-grid a:hover {
            border-color: var(--dl-colour);
            background: color-mix(in srgb, var(--dl-colour) 16%, transparent);
            transform: translateY(-1px);
        }
        .dl-icon { flex: 0 0 auto; width: 26px; height: 26px; stroke: var(--dl-colour); }
        /* The page centres its text; these rows read as a list and must not. */
        .dl-label { font-weight: 600; font-size: 1.05rem; flex: 1 1 auto; text-align: left; }
        .dl-note { font-size: 0.85rem; opacity: 0.7; text-align: right; flex: 0 1 auto; }
        .dl-help { max-width: 460px; margin: 2rem auto 0; font-size: 0.9rem; opacity: 0.8; text-align: center; }
        /* The default link blue is close to unreadable on this background. */
        .dl-help a { color: var(--secondary-accent, #f5a623); }
    </style>
</head>
<body class="page-download-now">
    <header>
        <div class="header-container">
            <div class="header-left">
                <a href="/"><img src="/public/logo-120.png" height="40" width="40" alt="NotSus Logo" class="logo-img"></a>
                <div class="logo-text-container">
                    <a href="/" style="color:inherit;text-decoration:none;"><div class="logo">NotSus.net</div></a>
                    <h6 class="logo-tagline">The better browser for kids.</h6>
                </div>
            </div>
        </div>
    </header>
    <main class="container download-now-main">
        <h1 class="download-now-title">Download NotSus</h1>
        <p class="download-now-subtitle">Choose the device your child will use.</p>
        ${gate ? `<div class="dl-gate" id="dl-gate">
            <p>One quick check, so we know you are a person.</p>
            <div class="cf-turnstile" data-sitekey="${TURNSTILE_SITE_KEY}" data-callback="notsusHumanOk" data-theme="dark"></div>
        </div>` : ''}
        <div class="dl-grid${gate ? ' is-locked' : ''}" id="dl-grid">
            ${links.map(({ href, label, note, platform, colour, icon }) => `<a href="${href}" style="--dl-colour: ${colour}" onclick="gtag('event', 'installer_download', { event_label: '${label}', app_platform: '${platform}' });"><svg class="dl-icon" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg><span class="dl-label">${label}</span>${note ? `<span class="dl-note">${note}</span>` : ''}</a>`).join('\n            ')}
        </div>
        <p class="dl-help">On an Android tablet, your tablet will warn you because the app did not come from the Play Store. <a href="/android">The steps are here</a>.</p>
        <p class="download-now-back"><a href="/" style="color: var(--secondary-accent);">Back to home</a></p>
    </main>
    ${gate ? `<script>
    // Turnstile calls this with the token once the visitor passes. The server
    // checks the token with Cloudflare and sets a short-lived cookie; only
    // then do the buttons become live.
    function notsusHumanOk(token) {
        fetch('/api/verify-human', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token })
        }).then(function (r) { return r.json(); }).then(function (d) {
            if (!d.success) return;
            document.getElementById('dl-grid').classList.remove('is-locked');
            var gate = document.getElementById('dl-gate');
            if (gate) gate.remove();
        }).catch(function () {});
    }
    </script>` : ''}
</body>
</html>`;
}

// The page the verification email sends a parent to.
//
// The email gate was removed on 2026-11-06 (Adam: "I no longer ask for email
// at download. Instead I prompt this in the browser"), so this address no
// longer needs a token. A token still works, and still records the download
// against the address it was issued to, because links in emails already sent
// have to keep working.
app.get('/download-now', async (req, res) => {
    const token = req.query.token;
    if (!token) {
        return res.type('html').send(downloadsPage(null, { verified: alreadyHuman(req) }));
    }
    try {
        const tokenRow = await getDb().query(`
            SELECT email FROM download_tokens
            WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
        `, [token]);
        if (tokenRow.rows.length === 0) {
            // Expired, most likely. The files are public now, so give them the
            // page rather than an error about a token they never asked for.
            return res.type('html').send(downloadsPage(null, { verified: alreadyHuman(req) }));
        }
        res.type('html').send(downloadsPage(token));
    } catch (err) {
        console.error('Downloads page error:', err);
        return res.type('html').send(downloadsPage(null, { verified: alreadyHuman(req) }));
    }
});

// The same page without a token, and since 2026-11-06 the only path that
// matters: nobody is asked for an email any more. The new home screen's card
// links here and promises "no email", so this has to be true.
app.get('/downloads', (req, res) => {
    res.type('html').send(downloadsPage(null, { verified: alreadyHuman(req) }));
});

// A GET, so the form limiter does not cover it, and it writes a row per
// request. Without this a script could fill app_downloads as fast as it
// liked, which costs more than the bandwidth ever would.
const downloadLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 40,
    message: 'Too many download requests. Try again shortly.',
});

app.get('/download/:platform', downloadLimiter, async (req, res) => {
    const { platform } = req.params;
    const downloadToken = req.query.token;

    // One list, shared with the downloads page above, so a platform cannot be
    // offered there and missing here.
    const downloadUrls = DOWNLOAD_URLS;

    if (!downloadUrls[platform]) {
        return res.status(404).json({
            success: false,
            error: 'Platform not supported'
        });
    }
    if (!downloadUrls[platform] || downloadUrls[platform].trim() === '') {
        return res.status(503).json({
            success: false,
            error: 'Download not available',
            message: `The ${platform} download is not yet available. Please check back soon.`
        });
    }

    // The human check, when it is switched on. An old emailed link carries a
    // download token and skips it, because those were sent to people who had
    // already proved they were one.
    if (!downloadToken && humanCheckEnabled() && !alreadyHuman(req)) {
        return res.redirect(`${BASE_URL}/downloads?verify=1`);
    }

    // No token means we do not know who this is, which since the gate was
    // removed is the normal case. Count it and hand over the file.
    //
    // Platform and browser, and deliberately not the IP address: a download
    // nobody put their name to does not need one, and the count is the only
    // thing this record is for.
    //
    // Crawlers are handed the file like anyone else and simply not counted.
    // Blocking them would be theatre, because the installers sit on
    // download.notsus.net and anything can fetch them straight from there
    // without passing through here at all. The only thing worth protecting is
    // the honesty of the number.
    if (!downloadToken) {
        if (!looksLikeABot(req.headers['user-agent'])) {
            try {
                await getDb().query(`
                    INSERT INTO app_downloads (platform, email, download_time, user_agent)
                    VALUES ($1, NULL, CURRENT_TIMESTAMP, $2)
                `, [platform, req.headers['user-agent']]);
            } catch (err) {
                console.error('Could not record an anonymous download:', err.message);
            }
        }
        return res.redirect(downloadUrls[platform]);
    }

    try {
        const tokenRow = await getDb().query(`
            SELECT email FROM download_tokens
            WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
        `, [downloadToken]);
        if (tokenRow.rows.length === 0) {
            // An old link. The file is public, so send them to it.
            return res.redirect(downloadUrls[platform]);
        }
        const email = tokenRow.rows[0].email;

        await getDb().query(`
            INSERT INTO app_downloads (platform, email, download_time, user_agent, ip_address)
            VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
        `, [platform, email, req.headers['user-agent'], req.headers['x-forwarded-for'] || req.connection.remoteAddress]);

        await getDb().query(`
            INSERT INTO download_tracking (email, platform, action, browser_name, browser_version, os_name, os_version, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [email, platform, 'complete', 'Unknown', 'Unknown', 'Unknown', 'Unknown', req.headers['user-agent']]);

        res.redirect(downloadUrls[platform]);
    } catch (err) {
        console.error('Error tracking download:', err);
        res.redirect(downloadUrls[platform]);
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await getDb().query('SELECT 1');
        res.json({ status: 'healthy' });
    } catch (err) {
        res.status(503).json({ status: 'unhealthy', error: err.message });
    }
});

// Error handling middleware - must be last
console.log('[NotSus] All routes registered.');

app.use((err, req, res, next) => {
    console.error(err.stack);

    if (err.name === 'DatabaseError') {
        return res.status(500).json({
            success: false,
            error: 'Database error',
            message: err.message,
            code: err.code
        });
    }

    res.status(500).json({
        success: false,
        error: 'Server error',
        message: err.message
    });
});

const PORT = process.env.PORT || 3000;
console.log(`[NotSus] Binding to port ${PORT}...`);
const server = app.listen(PORT, () => {
    console.log(`[NotSus] Server running at http://localhost:${PORT}`);
    console.log('[NotSus] Blog: /blog/  Tools: /tools/  Podcast: /podcast/');
    console.log('[NotSus] Static pages are ready. Waitlist/API routes load the database on first use.');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`[NotSus] Port ${PORT} is already in use. Stop the other process or set PORT in .env`);
    } else {
        console.error('[NotSus] Failed to start server:', err.message);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing database connections...');
    if (db) await getDb().end();
    process.exit(0);
});
