import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TiptapRenderer } from '@/components/tiptap-renderer';

describe('TiptapRenderer', () => {
  it('shows error message for invalid JSON', () => {
    render(<TiptapRenderer content='not valid json' />);
    expect(screen.getByText('Failed to parse note content.')).toBeInTheDocument();
  });

  it('shows "No content" for missing content array', () => {
    render(<TiptapRenderer content='{"type":"doc"}' />);
    expect(screen.getByText('No content.')).toBeInTheDocument();
  });

  it('renders paragraphs correctly', () => {
    const content = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    });
    render(<TiptapRenderer content={content} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders headings (H1, H2, H3) with correct tags', () => {
    const content = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Heading 1' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Heading 2' }],
        },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Heading 3' }],
        },
      ],
    });
    render(<TiptapRenderer content={content} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading 1');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Heading 2');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Heading 3');
  });

  it('renders bold text with <strong>', () => {
    const content = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Bold text', marks: [{ type: 'bold' }] }],
        },
      ],
    });
    const { container } = render(<TiptapRenderer content={content} />);
    const strong = container.querySelector('strong');
    expect(strong).toBeInTheDocument();
    expect(strong).toHaveTextContent('Bold text');
  });

  it('renders italic text with <em>', () => {
    const content = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Italic text', marks: [{ type: 'italic' }] }],
        },
      ],
    });
    const { container } = render(<TiptapRenderer content={content} />);
    const em = container.querySelector('em');
    expect(em).toBeInTheDocument();
    expect(em).toHaveTextContent('Italic text');
  });

  it('renders inline code with <code>', () => {
    const content = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'const x = 1', marks: [{ type: 'code' }] }],
        },
      ],
    });
    const { container } = render(<TiptapRenderer content={content} />);
    const code = container.querySelector('code');
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent('const x = 1');
  });

  it('renders bullet lists with <ul>', () => {
    const content = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item 1' }],
                },
              ],
            },
          ],
        },
      ],
    });
    const { container } = render(<TiptapRenderer content={content} />);
    const ul = container.querySelector('ul');
    expect(ul).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('renders ordered lists with <ol>', () => {
    const content = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'First item' }],
                },
              ],
            },
          ],
        },
      ],
    });
    const { container } = render(<TiptapRenderer content={content} />);
    const ol = container.querySelector('ol');
    expect(ol).toBeInTheDocument();
    expect(screen.getByText('First item')).toBeInTheDocument();
  });

  it('renders code blocks with <pre><code>', () => {
    const content = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          content: [{ type: 'text', text: 'function test() {}' }],
        },
      ],
    });
    const { container } = render(<TiptapRenderer content={content} />);
    const pre = container.querySelector('pre');
    const code = container.querySelector('pre code');
    expect(pre).toBeInTheDocument();
    expect(code).toBeInTheDocument();
    expect(screen.getByText('function test() {}')).toBeInTheDocument();
  });

  it('renders blockquotes', () => {
    const content = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'A quote' }],
            },
          ],
        },
      ],
    });
    const { container } = render(<TiptapRenderer content={content} />);
    const blockquote = container.querySelector('blockquote');
    expect(blockquote).toBeInTheDocument();
    expect(screen.getByText('A quote')).toBeInTheDocument();
  });

  it('renders horizontal rules', () => {
    const content = JSON.stringify({
      type: 'doc',
      content: [{ type: 'horizontalRule' }],
    });
    const { container } = render(<TiptapRenderer content={content} />);
    const hr = container.querySelector('hr');
    expect(hr).toBeInTheDocument();
  });

  it('handles combined marks (bold + italic)', () => {
    const content = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Bold and italic',
              marks: [{ type: 'bold' }, { type: 'italic' }],
            },
          ],
        },
      ],
    });
    const { container } = render(<TiptapRenderer content={content} />);
    const strong = container.querySelector('strong');
    const em = container.querySelector('em');
    expect(strong).toBeInTheDocument();
    expect(em).toBeInTheDocument();
  });
});
