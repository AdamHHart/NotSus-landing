// File: scripts/production-migration-runner.js

require('dotenv').config();
const { Pool } = require('pg');

async function runMigrations() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('Connected to database successfully');

        // Start transaction
        await client.query('BEGIN');

        try {
            // Create submissions table if it doesn't exist
            console.log('Creating submissions table...');
            await client.query(`
                CREATE TABLE IF NOT EXISTS submissions (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    contact_info VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Add any indexes we need
            console.log('Creating indexes...');
            await client.query(`
                CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions(created_at DESC);
            `);

            // Commit transaction
            await client.query('COMMIT');
            console.log('Migration completed successfully!');

            // Verify table exists
            const tableCheck = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'submissions'
                );
            `);
            console.log('Submissions table exists:', tableCheck.rows[0].exists);

            // Show table structure
            const tableInfo = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = 'submissions'
                ORDER BY ordinal_position;
            `);
            console.log('\nTable structure:');
            console.table(tableInfo.rows);

        } catch (err) {
            // Rollback transaction on error
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error running migration:', err);
        console.error('Full error:', err.stack);
    } finally {
        await pool.end();
    }
}

runMigrations();