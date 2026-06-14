'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { toggleSharingSchema } from '@/lib/validation';

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

  db.run('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, session.user.id]);

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
  const note = db
    .query<{ id: string; public_slug: string | null }, [string, string]>(
      'SELECT id, public_slug FROM notes WHERE id = ? AND user_id = ?',
    )
    .get(noteId, session.user.id);

  if (!note) {
    return { success: false, error: 'Note not found' };
  }

  let slug = note.public_slug;

  if (enable && !slug) {
    slug = nanoid(16);
    db.run('UPDATE notes SET is_public = 1, public_slug = ? WHERE id = ?', [slug, noteId]);
  } else if (enable) {
    db.run('UPDATE notes SET is_public = 1 WHERE id = ?', [noteId]);
  } else {
    db.run('UPDATE notes SET is_public = 0 WHERE id = ?', [noteId]);
  }

  return { success: true, isPublic: enable, slug };
}
