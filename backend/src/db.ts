// the database connection pool (NFR07)

import { Pool } from 'pg';
import dotenv from 'dotenv';

// load settings from .env
dotenv.config();

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    // the cloud database needs SSL, the local one doesn't
    ssl: process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
});

// run a query. $1 placeholders stop SQL injection (NFR05)
export function query(text: string, params?: unknown[]) {
    return pool.query(text, params);
}
