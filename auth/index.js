const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

// Load JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // In production, always use environment variable!
const SALT_ROUNDS = 10;

// Validation rules
const registrationRules = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/\d/)
        .withMessage('Password must contain a number')
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