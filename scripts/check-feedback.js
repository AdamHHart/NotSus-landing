// File: scripts/check-feedback.js

require('dotenv').config();
const { Pool } = require('pg');

async function checkFeedback() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        
        console.log('Fetching recent feedback...');
        const feedback = await client.query(`
            SELECT 
                id,
                name,
                email,
                screen_time_addiction,
                consumptive_habits,
                inappropriate_content,
                bad_influences,
                safety,
                false_information,
                social_distortion,
                other_concern,
                other_description,
                created_at
            FROM user_feedback
            ORDER BY created_at DESC
            LIMIT 5;
        `);
        
        console.log('\nMost recent feedback:');
        if (feedback.rows.length === 0) {
            console.log('No feedback found in the database.');
        } else {
            console.table(feedback.rows);
        }

        // Get total count
        const countResult = await client.query(`
            SELECT COUNT(*) FROM user_feedback;
        `);
        
        console.log(`\nTotal feedback entries: ${countResult.rows[0].count}`);
        
        client.release();
    } catch (err) {
        console.error('Error checking feedback:', err);
        console.error('Full error:', err.stack);
    } finally {
        await pool.end();
    }
}

checkFeedback();