'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { pool } from '@/lib/db';
import { sanitizeContent, stripHtml } from '@/lib/sanitize';
import { updateNoteSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { noteOperationsTotal } from '@/lib/metrics';

export type ActionResult = {
  success?: boolean;
  error?: {
    id?: string[];
    title?: string[];
    content_json?: string[];
    general?: string;
  };
};

export async function updateNote(formData: FormData): Promise<ActionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/authenticate');
  }

  const result = updateNoteSchema.safeParse({
    id: formData.get('id'),
    title: formData.get('title'),
    content_json: formData.get('content_json'),
  });

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { id, title, content_json } = result.data;
  const sanitizedTitle = stripHtml(title);
  const sanitizedContent = sanitizeContent(content_json);

  try {
    const result = await pool.query(
      'UPDATE notes SET title = $1, content_json = $2 WHERE id = $3 AND user_id = $4',
      [sanitizedTitle, sanitizedContent, id, session.user.id],
    );

    if ((result.rowCount ?? 0) === 0) {
      return { error: { general: 'Note not found or access denied.' } };
    }

    noteOperationsTotal.inc({ operation: 'update' });
    logger.info({ noteId: id, userId: session.user.id }, 'note updated');
  } catch (err) {
    logger.error({ err, noteId: id, userId: session.user.id }, 'failed to update note');
    return { error: { general: 'Failed to update note. Please try again.' } };
  }

  redirect(`/notes/${id}`);
}
