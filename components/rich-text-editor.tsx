'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { parseContent } from '@/lib/content';

interface RichTextEditorProps {
  content?: string;
  onUpdate?: (json: object) => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, children }: ToolbarButtonProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`px-2 py-1 text-sm font-medium rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
        isActive ? 'bg-gray-200 dark:bg-gray-700' : ''
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className='flex flex-wrap gap-1 p-2 border border-border rounded-t-lg border-b-0'>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
      >
        I
      </ToolbarButton>

      <span className='w-px bg-border mx-1' />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        isActive={editor.isActive('paragraph')}
      >
        P
      </ToolbarButton>

      <span className='w-px bg-border mx-1' />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
      >
        List
      </ToolbarButton>

      <span className='w-px bg-border mx-1' />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
      >
        Code
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
      >
        Block
      </ToolbarButton>

      <span className='w-px bg-border mx-1' />

      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        HR
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({ content, onUpdate }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: parseContent(content),
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[200px] p-4 border border-border rounded-t-none rounded-b-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
      },
    },
  });

  if (!editor) return null;

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
