// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const db = require('../db');
const { 
    authenticateToken,
    requireAdmin,
    registrationRules,
    generateToken,
    SALT_ROUNDS 
} = require('../auth');

const router = express.Router();

// Register new user
router.post('/register', registrationRules, async (req, res, next) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const result = await db.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, is_admin',
            [email, passwordHash]
        );

        const user = result.rows[0];
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                is_admin: user.is_admin
            }
        });

    } catch (err) {
        next(err);
    }
});

// Login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find user
        const result = await db.query(
            'SELECT id, email, password_hash, is_admin FROM users WHERE email = $1',
            [email]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                is_admin: user.is_admin
            }
        });

    } catch (err) {
        next(err);
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            is_admin: req.user.is_admin
        }
    });
});

module.exports = router;