require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Determine the environment (development or production)
const isProduction = process.env.NODE_ENV === 'production';
console.log('Environment:', process.env.NODE_ENV);

// Database configuration based on environment
const dbConfig = isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false, // Allows self-signed certificates
        },
    }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    };

const db = new Pool(dbConfig);

async function createAdminUser(email, password) {
    try {
        // Log the database configuration for debugging
        console.log('Database Config:', isProduction ? process.env.DATABASE_URL : dbConfig);

        // Verify database connection
        const dbCheck = await db.query('SELECT NOW()');
        console.log('Database connected successfully:', dbCheck.rows[0]);

        // Check if the 'users' table exists
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            throw new Error('Users table does not exist - migrations may not have run');
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        // Insert or update the admin user
        const result = await db.query(`
            INSERT INTO users (email, password_hash, is_admin)
            VALUES ($1, $2, true)
            ON CONFLICT (email) 
            DO UPDATE SET password_hash = $2, is_admin = true
            RETURNING id, email, is_admin, created_at
        `, [email, passwordHash]);

        // Check if the insert or update succeeded
        if (result.rows.length === 0) {
            console.error('Admin user was not inserted or updated.');
            throw new Error('Admin user creation failed.');
        }

        console.log('Admin user created/updated successfully:', result.rows[0]);

        // Verify the user was created and exists in the database
        const verify = await db.query('SELECT id, email, is_admin FROM users WHERE email = $1', [email]);
        console.log('Verified user exists:', verify.rows[0]);

    } catch (err) {
        console.error('Error creating admin user:', err.message);
        throw err;
    } finally {
        await db.end();
    }
}

// Retrieve email and password from command line arguments
const [email, password] = process.argv.slice(2);
if (!email || !password) {
    console.log('Usage: node create-admin.js <email> <password>');
    process.exit(1);
}

// Call the function
createAdminUser(email, password)
    .catch(err => {
        console.error('Failed to create admin user');
        process.exit(1);
    });
