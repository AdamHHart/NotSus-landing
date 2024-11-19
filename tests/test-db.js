// test-db.js
require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
    const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT
    });

    try {
        const client = await pool.connect();
        console.log('Successfully connected to database');
        const result = await client.query('SELECT NOW()');
        console.log('Current database time:', result.rows[0].now);
        await client.release();
    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await pool.end();
    }
}

testConnection();