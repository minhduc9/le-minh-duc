import { z } from "zod";

export const signupSchema = z.object({
    email: z.string().email(),
    name: z.string(),
    password: z.string().min(6),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const updateUserSchema = z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    oldPassword: z.string(),
    newPassword: z.string().min(6).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
