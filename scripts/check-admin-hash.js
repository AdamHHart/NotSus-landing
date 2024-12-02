// File: scripts/check-admin-hash.js

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function checkAdminHash(email) {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('Connected to database successfully');

        // Get admin user info
        const result = await client.query(`
            SELECT id, email, password_hash, is_admin, created_at
            FROM users
            WHERE email = $1
        `, [email]);

        if (result.rows.length === 0) {
            console.log('No user found with that email');
            return;
        }

        const user = result.rows[0];
        console.log('\nUser details:');
        console.log('ID:', user.id);
        console.log('Email:', user.email);
        console.log('Is Admin:', user.is_admin);
        console.log('Created:', user.created_at);
        console.log('Password Hash:', user.password_hash);

        // Verify hash format
        const isValidBcryptHash = /^\$2[abxy]\$\d+\$/.test(user.password_hash);
        console.log('\nHash validation:');
        console.log('Is valid bcrypt hash:', isValidBcryptHash);
        console.log('Hash length:', user.password_hash.length);

        // Test hash with known password
        if (process.argv[3]) {
            const testPassword = process.argv[3];
            const isMatch = await bcrypt.compare(testPassword, user.password_hash);
            console.log('\nPassword test:');
            console.log('Password matches:', isMatch);
        }

        client.release();
    } catch (err) {
        console.error('Error checking hash:', err);
    } finally {
        await pool.end();
    }
}

const email = process.argv[2];
if (!email) {
    console.log('Usage: node check-admin-hash.js <email> [test-password]');
    process.exit(1);
}

checkAdminHash(email);