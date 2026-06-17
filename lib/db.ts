import { Pool } from 'pg';
import { dbQueryDuration } from '@/lib/metrics';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query<T extends object>(sql: string, params?: unknown[]) {
  const end = dbQueryDuration.startTimer({
    operation: sql.trimStart().split(' ')[0].toLowerCase(),
  });
  try {
    return await pool.query<T>(sql, params);
  } finally {
    end();
  }
}
