import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { pool } from '@/lib/db';
import { TiptapRenderer } from '@/components/tiptap-renderer';
import { ShareToggle } from '@/components/share-toggle';
import { NoteActions } from './note-actions';

type Params = Promise<{ id: string }>;

interface Note {
  id: string;
  user_id: string;
  title: string;
  content_json: string;
  is_public: boolean;
  public_slug: string | null;
  created_at: Date;
  updated_at: Date;
}

export default async function NoteViewer({ params }: { params: Params }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/authenticate');
  }

  const { id } = await params;

  const { rows } = await pool.query<Note>('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [
    id,
    session.user.id,
  ]);
  const note = rows[0];

  if (!note) {
    notFound();
  }

  return (
    <div className='p-8 max-w-3xl mx-auto'>
      <Link href='/dashboard' className='text-blue-600 hover:underline mb-4 inline-block'>
        &larr; Back to Dashboard
      </Link>

      <div className='mb-6'>
        <div className='flex items-start justify-between gap-4'>
          <h1 className='text-3xl font-bold mb-2'>{note.title}</h1>
          <NoteActions noteId={note.id} />
        </div>
        <div className='flex items-center gap-4 text-sm text-foreground/60'>
          <span>Updated: {note.updated_at.toLocaleDateString()}</span>
          <span
            className={note.is_public ? 'text-green-600 dark:text-green-400' : 'text-foreground/40'}
          >
            {note.is_public ? 'Public' : 'Private'}
          </span>
        </div>
      </div>

      <div className='border-t border-border pt-6'>
        <TiptapRenderer content={note.content_json} />
      </div>

      <ShareToggle
        noteId={note.id}
        initialIsPublic={note.is_public}
        initialSlug={note.public_slug}
      />
    </div>
  );
}
