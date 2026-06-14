'use client';

import { useRef, useActionState } from 'react';
import { RichTextEditor } from '@/components/rich-text-editor';
import { createNote, type ActionResult } from './actions';

export function NewNoteForm() {
  const contentRef = useRef<string>('{}');

  const handleSubmit = async (
    _prevState: ActionResult | null,
    formData: FormData,
  ): Promise<ActionResult> => {
    formData.set('content_json', contentRef.current);
    return await createNote(formData);
  };

  const [state, formAction, isPending] = useActionState(handleSubmit, null);

  return (
    <form action={formAction} className='space-y-4'>
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
          className='w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
          placeholder='Enter note title...'
        />
        {state?.error?.title && <p className='mt-1 text-sm text-red-600'>{state.error.title[0]}</p>}
      </div>

      <div>
        <label className='block text-sm font-medium mb-1'>Content</label>
        <RichTextEditor
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
        {isPending ? 'Creating...' : 'Create Note'}
      </button>
    </form>
  );
}
