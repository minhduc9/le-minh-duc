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

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ShareNoteInput = z.infer<typeof shareNoteSchema>;
