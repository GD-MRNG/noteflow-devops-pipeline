import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content_json: z.string().min(1, 'Content is required'),
});

export const updateNoteSchema = z.object({
  id: z.string().uuid('Invalid note ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content_json: z.string().min(1, 'Content is required'),
});

export const toggleSharingSchema = z.object({
  noteId: z.string(),
  enable: z.enum(['true', 'false']).transform((v) => v === 'true'),
});
