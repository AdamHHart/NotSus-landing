// routes/admin.js
const express = require('express');
const { authenticateToken, requireAdmin } = require('../auth');
const db = require('../db');

const router = express.Router();

// Get all feedback submissions (requires admin)
router.get('/feedback', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                f.*,
                u.email as user_email
            FROM user_feedback f
            LEFT JOIN users u ON f.user_id = u.id
            ORDER BY f.created_at DESC
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;