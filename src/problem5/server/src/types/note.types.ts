import { z } from "zod";

export const createNoteSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.any().optional(),
});

export const updateNoteSchema = z.object({
    title: z.string().min(1, "Title is required").optional(),
    content: z.any().optional(),
});

export const shareNoteSchema = z.object({
    userId: z.uuid("Invalid user ID"),
    role: z.enum(["view", "edit"]),
});

export const listNotesSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    includeShared: z.coerce.boolean().optional().default(true),
    includeContent: z.coerce.boolean().optional().default(false),
    search: z
        .string()
        .trim()
        .max(100, "Search query is too long")
        .transform((value) => value || undefined)
        .optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ShareNoteInput = z.infer<typeof shareNoteSchema>;
export type ListNotesInput = z.infer<typeof listNotesSchema>;
