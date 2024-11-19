// db-test.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

async function testConnection() {
    try {
        // Try to connect
        const client = await pool.connect();
        console.log('✅ Successfully connected to the database');

        // Test a simple query
        const result = await client.query('SELECT NOW()');
        console.log('✅ Successfully executed test query');
        console.log('📅 Current database time:', result.rows[0].now);

        // Test our table
        const tableTest = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'user_feedback'
            );
        `);
        
        if (tableTest.rows[0].exists) {
            console.log('✅ user_feedback table exists');
        } else {
            console.log('❌ user_feedback table not found');
        }

        client.release();
        await pool.end();
        
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
        if (err.code === 'ECONNREFUSED') {
            console.log('\n🔍 Possible issues:');
            console.log('1. Is PostgreSQL running?');
            console.log('2. Check your database credentials in .env');
            console.log('3. Verify PostgreSQL is running on the specified port');
        }
        process.exit(1);
    }
}

testConnection();