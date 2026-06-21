import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Retry logic — Render cold starts and Neon serverless can take a few seconds
function connectWithRetry(attempt = 1) {
  pool.connect((err, client, release) => {
    if (err) {
      console.error(`Database connection error (attempt ${attempt}):`, err.message);
      if (attempt < 5) {
        console.log(`Retrying in ${attempt * 2}s...`);
        setTimeout(() => connectWithRetry(attempt + 1), attempt * 2000);
      } else {
        console.error('Database connection failed after 5 attempts');
      }
    } else {
      console.log('Database connected');
      release();
    }
  });
}

connectWithRetry();

export const query = (text, params) => pool.query(text, params);
export { pool };