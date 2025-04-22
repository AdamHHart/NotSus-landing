// migrations/add_download_tracking.js

const up = async (pool) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // First, check if user_feedback table needs the gains_description column
        const checkGainsDescriptionColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_feedback' 
            AND column_name = 'gains_description'
        `);
        
        if (checkGainsDescriptionColumn.rows.length === 0) {
            console.log('Adding gains_description column to user_feedback table');
            await client.query(`
                ALTER TABLE user_feedback
                ADD COLUMN gains_description TEXT;
            `);
        }
        
        // Create download_tracking table
        await client.query(`
            CREATE TABLE IF NOT EXISTS download_tracking (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255),
                platform VARCHAR(50) NOT NULL,
                action VARCHAR(50) NOT NULL,
                browser_name VARCHAR(100),
                browser_version VARCHAR(50),
                os_name VARCHAR(100),
                os_version VARCHAR(50),
                user_agent TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Add indexes for better query performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_download_tracking_email ON download_tracking(email);
            CREATE INDEX IF NOT EXISTS idx_download_tracking_platform ON download_tracking(platform);
            CREATE INDEX IF NOT EXISTS idx_download_tracking_action ON download_tracking(action);
            CREATE INDEX IF NOT EXISTS idx_download_tracking_created_at ON download_tracking(created_at);
        `);

        // Update app_downloads table to add new fields if it exists
        const checkAppDownloadsTable = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'app_downloads'
            );
        `);
        
        if (checkAppDownloadsTable.rows[0].exists) {
            // Modify app_downloads to add new status column
            await client.query(`
                ALTER TABLE app_downloads
                ADD COLUMN IF NOT EXISTS download_status VARCHAR(50) DEFAULT 'initiated',
                ADD COLUMN IF NOT EXISTS browser_info JSONB;
            `);
        } else {
            // Create app_downloads table if it doesn't exist
            await client.query(`
                CREATE TABLE app_downloads (
                    id SERIAL PRIMARY KEY,
                    platform VARCHAR(50) NOT NULL,
                    email VARCHAR(255),
                    download_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    user_agent TEXT,
                    ip_address VARCHAR(50),
                    download_status VARCHAR(50) DEFAULT 'initiated',
                    browser_info JSONB
                );
                
                CREATE INDEX idx_app_downloads_email ON app_downloads(email);
                CREATE INDEX idx_app_downloads_platform ON app_downloads(platform);
                CREATE INDEX idx_app_downloads_download_time ON app_downloads(download_time);
            `);
        }

        await client.query('COMMIT');
        console.log('Migration completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        throw err;
    } finally {
        client.release();
    }
};

const down = async (pool) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Drop the download_tracking table
        await client.query('DROP TABLE IF EXISTS download_tracking');
        
        // Remove the columns added to app_downloads
        await client.query(`
            ALTER TABLE app_downloads 
            DROP COLUMN IF EXISTS download_status,
            DROP COLUMN IF EXISTS browser_info;
        `);
        
        // Remove the gains_description column from user_feedback
        await client.query(`
            ALTER TABLE user_feedback
            DROP COLUMN IF EXISTS gains_description;
        `);
        
        await client.query('COMMIT');
        console.log('Rollback completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Rollback failed:', err);
        throw err;
    } finally {
        client.release();
    }
};

module.exports = { up, down };