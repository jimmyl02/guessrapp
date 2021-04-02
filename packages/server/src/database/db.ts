import { Pool } from 'pg';

const creds = process.env.DATABASE_URL

const pool : Pool = new Pool({
    connectionString: creds
});

export default pool;