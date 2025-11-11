import { z } from "zod";

const shareRoleOptions = ["view", "edit"] as const;

export const createNoteSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.any().optional(),
});

export const updateNoteSchema = z.object({
    title: z.string().min(1, "Title is required").optional(),
    content: z.any().optional(),
    clientVersion: z.coerce.number().int().min(0).optional(),
});

export const shareNoteSchema = z.object({
    email: z
        .string()
        .trim()
        .email("Invalid email")
        .transform((value) => value.toLowerCase()),
    role: z.enum(shareRoleOptions),
});

export const shareUpdateSchema = z
    .object({
        role: z.enum(shareRoleOptions).optional(),
        remove: z.boolean().optional(),
    })
    .refine(
        (value) => Boolean(value.remove || value.role),
        {
            message: "Role or remove flag is required",
        },
    );

export type ShareRole = (typeof shareRoleOptions)[number];

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
export type ShareUpdateInput = z.infer<typeof shareUpdateSchema>;
export type ListNotesInput = z.infer<typeof listNotesSchema>;
export type NoteShareListItem = {
    id: string;
    email: string;
    name: string;
    role: ShareRole;
    createdAt: string;
};
