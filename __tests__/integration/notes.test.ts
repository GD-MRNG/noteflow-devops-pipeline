import { randomUUID } from 'crypto';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { pool } from '@/lib/db';

const testUserId = randomUUID();
const testEmail = `integration-test-${testUserId}@example.com`;

beforeAll(async () => {
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, false, NOW(), NOW())`,
    [testUserId, 'Integration Test User', testEmail]
  );
});

afterAll(async () => {
  await pool.query('DELETE FROM "user" WHERE id = $1', [testUserId]);
  await pool.end();
});

beforeEach(async () => {
  await pool.query('DELETE FROM notes WHERE user_id = $1', [testUserId]);
});

describe('notes — insert and retrieve', () => {
  it('inserts a note and reads it back', async () => {
    const id = randomUUID();
    await pool.query(
      'INSERT INTO notes (id, user_id, title, content_json) VALUES ($1, $2, $3, $4)',
      [id, testUserId, 'Hello World', '{"type":"doc"}']
    );
    const { rows } = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Hello World');
    expect(rows[0].content_json).toBe('{"type":"doc"}');
    expect(rows[0].is_public).toBe(false);
    expect(rows[0].public_slug).toBeNull();
    expect(rows[0].created_at).toBeInstanceOf(Date);
  });
});

describe('notes — update', () => {
  it('updates title and content', async () => {
    const id = randomUUID();
    await pool.query(
      'INSERT INTO notes (id, user_id, title, content_json) VALUES ($1, $2, $3, $4)',
      [id, testUserId, 'Original', '{}']
    );
    await pool.query(
      'UPDATE notes SET title = $1, content_json = $2 WHERE id = $3 AND user_id = $4',
      ['Updated', '{"type":"doc","content":[]}', id, testUserId]
    );
    const { rows } = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    expect(rows[0].title).toBe('Updated');
    expect(rows[0].updated_at).toBeInstanceOf(Date);
  });
});

describe('notes — delete', () => {
  it('deletes a note by id and owner', async () => {
    const id = randomUUID();
    await pool.query(
      'INSERT INTO notes (id, user_id, title, content_json) VALUES ($1, $2, $3, $4)',
      [id, testUserId, 'To Delete', '{}']
    );
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2',
      [id, testUserId]
    );
    expect(result.rowCount).toBe(1);
    const { rows } = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    expect(rows).toHaveLength(0);
  });

  it('does not delete a note owned by another user', async () => {
    const id = randomUUID();
    await pool.query(
      'INSERT INTO notes (id, user_id, title, content_json) VALUES ($1, $2, $3, $4)',
      [id, testUserId, 'Not Yours', '{}']
    );
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2',
      [id, randomUUID()]
    );
    expect(result.rowCount).toBe(0);
    const { rows } = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    expect(rows).toHaveLength(1);
  });
});

describe('notes — public sharing', () => {
  it('enables sharing with a slug and retrieves by slug', async () => {
    const id = randomUUID();
    const slug = 'test-slug-' + randomUUID().slice(0, 8);
    await pool.query(
      'INSERT INTO notes (id, user_id, title, content_json) VALUES ($1, $2, $3, $4)',
      [id, testUserId, 'Public Note', '{}']
    );
    await pool.query(
      'UPDATE notes SET is_public = true, public_slug = $1 WHERE id = $2 AND user_id = $3',
      [slug, id, testUserId]
    );
    const { rows } = await pool.query(
      'SELECT * FROM notes WHERE public_slug = $1 AND is_public = true',
      [slug]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].is_public).toBe(true);
    expect(rows[0].public_slug).toBe(slug);
  });

  it('disables sharing and clears the slug', async () => {
    const id = randomUUID();
    const slug = 'temp-slug-' + randomUUID().slice(0, 8);
    await pool.query(
      'INSERT INTO notes (id, user_id, title, content_json, is_public, public_slug) VALUES ($1, $2, $3, $4, true, $5)',
      [id, testUserId, 'Was Public', '{}', slug]
    );
    await pool.query(
      'UPDATE notes SET is_public = false, public_slug = NULL WHERE id = $1 AND user_id = $2',
      [id, testUserId]
    );
    const { rows } = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    expect(rows[0].is_public).toBe(false);
    expect(rows[0].public_slug).toBeNull();
  });
});

describe('notes — user isolation', () => {
  it('only returns notes belonging to the querying user', async () => {
    const otherId = randomUUID();
    await pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, false, NOW(), NOW())`,
      [otherId, 'Other User', `other-${otherId}@example.com`]
    );

    await pool.query(
      'INSERT INTO notes (id, user_id, title, content_json) VALUES ($1, $2, $3, $4)',
      [randomUUID(), testUserId, 'My Note', '{}']
    );
    await pool.query(
      'INSERT INTO notes (id, user_id, title, content_json) VALUES ($1, $2, $3, $4)',
      [randomUUID(), otherId, 'Not My Note', '{}']
    );

    const { rows } = await pool.query(
      'SELECT * FROM notes WHERE user_id = $1',
      [testUserId]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('My Note');

    await pool.query('DELETE FROM "user" WHERE id = $1', [otherId]);
  });
});
