// db/index.js
require('dotenv').config();
const { Pool } = require('pg');

class DatabaseError extends Error {
    constructor(message, code, detail) {
        super(message);
        this.name = 'DatabaseError';
        this.code = code;
        this.detail = detail;
    }
}

class Database {
    constructor() {
        const isProduction = process.env.NODE_ENV === 'production';
        
        // Configure connection based on environment
        const connectionConfig = isProduction ? {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        } : {
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT
        };

        this.pool = new Pool({
            ...connectionConfig,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        this.pool.on('error', (err, client) => {
            console.error('Unexpected error on idle client', err);
        });
    }

    // Rest of your methods remain the same
    async query(text, params, retries = 3) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(text, params);
            return result;
        } catch (err) {
            if (retries > 0 && this.isRetryableError(err)) {
                console.log(`Retrying query, ${retries} attempts remaining`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.query(text, params, retries - 1);
            }
            throw new DatabaseError(
                err.message,
                err.code,
                this.getErrorDetail(err)
            );
        } finally {
            client.release();
        }
    }

    async transaction(callback) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw new DatabaseError(
                'Transaction failed: ' + err.message,
                err.code,
                this.getErrorDetail(err)
            );
        } finally {
            client.release();
        }
    }

    isRetryableError(err) {
        const retryableCodes = [
            '40001',
            '40P01',
            '55P03',
            'XX000',
            '08006',
        ];
        return retryableCodes.includes(err.code);
    }

    getErrorDetail(err) {
        switch (err.code) {
            case '23505': return 'Duplicate entry';
            case '23503': return 'Referenced record does not exist';
            case '23502': return 'Required field is missing';
            default: return err.detail || 'No additional details';
        }
    }

    async end() {
        await this.pool.end();
    }
}

module.exports = new Database();