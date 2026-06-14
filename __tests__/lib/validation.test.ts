import { describe, it, expect } from 'vitest';
import { createNoteSchema, updateNoteSchema, toggleSharingSchema } from '@/lib/validation';

describe('createNoteSchema', () => {
  it('passes with valid title and content', () => {
    const result = createNoteSchema.safeParse({
      title: 'My Note',
      content_json: '{"type":"doc","content":[]}',
    });
    expect(result.success).toBe(true);
  });

  it('fails with empty title', () => {
    const result = createNoteSchema.safeParse({
      title: '',
      content_json: '{"type":"doc"}',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toBeDefined();
    }
  });

  it('fails with title > 200 chars', () => {
    const result = createNoteSchema.safeParse({
      title: 'a'.repeat(201),
      content_json: '{"type":"doc"}',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toContain('Title is too long');
    }
  });

  it('fails with empty content', () => {
    const result = createNoteSchema.safeParse({
      title: 'My Note',
      content_json: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.content_json).toBeDefined();
    }
  });
});

describe('updateNoteSchema', () => {
  it('passes with valid UUID, title, and content', () => {
    const result = updateNoteSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Updated Note',
      content_json: '{"type":"doc","content":[]}',
    });
    expect(result.success).toBe(true);
  });

  it('fails with invalid UUID format', () => {
    const result = updateNoteSchema.safeParse({
      id: 'not-a-uuid',
      title: 'My Note',
      content_json: '{"type":"doc"}',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.id).toContain('Invalid note ID');
    }
  });
});

describe('toggleSharingSchema', () => {
  it('transforms "true" string to boolean true', () => {
    const result = toggleSharingSchema.safeParse({
      noteId: 'some-id',
      enable: 'true',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enable).toBe(true);
    }
  });

  it('transforms "false" string to boolean false', () => {
    const result = toggleSharingSchema.safeParse({
      noteId: 'some-id',
      enable: 'false',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enable).toBe(false);
    }
  });
});
