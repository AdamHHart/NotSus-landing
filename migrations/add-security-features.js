// File: migrations/add_security_features.js

const up = async (pool) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // Add security-related columns
        await client.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE;
        `);

        // Add indexes for performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_password_updated 
            ON users(password_updated_at);
            
            CREATE INDEX IF NOT EXISTS idx_users_login_attempts 
            ON users(failed_login_attempts) 
            WHERE failed_login_attempts > 0;
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