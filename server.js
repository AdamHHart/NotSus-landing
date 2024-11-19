// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const { authenticateToken, requireAdmin } = require('./auth');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Root route to serve the index.html page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

    if (!Array.isArray(concerns)) {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: 'Concerns must be an array'
        });
    }

    next();
};

// API endpoint for submitting feedback
app.post('/api/feedback', validateFeedback, async (req, res, next) => {
    try {
        const result = await db.transaction(async (client) => {
            const {
                name,
                email,
                concerns,
                otherDescription
            } = req.body;

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
                concerns.includes('screen-time'),
                concerns.includes('consumptive'),
                concerns.includes('inappropriate'),
                concerns.includes('influences'),
                concerns.includes('safety'),
                concerns.includes('false-info'),
                concerns.includes('social'),
                concerns.includes('other'),
                otherDescription
            ];

            return client.query(query, values);
        });

        res.json({
            success: true,
            id: result.rows[0].id
        });
    } catch (err) {
        console.error('Error saving feedback:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to save feedback'
        });
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
