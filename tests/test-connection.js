require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Attempting to connect to database...');
        console.log('Database URL:', process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')); // Hide password
        
        const client = await pool.connect();
        console.log('Successfully connected to database!');
        
        const result = await client.query('SELECT current_database(), current_user, version();');
        console.log('\nDatabase information:');
        console.log('Current database:', result.rows[0].current_database);
        console.log('Current user:', result.rows[0].current_user);
        console.log('PostgreSQL version:', result.rows[0].version);
        
        client.release();
    } catch (err) {
        console.error('Error connecting to database:', err);
        console.error('\nTroubleshooting tips:');
        console.error('1. Check if the database URL is correct');
        console.error('2. Verify the database service is running in Render');
        console.error('3. Ensure your IP is allowed in the database firewall settings');
        console.error('4. Check if the database credentials are correct');
    } finally {
        await pool.end();
    }
}

testConnection();