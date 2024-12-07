// File: scripts/verify-admin.js
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function verifyAdmin() {
    const pool = new Pool({
        connectionString: 'postgresql://notsus_db_user:co1308KoULl6vQJoVij6vasaoaHourvl@dpg-csue64i3esus73a6k450-a.ohio-postgres.render.com/notsus_db',
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('Connected to database successfully');

        // Get user details
        const result = await client.query(`
            SELECT id, email, is_admin, password_hash, created_at
            FROM users
            WHERE email = $1
        `, ['adamhayhart@gmail.com']);

        if (result.rows.length === 0) {
            console.log('No user found with that email');
            return;
        }

        const user = result.rows[0];
        console.log('\nFound user:');
        console.log('ID:', user.id);
        console.log('Email:', user.email);
        console.log('Is Admin:', user.is_admin);
        console.log('Created at:', user.created_at);
        console.log('Password hash:', user.password_hash);

        // Verify the password
        const testPassword = 'Adamp@ss23062017';
        const isMatch = await bcrypt.compare(testPassword, user.password_hash);
        console.log('\nPassword verification:');
        console.log('Password matches:', isMatch);

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

verifyAdmin();