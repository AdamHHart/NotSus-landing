// scripts/check-db-schema.js

require('dotenv').config();
const { Pool } = require('pg');

async function checkDatabaseSchema() {
    // Configure SSL for all environments
    const sslConfig = {
        rejectUnauthorized: false
    };

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: sslConfig
    });

    try {
        const client = await pool.connect();
        console.log('Connected to database successfully');

        // Check for user_feedback table and gains_description column
        console.log('\n1. Checking user_feedback table...');
        const userFeedbackCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'user_feedback'
            );
        `);
        
        if (userFeedbackCheck.rows[0].exists) {
            console.log('✅ user_feedback table exists');
            
            const gainsDescriptionCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                AND table_name = 'user_feedback' 
                AND column_name = 'gains_description'
            `);
            
            if (gainsDescriptionCheck.rows.length > 0) {
                console.log('✅ gains_description column exists in user_feedback table');
            } else {
                console.log('❌ gains_description column is MISSING in user_feedback table');
            }
            
            // Show all columns in user_feedback
            const userFeedbackColumns = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                AND table_name = 'user_feedback' 
                ORDER BY ordinal_position
            `);
            
            console.log('\nuser_feedback columns:');
            console.table(userFeedbackColumns.rows);
        } else {
            console.log('❌ user_feedback table does NOT exist');
        }

        // Check for download_tracking table
        console.log('\n2. Checking download_tracking table...');
        const downloadTrackingCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'download_tracking'
            );
        `);
        
        if (downloadTrackingCheck.rows[0].exists) {
            console.log('✅ download_tracking table exists');
            
            // Show all columns in download_tracking
            const downloadTrackingColumns = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                AND table_name = 'download_tracking' 
                ORDER BY ordinal_position
            `);
            
            console.log('\ndownload_tracking columns:');
            console.table(downloadTrackingColumns.rows);
            
            // Check indexes for download_tracking
            const downloadTrackingIndexes = await client.query(`
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'download_tracking'
                ORDER BY indexname
            `);
            
            console.log('\ndownload_tracking indexes:');
            console.table(downloadTrackingIndexes.rows);
        } else {
            console.log('❌ download_tracking table does NOT exist');
        }

        // Check for app_downloads table
        console.log('\n3. Checking app_downloads table...');
        const appDownloadsCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'app_downloads'
            );
        `);
        
        if (appDownloadsCheck.rows[0].exists) {
            console.log('✅ app_downloads table exists');
            
            // Check for new columns in app_downloads
            const downloadStatusCheck = await client.query(`
                SELECT column_name
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                AND table_name = 'app_downloads' 
                AND column_name IN ('download_status', 'browser_info')
            `);
            
            const hasDownloadStatus = downloadStatusCheck.rows.find(r => r.column_name === 'download_status');
            const hasBrowserInfo = downloadStatusCheck.rows.find(r => r.column_name === 'browser_info');
            
            console.log(`${hasDownloadStatus ? '✅' : '❌'} download_status column ${hasDownloadStatus ? 'exists' : 'is MISSING'} in app_downloads table`);
            console.log(`${hasBrowserInfo ? '✅' : '❌'} browser_info column ${hasBrowserInfo ? 'exists' : 'is MISSING'} in app_downloads table`);
            
            // Show all columns in app_downloads
            const appDownloadsColumns = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                AND table_name = 'app_downloads' 
                ORDER BY ordinal_position
            `);
            
            console.log('\napp_downloads columns:');
            console.table(appDownloadsColumns.rows);
        } else {
            console.log('❌ app_downloads table does NOT exist');
        }

        // Check for migrations table and our migration
        console.log('\n4. Checking migrations history...');
        const migrationsCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'migrations'
            );
        `);
        
        if (migrationsCheck.rows[0].exists) {
            console.log('✅ migrations table exists');
            
            // Check if our migration has been run
            const ourMigrationCheck = await client.query(`
                SELECT * FROM migrations
                WHERE name LIKE '%download_tracking%'
                ORDER BY executed_at DESC
            `);
            
            if (ourMigrationCheck.rows.length > 0) {
                console.log(`✅ Found download tracking migration: ${ourMigrationCheck.rows[0].name}`);
                console.log(`   Executed at: ${ourMigrationCheck.rows[0].executed_at}`);
            } else {
                console.log('❌ No download tracking migration found in the migrations table');
            }
            
            // Show recent migrations
            const recentMigrations = await client.query(`
                SELECT name, executed_at FROM migrations
                ORDER BY executed_at DESC
                LIMIT 5
            `);
            
            console.log('\nRecent migrations:');
            console.table(recentMigrations.rows);
        } else {
            console.log('❌ migrations table does NOT exist');
        }

        client.release();
    } catch (err) {
        console.error('Error checking database schema:', err);
    } finally {
        await pool.end();
    }
}

console.log('Starting database schema check...');
checkDatabaseSchema()
    .then(() => console.log('\nDatabase schema check complete.'))
    .catch(err => console.error('Failed to check database schema:', err));