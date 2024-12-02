// File: migrations/add_password_timestamp.js

const up = async (pool) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Add password_updated_at column
        await client.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        `);

        // Add index for performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_password_updated 
            ON users(password_updated_at);
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = { up };