// File: scripts/create-user-feedback-table.js

require('dotenv').config();
const { Pool } = require('pg');

async function createUserFeedbackTable() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('Connected to database successfully');

        try {
            // Start transaction
            await client.query('BEGIN');

            // Create user_feedback table
            console.log('Creating user_feedback table...');
            await client.query(`
                CREATE TABLE IF NOT EXISTS user_feedback (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255),
                    email VARCHAR(255) NOT NULL,
                    screen_time_addiction BOOLEAN DEFAULT false,
                    consumptive_habits BOOLEAN DEFAULT false,
                    inappropriate_content BOOLEAN DEFAULT false,
                    bad_influences BOOLEAN DEFAULT false,
                    safety BOOLEAN DEFAULT false,
                    false_information BOOLEAN DEFAULT false,
                    social_distortion BOOLEAN DEFAULT false,
                    other_concern BOOLEAN DEFAULT false,
                    other_description TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Add indexes
            console.log('Creating indexes...');
            await client.query(`
                CREATE INDEX IF NOT EXISTS user_feedback_created_at_idx 
                ON user_feedback(created_at DESC);
            `);

            await client.query('COMMIT');
            console.log('Migration completed successfully!');

            // Verify table exists and show structure
            const tableInfo = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = 'user_feedback'
                ORDER BY ordinal_position;
            `);
            
            console.log('\nTable structure:');
            console.table(tableInfo.rows);

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error creating table:', err);
        console.error('Full error:', err.stack);
    } finally {
        await pool.end();
    }
}

createUserFeedbackTable();