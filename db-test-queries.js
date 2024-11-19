// db-test-queries.js
require('dotenv').config();
const db = require('./db');

async function checkDatabase() {
    try {
        // Check users table
        console.log('\n📊 Checking Users:');
        const users = await db.query('SELECT id, email, is_admin, created_at FROM users');
        console.table(users.rows);

        // Check feedback submissions
        console.log('\n📝 Checking Feedback Submissions:');
        const feedback = await db.query(`
            SELECT 
                f.id,
                f.email,
                f.screen_time_addiction,
                f.consumptive_habits,
                f.inappropriate_content,
                f.bad_influences,
                f.safety,
                f.false_information,
                f.social_distortion,
                f.other_concern,
                f.other_description,
                f.created_at,
                u.email as user_email
            FROM user_feedback f
            LEFT JOIN users u ON f.user_id = u.id
            ORDER BY f.created_at DESC
            LIMIT 5
        `);
        console.table(feedback.rows);

    } catch (err) {
        console.error('Error checking database:', err);
    } finally {
        await db.end();
    }
}

checkDatabase();