import { pool } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    await pool.query('SELECT 1');
    logger.info('health check ok');
    return Response.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, 'health check failed');
    return Response.json(
      { status: 'error', db: 'error', timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
