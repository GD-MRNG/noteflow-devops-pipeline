import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { pool } from '@/lib/db';

interface Note {
  id: string;
  title: string;
  is_public: boolean;
  updated_at: Date;
}

export default async function Dashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/authenticate');
  }

  const { rows: notes } = await pool.query<Note>(
    'SELECT id, title, is_public, updated_at FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
    [session.user.id],
  );

  return (
    <div className='p-8'>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold'>Dashboard</h1>
        <Link
          href='/notes/new'
          className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700'
        >
          New Note
        </Link>
      </div>

      {notes.length === 0 ? (
        <p className='text-foreground/60'>Your notes will appear here.</p>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {notes.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className='block p-4 border border-border rounded-lg hover:bg-foreground/5 transition-colors'
            >
              <h2 className='font-semibold mb-2 truncate'>{note.title}</h2>
              <div className='flex items-center justify-between text-sm text-foreground/60'>
                <span>{note.updated_at.toLocaleDateString()}</span>
                <span
                  className={
                    note.is_public ? 'text-green-600 dark:text-green-400' : 'text-foreground/40'
                  }
                >
                  {note.is_public ? 'Public' : 'Private'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
