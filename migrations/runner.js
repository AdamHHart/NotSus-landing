// migrations/runner.js
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function runMigrations() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        // Create migrations table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Get all migration files
        const migrationFiles = await fs.readdir(__dirname);
        const migrations = migrationFiles
            .filter(f => f.endsWith('.js') && f !== 'runner.js')
            .sort();

        // Run migrations in order
        for (const migrationFile of migrations) {
            const { up } = require(path.join(__dirname, migrationFile));
            
            const result = await pool.query(
                'SELECT id FROM migrations WHERE name = $1',
                [migrationFile]
            );

            if (result.rows.length === 0) {
                console.log(`Running migration: ${migrationFile}`);
                await up(pool);
                await pool.query(
                    'INSERT INTO migrations (name) VALUES ($1)',
                    [migrationFile]
                );
            }
        }

        console.log('Migrations completed successfully');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations().catch(console.error);