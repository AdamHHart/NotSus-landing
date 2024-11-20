require('dotenv').config();
const db = require('./db');

async function checkAdminUser() {
    try {
        // Check if users table exists
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);
        
        console.log('Users table exists:', tableCheck.rows[0].exists);

        if (tableCheck.rows[0].exists) {
            // Check for admin users
            const adminCheck = await db.query(`
                SELECT id, email, is_admin, created_at 
                FROM users 
                WHERE is_admin = true;
            `);
            
            console.log('\nAdmin users found:', adminCheck.rows.length);
            console.log('Admin details:', adminCheck.rows.map(user => ({
                id: user.id,
                email: user.email,
                created_at: user.created_at
            })));
        }

        // Check current database name
        const dbName = await db.query(`SELECT current_database();`);
        console.log('\nCurrent database:', dbName.rows[0].current_database);

        // Check current schema
        const schemaCheck = await db.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users';
        `);
        
        console.log('\nUsers table schema:');
        console.log(schemaCheck.rows);

    } catch (err) {
        console.error('Error checking database:', err);
    } finally {
        await db.end();
    }
}

checkAdminUser();