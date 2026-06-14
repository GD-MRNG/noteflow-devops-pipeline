import { describe, it, expect } from 'vitest';
import { sanitizeUrl, sanitizeTipTapNode, sanitizeContent } from '@/lib/sanitize';

describe('sanitizeUrl', () => {
  it('returns valid HTTPS URLs unchanged', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('https://example.com/path?query=1')).toBe(
      'https://example.com/path?query=1',
    );
  });

  it('returns valid HTTP URLs unchanged', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('returns null for javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
  });

  it('returns null for data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('returns null for file: protocol', () => {
    expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
  });

  it('treats relative URLs as valid (uses base URL)', () => {
    // The function uses a base URL so relative paths become valid HTTP URLs
    expect(sanitizeUrl('not a url')).toBe('not a url');
    expect(sanitizeUrl('/path')).toBe('/path');
  });

  it('treats empty string as valid relative URL', () => {
    // Empty string becomes a valid relative URL with the base URL
    expect(sanitizeUrl('')).toBe('');
  });
});

describe('sanitizeTipTapNode', () => {
  it('returns primitives unchanged', () => {
    expect(sanitizeTipTapNode('string')).toBe('string');
    expect(sanitizeTipTapNode(123)).toBe(123);
    expect(sanitizeTipTapNode(null)).toBeNull();
    expect(sanitizeTipTapNode(true)).toBe(true);
  });

  it('sanitizes text content with DOMPurify', () => {
    const node = { text: '<script>alert(1)</script>Hello' };
    const result = sanitizeTipTapNode(node) as { text: string };
    expect(result.text).toBe('Hello');
  });

  it('sanitizes href attributes and removes dangerous URLs', () => {
    const node = {
      type: 'link',
      attrs: { href: 'javascript:alert(1)' },
    };
    const result = sanitizeTipTapNode(node) as { attrs: Record<string, unknown> };
    expect(result.attrs.href).toBeUndefined();
  });

  it('keeps safe href attributes', () => {
    const node = {
      type: 'link',
      attrs: { href: 'https://example.com' },
    };
    const result = sanitizeTipTapNode(node) as { attrs: Record<string, unknown> };
    expect(result.attrs.href).toBe('https://example.com');
  });

  it('sanitizes src attributes', () => {
    const node = {
      type: 'image',
      attrs: { src: 'javascript:alert(1)' },
    };
    const result = sanitizeTipTapNode(node) as { attrs: Record<string, unknown> };
    expect(result.attrs.src).toBeUndefined();
  });

  it('recursively processes nested content arrays', () => {
    const node = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ text: '<b>test</b>' }] }],
    };
    const result = sanitizeTipTapNode(node) as {
      content: Array<{ content: Array<{ text: string }> }>;
    };
    expect(result.content[0].content[0].text).toBe('test');
  });

  it('handles deeply nested objects', () => {
    const node = {
      level1: {
        level2: {
          text: '<script>bad</script>good',
        },
      },
    };
    const result = sanitizeTipTapNode(node) as {
      level1: { level2: { text: string } };
    };
    expect(result.level1.level2.text).toBe('good');
  });
});

describe('sanitizeContent', () => {
  it('parses valid JSON and sanitizes it', () => {
    const input = JSON.stringify({ text: '<script>alert(1)</script>Hello' });
    const result = JSON.parse(sanitizeContent(input));
    expect(result.text).toBe('Hello');
  });

  it('returns {} for invalid JSON', () => {
    expect(sanitizeContent('not json')).toBe('{}');
  });

  it('returns {} for empty string', () => {
    expect(sanitizeContent('')).toBe('{}');
  });
});
