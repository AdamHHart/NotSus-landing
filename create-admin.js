// create-admin.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./db');

async function createAdminUser(email, password) {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        
        const result = await db.query(`
            INSERT INTO users (email, password_hash, is_admin)
            VALUES ($1, $2, true)
            ON CONFLICT (email) 
            DO UPDATE SET password_hash = $2, is_admin = true
            RETURNING id, email, is_admin;
        `, [email, passwordHash]);

        console.log('Admin user created successfully:', result.rows[0]);
    } catch (err) {
        console.error('Error creating admin user:', err);
    } finally {
        await db.end();
    }
}

// Usage: node create-admin.js admin@notsus.net yourpassword
const [email, password] = process.argv.slice(2);
if (!email || !password) {
    console.log('Usage: node create-admin.js <email> <password>');
    process.exit(1);
}

createAdminUser(email, password);