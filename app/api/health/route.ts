import { pool } from '@/lib/db';

export async function GET() {
  try {
    await pool.query('SELECT 1');
    return Response.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch {
    return Response.json(
      { status: 'error', db: 'error', timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
