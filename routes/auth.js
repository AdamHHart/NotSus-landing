// File: auth/passwordManager.js (NEW)

const bcrypt = require('bcrypt');
const db = require('../db');

class PasswordManager {
    // Configurable security parameters
    static REHASH_AGE_DAYS = 30;
    static SALT_ROUNDS = 12;
    static MAX_LOGIN_ATTEMPTS = 5;
    static LOCKOUT_DURATION_MINUTES = 15;

    static async verifyAndUpdatePassword(email, password, hash) {
        try {
            // Check if account is locked
            const lockStatus = await this.checkLockoutStatus(email);
            if (lockStatus.isLocked) {
                return { 
                    isValid: false, 
                    error: `Account locked. Try again in ${lockStatus.remainingMinutes} minutes.`
                };
            }

            // Verify password
            const isValid = await bcrypt.compare(password, hash);
            
            // Update login attempts
            if (!isValid) {
                await this.incrementLoginAttempts(email);
                return { isValid: false };
            }

            // Reset login attempts on successful login
            await this.resetLoginAttempts(email);

            // Check if we should rehash
            const shouldRehash = await this.shouldRehashPassword(hash);
            if (shouldRehash) {
                console.log(`Rehashing password for ${email}`);
                const newHash = await this.rehashPassword(email, password);
                return { isValid: true, newHash };
            }

            return { isValid: true };
        } catch (err) {
            console.error('Error in password verification:', err);
            throw err;
        }
    }

    static async shouldRehashPassword(hash) {
        try {
            // Check bcrypt version and cost
            const [, version, cost] = hash.split('$');
            const currentCost = this.SALT_ROUNDS;

            // Rehash if cost factor is different
            if (parseInt(cost) !== currentCost) {
                return true;
            }

            // Get last password update time
            const lastUpdate = await db.query(`
                SELECT password_updated_at
                FROM users
                WHERE password_hash = $1
            `, [hash]);

            if (lastUpdate.rows.length > 0 && lastUpdate.rows[0].password_updated_at) {
                const updateDate = new Date(lastUpdate.rows[0].password_updated_at);
                const daysSinceUpdate = (Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24);
                return daysSinceUpdate >= this.REHASH_AGE_DAYS;
            }

            return false;
        } catch (err) {
            console.error('Error checking hash status:', err);
            return false;
        }
    }

    static async rehashPassword(email, password) {
        try {
            const newHash = await bcrypt.hash(password, this.SALT_ROUNDS);
            
            await db.query(`
                UPDATE users
                SET 
                    password_hash = $1,
                    password_updated_at = CURRENT_TIMESTAMP,
                    failed_login_attempts = 0,
                    last_failed_login = NULL
                WHERE email = $2
            `, [newHash, email]);

            return newHash;
        } catch (err) {
            console.error('Error rehashing password:', err);
            throw err;
        }
    }

    static async checkLockoutStatus(email) {
        try {
            const result = await db.query(`
                SELECT 
                    failed_login_attempts,
                    last_failed_login
                FROM users
                WHERE email = $1
            `, [email]);

            if (result.rows.length === 0) {
                return { isLocked: false };
            }

            const { failed_login_attempts, last_failed_login } = result.rows[0];

            if (failed_login_attempts >= this.MAX_LOGIN_ATTEMPTS && last_failed_login) {
                const lockoutEnd = new Date(last_failed_login.getTime() + this.LOCKOUT_DURATION_MINUTES * 60000);
                const now = new Date();

                if (now < lockoutEnd) {
                    const remainingMinutes = Math.ceil((lockoutEnd - now) / 60000);
                    return { isLocked: true, remainingMinutes };
                }
            }

            return { isLocked: false };
        } catch (err) {
            console.error('Error checking lockout status:', err);
            return { isLocked: false };
        }
    }

    static async incrementLoginAttempts(email) {
        try {
            await db.query(`
                UPDATE users
                SET 
                    failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
                    last_failed_login = CURRENT_TIMESTAMP
                WHERE email = $1
            `, [email]);
        } catch (err) {
            console.error('Error incrementing login attempts:', err);
        }
    }

    static async resetLoginAttempts(email) {
        try {
            await db.query(`
                UPDATE users
                SET 
                    failed_login_attempts = 0,
                    last_failed_login = NULL
                WHERE email = $1
            `, [email]);
        } catch (err) {
            console.error('Error resetting login attempts:', err);
        }
    }
}

module.exports = PasswordManager;