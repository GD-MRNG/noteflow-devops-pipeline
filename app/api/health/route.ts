import { pool } from '@/lib/db';
import { logger } from '@/lib/logger';
import { httpRequestDuration, httpRequestsTotal } from '@/lib/metrics';

export async function GET() {
  const end = httpRequestDuration.startTimer({ method: 'GET', route: '/api/health' });
  try {
    await pool.query('SELECT 1');
    logger.info('health check ok');
    httpRequestsTotal.inc({ method: 'GET', route: '/api/health', status: '200' });
    end({ status: '200' });
    return Response.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, 'health check failed');
    httpRequestsTotal.inc({ method: 'GET', route: '/api/health', status: '503' });
    end({ status: '503' });
    return Response.json(
      { status: 'error', db: 'error', timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
