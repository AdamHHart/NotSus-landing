require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../db');

async function createAdminUser(email, password) {
    try {
        // First verify database connection
        const dbCheck = await db.query('SELECT NOW()');
        console.log('Database connected successfully');

        // Check if users table exists
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            throw new Error('Users table does not exist - migrations may not have run');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        
        const result = await db.query(`
            INSERT INTO users (email, password_hash, is_admin)
            VALUES ($1, $2, true)
            ON CONFLICT (email) 
            DO UPDATE SET password_hash = $2, is_admin = true
            RETURNING id, email, is_admin, created_at
        `, [email, passwordHash]);

        console.log('Admin user created/updated successfully:', {
            id: result.rows[0].id,
            email: result.rows[0].email,
            is_admin: result.rows[0].is_admin,
            created_at: result.rows[0].created_at
        });

        // Verify the user was created and can be retrieved
        const verify = await db.query('SELECT id, email, is_admin FROM users WHERE email = $1', [email]);
        console.log('Verified user exists:', verify.rows[0]);

    } catch (err) {
        console.error('Error creating admin user:', err);
        console.error('Error details:', err.detail);
        console.error('Error code:', err.code);
        throw err;
    } finally {
        await db.end();
    }
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
    console.log('Usage: node create-admin.js <email> <password>');
    process.exit(1);
}

createAdminUser(email, password)
    .catch(err => {
        console.error('Failed to create admin user');
        process.exit(1);
    });