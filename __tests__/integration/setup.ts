import { execSync } from 'child_process';
import path from 'path';

export async function setup() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL must be set to run integration tests');

  const migratePath = path.resolve(process.cwd(), 'scripts/migrate.sql');
  execSync(`psql "${dbUrl}" -f "${migratePath}"`, { stdio: 'inherit' });
}
