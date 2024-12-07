const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

router.post('/login', async (req, res) => {
    console.log('Login attempt:', req.body);
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Email and password are required' 
            });
        }

        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        console.log('User query result:', userResult.rows);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid email or password' 
            });
        }

        const user = userResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        console.log('Password validation:', { isValid: isPasswordValid });

        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid email or password' 
            });
        }

        // Check admin status
        if (!user.is_admin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email,
                is_admin: user.is_admin 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        console.log('Login successful for:', email);

        res.status(200).json({
            success: true,
            token: token,
            user: {
                email: user.email,
                is_admin: user.is_admin
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

module.exports = router;