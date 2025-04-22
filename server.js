// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const { authenticateToken, requireAdmin } = require('./auth');

const app = express();

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

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Root route to serve the index.html page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Downloads
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Auth routes
app.use('/auth', authRoutes);

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
app.post('/api/feedback', validateFeedback, async (req, res, next) => {
    try {
        console.log('Received feedback submission:', req.body);
        
        const result = await db.transaction(async (client) => {
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

        res.json({
            success: true,
            id: result.rows[0].id
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

// NEW: API endpoint for tracking download attempts
app.post('/api/track-download', async (req, res) => {
    try {
        const { email, platform, action, browserInfo } = req.body;
        
        console.log('Tracking download:', {
            email,
            platform,
            action,
            browserInfo
        });
        
        // Insert into download_tracking table
        await db.query(`
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
            email,
            platform,
            action,
            browserInfo.browser.name,
            browserInfo.browser.version,
            browserInfo.os.name,
            browserInfo.os.version,
            browserInfo.userAgent
        ]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error tracking download:', err);
        // Still return success to not interrupt user experience
        res.json({ success: true });
    }
});

// Admin endpoint to get feedback data
app.get('/api/admin/feedback', authenticateToken, requireAdmin, async (req, res) => {
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

        const result = await db.query(query, dateFilter ? [dateFilter] : []);

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

        const statsResult = await db.query(statsQuery);

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
app.get('/api/admin/downloads', authenticateToken, requireAdmin, async (req, res) => {
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

        const statsResult = await db.query(statsQuery);

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

        const recentResult = await db.query(recentQuery);

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

app.get('/admin', authenticateToken, requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Updated download endpoint to track successful downloads
app.get('/download/:platform', async (req, res) => {
    const { platform } = req.params;
    const email = req.query.email; // Can be passed from form
    
    // Updated download URLs pointing to R2 buckets
    const downloadUrls = {
        'windows': 'https://notsus.net/NotSus%20Browser.exe',
        'mac': 'https://notsus.net/NotSus_Browser-1.0.0-arm64.dmg'
    };
    
    if (!downloadUrls[platform]) {
        return res.status(404).json({
            success: false,
            error: 'Platform not supported'
        });
    }
    
    try {
        // Log the download in the database
        await db.query(`
            INSERT INTO app_downloads (
                platform,
                email,
                download_time,
                user_agent,
                ip_address
            ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
        `, [
            platform,
            email,
            req.headers['user-agent'],
            req.headers['x-forwarded-for'] || req.connection.remoteAddress
        ]);
        
        // Also track this as a 'complete' action in download_tracking
        if (email) {
            await db.query(`
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
                email,
                platform,
                'complete', // This action indicates they reached the download redirect
                'Unknown', // We don't parse these values on the server
                'Unknown',
                'Unknown',
                'Unknown',
                req.headers['user-agent']
            ]);
        }
        
        // Redirect to the actual file
        res.redirect(downloadUrls[platform]);
    } catch (err) {
        console.error('Error tracking download:', err);
        // Still redirect to download even if tracking fails
        res.redirect(downloadUrls[platform]);
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'healthy' });
    } catch (err) {
        res.status(503).json({ status: 'unhealthy', error: err.message });
    }
});

// Error handling middleware - must be last
app.use((err, req, res, next) => {
    console.error(err.stack);

    if (err instanceof db.DatabaseError) {
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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing database connections...');
    await db.end();
    process.exit(0);
});