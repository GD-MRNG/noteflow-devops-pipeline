'use client';

import { useActionState, useState, useEffect } from 'react';
import { toggleSharing } from '@/app/notes/[id]/actions';

interface ShareToggleProps {
  noteId: string;
  initialIsPublic: boolean;
  initialSlug: string | null;
}

export function ShareToggle({ noteId, initialIsPublic, initialSlug }: ShareToggleProps) {
  const [state, formAction, isPending] = useActionState(toggleSharing, {
    success: true,
    isPublic: initialIsPublic,
    slug: initialSlug,
  });

  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const isPublic = state.isPublic ?? initialIsPublic;
  const slug = state.slug ?? initialSlug;

  const publicUrl = slug && origin ? `${origin}/p/${slug}` : null;

  async function copyToClipboard() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className='border-t border-border pt-6 mt-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='font-medium'>Public Sharing</h3>
          <p className='text-sm text-foreground/60'>
            {isPublic ? 'Anyone with the link can view this note' : 'Only you can view this note'}
          </p>
        </div>
        <form action={formAction}>
          <input type='hidden' name='noteId' value={noteId} />
          <input type='hidden' name='enable' value={isPublic ? 'false' : 'true'} />
          <button
            type='submit'
            disabled={isPending}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isPublic ? 'bg-green-600' : 'bg-foreground/20'
            } ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isPublic ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </form>
      </div>

      {isPublic && publicUrl && (
        <div className='mt-4 flex items-center gap-2'>
          <input
            type='text'
            readOnly
            value={publicUrl}
            className='flex-1 px-3 py-2 bg-foreground/5 border border-border rounded text-sm'
          />
          <button
            type='button'
            onClick={copyToClipboard}
            className='px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors'
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {state.error && <p className='mt-2 text-sm text-red-600'>{state.error}</p>}
    </div>
  );
}
