import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { toNextJsHandler } from 'better-auth/next-js';

const handler = toNextJsHandler(auth);

export async function GET(req: Request) {
  const res = await handler.GET(req);
  if (!res.ok) logger.warn({ status: res.status, url: req.url }, 'auth GET error');
  return res;
}

export async function POST(req: Request) {
  const res = await handler.POST(req);
  if (!res.ok) {
    const body = await res.clone().text();
    logger.warn({ status: res.status, url: req.url, body }, 'auth POST error');
  }
  return res;
}
