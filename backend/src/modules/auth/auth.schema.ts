import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  department: z.string().optional(),
  degree: z.enum(["BE", "ME", "PHD", "DIPLOMA"]).optional(),
  admissionYear: z.coerce.number().int().min(1980).max(2100).optional(),
  graduationYear: z.coerce.number().int().min(1980).max(2100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;