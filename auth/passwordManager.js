// File: auth/passwordManager.js

const bcrypt = require('bcrypt');
const db = require('../db');

class PasswordManager {
    // How old a hash needs to be before rehashing (in days)
    static REHASH_AGE_DAYS = 30;
    
    // Bcrypt cost factor - can be adjusted based on security needs
    static SALT_ROUNDS = 12;

    static async verifyAndUpdatePassword(email, password, hash) {
        try {
            // First verify the password
            const isValid = await bcrypt.compare(password, hash);
            if (!isValid) {
                return { isValid: false };
            }

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
            // Check if the hash uses an old version of bcrypt
            const [, version, cost] = hash.split('$');
            const currentCost = this.SALT_ROUNDS;
            
            // Rehash if using different cost factor
            if (parseInt(cost) !== currentCost) {
                return true;
            }

            // Could also implement time-based rehashing here
            return false;
        } catch (err) {
            console.error('Error checking hash status:', err);
            return false;
        }
    }

    static async rehashPassword(email, password) {
        try {
            const newHash = await bcrypt.hash(password, this.SALT_ROUNDS);
            
            // Update the password hash in the database
            await db.query(`
                UPDATE users
                SET 
                    password_hash = $1,
                    password_updated_at = CURRENT_TIMESTAMP
                WHERE email = $2
            `, [newHash, email]);

            return newHash;
        } catch (err) {
            console.error('Error rehashing password:', err);
            throw err;
        }
    }
}

module.exports = PasswordManager;