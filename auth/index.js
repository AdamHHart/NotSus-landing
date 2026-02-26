const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Load JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // In production, always use environment variable!
const SALT_ROUNDS = 10;

// Simple email regex (no external validator dependency)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Registration validation middleware (replaces express-validator to avoid broken dependency chain on Render)
const registrationRules = [
    (req, res, next) => {
        const { email, password } = req.body || {};
        const errors = [];
        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
            errors.push({ field: 'email', message: 'Valid email is required' });
        }
        if (!password || typeof password !== 'string') {
            errors.push({ field: 'password', message: 'Password is required' });
        } else if (password.length < 8) {
            errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
        } else if (!/\d/.test(password)) {
            errors.push({ field: 'password', message: 'Password must contain a number' });
        }
        if (errors.length) {
            return res.status(400).json({ success: false, error: errors[0].message, errors });
        }
        req.body.email = (req.body.email || '').trim().toLowerCase();
        next();
    }
];

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        req.user = user;
        next();
    });
};

// Middleware to check admin status
const requireAdmin = (req, res, next) => {
    if (!req.user.is_admin) {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
};

const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email,
            is_admin: user.is_admin 
        }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
    );
};

module.exports = {
    authenticateToken,
    requireAdmin,
    registrationRules,
    generateToken,
    SALT_ROUNDS
};

// Back-compat: validationResult was used with express-validator; no-op if anything still expects it
module.exports.validationResult = () => ({ isEmpty: () => true, array: () => [] });