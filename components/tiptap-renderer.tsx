import React, { ReactNode } from 'react';

interface TiptapMark {
  type: 'bold' | 'italic' | 'code';
}

interface TiptapTextNode {
  type: 'text';
  text: string;
  marks?: TiptapMark[];
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: (TiptapNode | TiptapTextNode)[];
  text?: string;
  marks?: TiptapMark[];
}

interface TiptapDoc {
  type: 'doc';
  content: TiptapNode[];
}

function renderText(node: TiptapTextNode): ReactNode {
  let result: ReactNode = node.text;

  if (node.marks) {
    for (const mark of node.marks) {
      switch (mark.type) {
        case 'bold':
          result = <strong key='bold'>{result}</strong>;
          break;
        case 'italic':
          result = <em key='italic'>{result}</em>;
          break;
        case 'code':
          result = (
            <code
              key='code'
              className='bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono'
            >
              {result}
            </code>
          );
          break;
      }
    }
  }

  return result;
}

function renderNode(node: TiptapNode | TiptapTextNode, index: number): ReactNode {
  if (node.type === 'text') {
    return <span key={index}>{renderText(node as TiptapTextNode)}</span>;
  }

  const children = (node as TiptapNode).content?.map((child, i) => renderNode(child, i));

  switch (node.type) {
    case 'doc':
      return <>{children}</>;

    case 'paragraph':
      return (
        <p key={index} className='mb-4 leading-relaxed'>
          {children}
        </p>
      );

    case 'heading': {
      const level = (node.attrs?.level as number) || 1;
      const headingClasses: Record<number, string> = {
        1: 'text-3xl font-bold mt-6 mb-4',
        2: 'text-2xl font-bold mt-5 mb-3',
        3: 'text-xl font-bold mt-4 mb-2',
      };
      const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
      return (
        <Tag key={index} className={headingClasses[level] || headingClasses[3]}>
          {children}
        </Tag>
      );
    }

    case 'bulletList':
      return (
        <ul key={index} className='list-disc pl-6 mb-4 space-y-1'>
          {children}
        </ul>
      );

    case 'orderedList':
      return (
        <ol key={index} className='list-decimal pl-6 mb-4 space-y-1'>
          {children}
        </ol>
      );

    case 'listItem':
      return <li key={index}>{children}</li>;

    case 'codeBlock':
      return (
        <pre
          key={index}
          className='bg-gray-200 dark:bg-gray-700 p-4 rounded-lg mb-4 overflow-x-auto'
        >
          <code className='font-mono text-sm'>{children}</code>
        </pre>
      );

    case 'horizontalRule':
      return <hr key={index} className='border-border my-6' />;

    case 'blockquote':
      return (
        <blockquote
          key={index}
          className='border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic mb-4'
        >
          {children}
        </blockquote>
      );

    default:
      return <span key={index}>{children}</span>;
  }
}

export function TiptapRenderer({ content }: { content: string }) {
  let doc: TiptapDoc;

  try {
    doc = JSON.parse(content);
  } catch {
    return <p className='text-red-500'>Failed to parse note content.</p>;
  }

  if (!doc.content) {
    return <p className='text-foreground/60'>No content.</p>;
  }

  return <div className='prose-content'>{renderNode(doc, 0)}</div>;
}
