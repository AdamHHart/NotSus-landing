// File: scripts/update-admin-hash.js

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function updateAdminHash(email, newPassword) {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('Connected to database successfully');

        // Generate new hash
        const saltRounds = 10;
        const newHash = await bcrypt.hash(newPassword, saltRounds);
        console.log('\nGenerated new hash:', newHash);

        // Update user password
        const result = await client.query(`
            UPDATE users
            SET password_hash = $1
            WHERE email = $2 AND is_admin = true
            RETURNING id, email, is_admin, created_at
        `, [newHash, email]);

        if (result.rows.length === 0) {
            console.log('No admin user found with that email');
            return;
        }

        const user = result.rows[0];
        console.log('\nPassword updated successfully for:');
        console.log('ID:', user.id);
        console.log('Email:', user.email);
        console.log('Is Admin:', user.is_admin);
        console.log('Updated at:', user.created_at);

        // Verify the new hash
        const verifyResult = await client.query(`
            SELECT password_hash
            FROM users
            WHERE email = $1
        `, [email]);

        const storedHash = verifyResult.rows[0].password_hash;
        const isMatch = await bcrypt.compare(newPassword, storedHash);
        console.log('\nVerification:');
        console.log('New password verified:', isMatch);

        client.release();
    } catch (err) {
        console.error('Error updating hash:', err);
    } finally {
        await pool.end();
    }
}

const [email, newPassword] = process.argv.slice(2);
if (!email || !newPassword) {
    console.log('Usage: node update-admin-hash.js <email> <new-password>');
    process.exit(1);
}

updateAdminHash(email, newPassword);