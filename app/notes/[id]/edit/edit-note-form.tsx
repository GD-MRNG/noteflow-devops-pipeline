'use client';

import { useRef, useActionState } from 'react';
import { RichTextEditor } from '@/components/rich-text-editor';
import { updateNote, type ActionResult } from './actions';

interface EditNoteFormProps {
  note: {
    id: string;
    title: string;
    content_json: string;
  };
}

export function EditNoteForm({ note }: EditNoteFormProps) {
  const contentRef = useRef<string>(note.content_json);

  const handleSubmit = async (
    _prevState: ActionResult | null,
    formData: FormData,
  ): Promise<ActionResult> => {
    formData.set('content_json', contentRef.current);
    return await updateNote(formData);
  };

  const [state, formAction, isPending] = useActionState(handleSubmit, null);

  return (
    <form action={formAction} className='space-y-4'>
      <input type='hidden' name='id' value={note.id} />

      {state?.error?.general && (
        <div className='p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg'>
          {state.error.general}
        </div>
      )}

      <div>
        <label htmlFor='title' className='block text-sm font-medium mb-1'>
          Title
        </label>
        <input
          type='text'
          id='title'
          name='title'
          required
          defaultValue={note.title}
          className='w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
          placeholder='Enter note title...'
        />
        {state?.error?.title && <p className='mt-1 text-sm text-red-600'>{state.error.title[0]}</p>}
      </div>

      <div>
        <label className='block text-sm font-medium mb-1'>Content</label>
        <RichTextEditor
          content={note.content_json}
          onUpdate={(json) => {
            contentRef.current = JSON.stringify(json);
          }}
        />
        {state?.error?.content_json && (
          <p className='mt-1 text-sm text-red-600'>{state.error.content_json[0]}</p>
        )}
      </div>

      <button
        type='submit'
        disabled={isPending}
        className='bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
      >
        {isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
