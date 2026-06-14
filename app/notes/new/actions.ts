'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sanitizeContent, stripHtml } from '@/lib/sanitize';
import { createNoteSchema } from '@/lib/validation';

export type ActionResult = {
  success?: boolean;
  error?: {
    title?: string[];
    content_json?: string[];
    general?: string;
  };
};

export async function createNote(formData: FormData): Promise<ActionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/authenticate');
  }

  const result = createNoteSchema.safeParse({
    title: formData.get('title'),
    content_json: formData.get('content_json'),
  });

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { title, content_json } = result.data;
  const sanitizedTitle = stripHtml(title);
  const sanitizedContent = sanitizeContent(content_json);
  const id = crypto.randomUUID();

  try {
    db.run(`INSERT INTO notes (id, user_id, title, content_json) VALUES (?, ?, ?, ?)`, [
      id,
      session.user.id,
      sanitizedTitle,
      sanitizedContent,
    ]);
  } catch {
    return { error: { general: 'Failed to create note. Please try again.' } };
  }

  redirect(`/notes/${id}`);
}
