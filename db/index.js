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
        this.pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            // Add some reasonable defaults for production
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
            connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection not established
        });

        // Error handling for the pool itself
        this.pool.on('error', (err, client) => {
            console.error('Unexpected error on idle client', err);
        });
    }

    async query(text, params, retries = 3) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(text, params);
            return result;
        } catch (err) {
            if (retries > 0 && this.isRetryableError(err)) {
                console.log(`Retrying query, ${retries} attempts remaining`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
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
            '40001', // serialization failure
            '40P01', // deadlock detected
            '55P03', // lock not available
            'XX000', // internal error
            '08006', // connection failure
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