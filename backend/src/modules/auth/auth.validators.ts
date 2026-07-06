import { z } from "zod";

const optionalUrl = z
  .string()
  .max(500)
  .refine((v) => !v || /^https?:\/\//i.test(v), { message: "Must be a valid URL" })
  .optional();

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  role: z.enum(["ALUMNI", "STUDENT", "RECRUITER"]).default("ALUMNI"),
  department: z.string().optional(),
  degree: z.enum(["BE", "ME", "PHD", "DIPLOMA"]).optional(),
  admissionYear: z.coerce.number().int().min(1980).max(2100).optional(),
  graduationYear: z.coerce.number().int().min(1980).max(2100).optional(),
  // Step 2: social / professional links
  linkedinUrl: z.string().min(1, "LinkedIn profile is required").max(500)
    .refine((v) => /^https?:\/\//i.test(v), { message: "Must be a valid URL" }),
  githubUrl: optionalUrl,
  twitterUrl: optionalUrl,
  websiteUrl: optionalUrl,
  phone: z.string().max(40).optional(),
  city: z.string().max(120).optional(),
  bio: z.string().max(2000).optional(),
  currentCompany: z.string().max(160).optional(),
  currentRole: z.string().max(160).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;