import pino from 'pino';

const transport =
  process.env.NODE_ENV === 'production' && process.env.LOKI_URL
    ? pino.transport({
        target: 'pino-loki',
        options: {
          host: process.env.LOKI_URL,
          basicAuth: {
            username: process.env.LOKI_USER ?? '',
            password: process.env.LOKI_PASSWORD ?? '',
          },
          labels: { app: 'noteflow', env: process.env.OTEL_SERVICE_NAME ?? 'staging' },
          batching: true,
          interval: 5,
        },
      })
    : undefined;

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service: 'noteflow' },
  },
  transport,
);
