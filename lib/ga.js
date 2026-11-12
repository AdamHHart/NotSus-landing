// lib/ga.js
//
// Read-only traffic numbers from Google Analytics (GA4), for the /admin page.
//
// GA4 already collects visits, country, time on site and device for the site,
// through the gtag tag on every page. This reads those back with a service
// account, so the dashboard can show them without any new tracking of our own.
//
// Two environment variables, both set in Render, never committed:
//   GA_PROPERTY_ID          the numeric GA4 property id
//   GA_SERVICE_ACCOUNT_B64  base64 of the service account JSON key
//
// When either is missing, isConfigured() is false and the dashboard shows a
// "not configured" note instead of failing.

let client = null;
let propertyId = null;
let configError = null;

function init() {
    if (client || configError) return;
    propertyId = (process.env.GA_PROPERTY_ID || '').trim();
    const b64 = (process.env.GA_SERVICE_ACCOUNT_B64 || '').trim();
    if (!propertyId || !b64) {
        configError = 'GA_PROPERTY_ID or GA_SERVICE_ACCOUNT_B64 is not set.';
        return;
    }
    try {
        const credentials = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
        const { BetaAnalyticsDataClient } = require('@google-analytics/data');
        client = new BetaAnalyticsDataClient({
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key,
            },
        });
    } catch (err) {
        configError = 'Could not read the service account key: ' + err.message;
    }
}

function isConfigured() {
    init();
    return !!client;
}

const property = () => `properties/${propertyId}`;

// One date range, reused. "7daysAgo" is GA4's own relative form.
function range(days) {
    return [{ startDate: `${days}daysAgo`, endDate: 'today' }];
}

// A small helper: run a report and hand back plain rows.
async function report(body) {
    init();
    if (!client) throw new Error(configError || 'GA is not configured.');
    const [res] = await client.runReport({ property: property(), ...body });
    return res;
}

async function overview(days = 28) {
    const res = await report({
        dateRanges: range(days),
        metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' },
        ],
    });
    const m = (res.rows && res.rows[0] && res.rows[0].metricValues) || [];
    const num = (i) => (m[i] ? Number(m[i].value) : 0);
    return {
        activeUsers: Math.round(num(0)),
        sessions: Math.round(num(1)),
        pageViews: Math.round(num(2)),
        avgSessionSeconds: Math.round(num(3)),
        bounceRate: num(4),
    };
}

async function byCountry(days = 28, limit = 10) {
    const res = await report({
        dateRanges: range(days),
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit,
    });
    return (res.rows || []).map((r) => ({
        country: r.dimensionValues[0].value,
        users: Math.round(Number(r.metricValues[0].value)),
        sessions: Math.round(Number(r.metricValues[1].value)),
    }));
}

async function byDevice(days = 28) {
    const res = await report({
        dateRanges: range(days),
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    });
    return (res.rows || []).map((r) => ({
        device: r.dimensionValues[0].value,
        users: Math.round(Number(r.metricValues[0].value)),
    }));
}

// Daily sessions, for a small trend line.
async function daily(days = 28) {
    const res = await report({
        dateRanges: range(days),
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
    });
    return (res.rows || []).map((r) => {
        const d = r.dimensionValues[0].value; // YYYYMMDD
        return {
            date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
            sessions: Math.round(Number(r.metricValues[0].value)),
            users: Math.round(Number(r.metricValues[1].value)),
        };
    });
}

// Top pages by views, so the dashboard can show where traffic lands.
async function topPages(days = 28, limit = 10) {
    const res = await report({
        dateRanges: range(days),
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit,
    });
    return (res.rows || []).map((r) => ({
        path: r.dimensionValues[0].value,
        views: Math.round(Number(r.metricValues[0].value)),
        users: Math.round(Number(r.metricValues[1].value)),
    }));
}

async function traffic(days = 28) {
    const [o, countries, devices, trend, pages] = await Promise.all([
        overview(days), byCountry(days), byDevice(days), daily(days), topPages(days),
    ]);
    return { days, overview: o, countries, devices, daily: trend, topPages: pages };
}

module.exports = { isConfigured, traffic, overview, byCountry, byDevice, daily, topPages };
