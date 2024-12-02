// File: migrations/add_password_timestamp.js

require('dotenv').config();
const { Pool } = require('pg');

async function addPasswordTimestamp() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('Connected to database successfully');

        await client.query('BEGIN');

        try {
            // Add password_updated_at column
            await client.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            `);

            // Add index for performance
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_users_password_updated 
                ON users(password_updated_at);
            `);

            await client.query('COMMIT');
            console.log('Migration completed successfully!');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error in migration:', err);
    } finally {
        await pool.end();
    }
}

addPasswordTimestamp();