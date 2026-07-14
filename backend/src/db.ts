// ============================================================
// db.ts - the one place the backend talks to PostgreSQL from.
//
// A "Pool" is a set of reusable database connections. Opening a
// connection is slow, so instead of connecting for every request
// the pool keeps a few open and hands them out as needed.
// Every other file imports { pool } from here, so if the
// database location changes only .env has to change (NFR07).
// ============================================================

import { Pool } from 'pg';
import dotenv from 'dotenv';

// load DATABASE_URL and PORT from the .env file
dotenv.config();

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Small helper so route files can run a query in one line.
// The $1/$2 placeholders in queries keep user input SEPARATE
// from the SQL command - this is what blocks SQL injection
// (NFR05: "typing tricks into the boxes" can't reach the DB).
export function query(text: string, params?: unknown[]) {
    return pool.query(text, params);
}
