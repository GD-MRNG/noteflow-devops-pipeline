import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { EditNoteForm } from './edit-note-form';

type Params = Promise<{ id: string }>;

interface Note {
  id: string;
  user_id: string;
  title: string;
  content_json: string;
}

export default async function EditNotePage({ params }: { params: Params }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/authenticate');
  }

  const { id } = await params;

  const note = db
    .query<Note, [string, string]>(
      'SELECT id, user_id, title, content_json FROM notes WHERE id = ? AND user_id = ?',
    )
    .get(id, session.user.id);

  if (!note) {
    notFound();
  }

  return (
    <div className='p-8 max-w-3xl mx-auto'>
      <Link href={`/notes/${id}`} className='text-blue-600 hover:underline mb-4 inline-block'>
        &larr; Back to Note
      </Link>

      <h1 className='text-3xl font-bold mb-6'>Edit Note</h1>

      <EditNoteForm note={note} />
    </div>
  );
}
