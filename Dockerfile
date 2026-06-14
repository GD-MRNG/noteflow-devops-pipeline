# Stage 1: Install dependencies
# Pin digest in production: docker pull oven/bun:1-alpine && docker inspect --format='{{index .RepoDigests 0}}'
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Build the Next.js app
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL is not needed at build time — Next.js standalone traces
# modules without connecting. Pass a placeholder to satisfy any startup check.
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
RUN bun run build

# Stage 3: Minimal production runtime (Node.js, not Bun — standalone output targets Node)
# Pin digest in production: docker pull node:22-alpine && docker inspect --format='{{index .RepoDigests 0}}'
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
