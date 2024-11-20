require('dotenv').config();
const { Pool } = require('pg');

async function checkSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        
        // Check if users table exists
        console.log('Checking database schema...');
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('Users table does not exist - need to run migrations');
            return;
        }

        console.log('Users table exists!');
        
        // Check table structure
        const schemaCheck = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'users'
            ORDER BY ordinal_position;
        `);
        
        console.log('\nTable structure:');
        console.table(schemaCheck.rows);

        // Check existing users
        const usersCheck = await client.query(`
            SELECT id, email, is_admin, created_at 
            FROM users;
        `);
        
        console.log('\nExisting users:');
        console.table(usersCheck.rows);

        client.release();
    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        await pool.end();
    }
}

checkSchema();