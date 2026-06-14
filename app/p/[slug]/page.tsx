import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { TiptapRenderer } from '@/components/tiptap-renderer';

type Params = Promise<{ slug: string }>;

interface PublicNote {
  title: string;
  content_json: string;
}

export default async function PublicNotePage({ params }: { params: Params }) {
  const { slug } = await params;

  const note = db
    .query<PublicNote, [string]>(
      'SELECT title, content_json FROM notes WHERE public_slug = ? AND is_public = 1',
    )
    .get(slug);

  if (!note) {
    notFound();
  }

  return (
    <div className='p-8 max-w-3xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>{note.title}</h1>
      <div className='border-t border-border pt-6'>
        <TiptapRenderer content={note.content_json} />
      </div>
    </div>
  );
}
