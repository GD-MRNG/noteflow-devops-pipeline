'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { deleteNote } from './actions';

interface NoteActionsProps {
  noteId: string;
}

export function NoteActions({ noteId }: NoteActionsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <div className='flex gap-2'>
        <Link
          href={`/notes/${noteId}/edit`}
          className='px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700'
        >
          Edit
        </Link>
        <button
          type='button'
          onClick={() => dialogRef.current?.showModal()}
          className='px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700'
        >
          Delete
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className='fixed inset-0 m-auto p-6 rounded-lg backdrop:bg-black/50 max-w-sm bg-white dark:bg-gray-900 text-foreground'
      >
        <h2 className='text-lg font-semibold mb-2'>Delete Note</h2>
        <p className='text-foreground/70 mb-4'>
          Are you sure you want to delete this note? This action cannot be undone.
        </p>
        <div className='flex gap-2 justify-end'>
          <button
            type='button'
            onClick={() => dialogRef.current?.close()}
            className='px-4 py-2 text-sm border border-border rounded-lg bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
          >
            Cancel
          </button>
          <form action={deleteNote}>
            <input type='hidden' name='noteId' value={noteId} />
            <button
              type='submit'
              className='px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700'
            >
              Delete
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
