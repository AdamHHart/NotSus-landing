// scripts/add-gains-description.js
require('dotenv').config();
const { Pool } = require('pg');

async function addGainsDescriptionColumn() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('Connected to database successfully');
        
        // Add the column
        await client.query(`
            ALTER TABLE user_feedback
            ADD COLUMN IF NOT EXISTS gains_description TEXT;
        `);
        
        console.log('gains_description column added successfully');
        
        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

addGainsDescriptionColumn();