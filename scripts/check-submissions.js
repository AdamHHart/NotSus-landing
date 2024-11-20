// File: scripts/check-submissions.js

require('dotenv').config();
const { Pool } = require('pg');

async function checkSubmissions() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        
        // Get recent submissions
        console.log('Fetching recent submissions...');
        const submissions = await client.query(`
            SELECT 
                id,
                name,
                contact_info,
                message,
                created_at
            FROM submissions
            ORDER BY created_at DESC
            LIMIT 5;
        `);
        
        console.log('\nMost recent submissions:');
        if (submissions.rows.length === 0) {
            console.log('No submissions found in the database.');
        } else {
            console.table(submissions.rows);
        }

        // Get total count
        const countResult = await client.query(`
            SELECT COUNT(*) FROM submissions;
        `);
        
        console.log(`\nTotal submissions in database: ${countResult.rows[0].count}`);
        
        client.release();
    } catch (err) {
        console.error('Error checking submissions:', err);
        console.error('Full error:', err.stack);
    } finally {
        await pool.end();
    }
}

checkSubmissions();