import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';

import { pool } from './db';

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});
