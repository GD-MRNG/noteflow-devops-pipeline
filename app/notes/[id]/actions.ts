'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { pool } from '@/lib/db';
import { toggleSharingSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { noteOperationsTotal } from '@/lib/metrics';

export async function deleteNote(formData: FormData): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/authenticate');
  }

  const noteId = formData.get('noteId');
  if (typeof noteId !== 'string') {
    return;
  }

  await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [noteId, session.user.id]);
  noteOperationsTotal.inc({ operation: 'delete' });
  logger.info({ noteId, userId: session.user.id }, 'note deleted');

  redirect('/dashboard');
}

interface ToggleSharingResult {
  success: boolean;
  error?: string;
  isPublic?: boolean;
  slug?: string | null;
}

export async function toggleSharing(
  _prevState: ToggleSharingResult,
  formData: FormData,
): Promise<ToggleSharingResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const parsed = toggleSharingSchema.safeParse({
    noteId: formData.get('noteId'),
    enable: formData.get('enable'),
  });

  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  const { noteId, enable } = parsed.data;

  // Verify ownership
  const { rows } = await pool.query<{ id: string; public_slug: string | null }>(
    'SELECT id, public_slug FROM notes WHERE id = $1 AND user_id = $2',
    [noteId, session.user.id],
  );
  const note = rows[0];

  if (!note) {
    return { success: false, error: 'Note not found' };
  }

  let slug = note.public_slug;

  if (enable && !slug) {
    slug = nanoid(16);
    await pool.query('UPDATE notes SET is_public = TRUE, public_slug = $1 WHERE id = $2', [
      slug,
      noteId,
    ]);
  } else if (enable) {
    await pool.query('UPDATE notes SET is_public = TRUE WHERE id = $1', [noteId]);
  } else {
    await pool.query('UPDATE notes SET is_public = FALSE WHERE id = $1', [noteId]);
  }

  logger.info({ noteId, userId: session.user.id, isPublic: enable }, 'note sharing toggled');
  return { success: true, isPublic: enable, slug };
}
