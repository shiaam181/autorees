import { Pool } from '@neondatabase/serverless';

import path from 'path';
import { fileURLToPath } from 'url';

// Load env since `.env` might not have DATABASE_URL if it's injected
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://...', // wait
});

async function run() {
  console.log('Testing create user...');
  try {
    const res = await pool.query('SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = $1', ['auth_users']);
    console.log('auth_users schema:', res.rows);
  } catch (e) {
    console.error('Error:', e);
  }
}
run();
