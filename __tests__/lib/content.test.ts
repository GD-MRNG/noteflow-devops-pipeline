import { describe, it, expect } from 'vitest';
import { parseContent } from '@/lib/content';

describe('parseContent', () => {
  it('returns empty string for undefined input', () => {
    expect(parseContent(undefined)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(parseContent('')).toBe('');
  });

  it('parses valid JSON and returns object', () => {
    const json = '{"type":"doc","content":[]}';
    const result = parseContent(json);
    expect(result).toEqual({ type: 'doc', content: [] });
  });

  it('returns original string for invalid JSON', () => {
    const invalidJson = 'not valid json';
    expect(parseContent(invalidJson)).toBe(invalidJson);
  });
});
