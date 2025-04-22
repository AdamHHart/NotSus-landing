// File: migrations/runner.js
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function runMigrations() {
    // Configure SSL for all environments
    // This is crucial for connecting to PostgreSQL services like Render, Heroku, etc.
    const sslConfig = {
        rejectUnauthorized: false  // This allows self-signed certificates
    };

    // Create pool with SSL config
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: sslConfig
    });

    try {
        // Test database connection
        await pool.query('SELECT NOW()');
        console.log('Database connection successful');

        // Create migrations table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Migrations table checked/created');

        // Get all migration files
        const migrationFiles = await fs.readdir(__dirname);
        const migrations = migrationFiles
            .filter(f => f.endsWith('.js') && f !== 'runner.js')
            .sort();

        console.log('Found migrations:', migrations);

        // Run migrations in order
        for (const migrationFile of migrations) {
            console.log(`Checking migration: ${migrationFile}`);
            
            const result = await pool.query(
                'SELECT id FROM migrations WHERE name = $1',
                [migrationFile]
            );

            if (result.rows.length === 0) {
                console.log(`Running migration: ${migrationFile}`);
                const migration = require(path.join(__dirname, migrationFile));
                
                if (typeof migration.up !== 'function') {
                    throw new Error(`Migration ${migrationFile} does not export an 'up' function`);
                }

                await migration.up(pool);
                await pool.query(
                    'INSERT INTO migrations (name) VALUES ($1)',
                    [migrationFile]
                );
                console.log(`Completed migration: ${migrationFile}`);
            } else {
                console.log(`Skipping already executed migration: ${migrationFile}`);
            }
        }

        console.log('All migrations completed successfully');
    } catch (err) {
        console.error('Migration failed:', {
            message: err.message,
            stack: err.stack,
            code: err.code,
            detail: err.detail
        });
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations().catch(err => {
    console.error('Unhandled error in migrations:', err);
    process.exit(1);
});