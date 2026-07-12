import { z } from "zod";

const optionalUrl = z
  .string()
  .max(500)
  .refine((v) => !v || /^https?:\/\//i.test(v), { message: "Must be a valid URL" })
  .optional();

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  // Email ownership must be proven via OTP before the account is created.
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit verification code"),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  role: z.enum(["ALUMNI", "STUDENT", "RECRUITER"]).default("ALUMNI"),
  department: z.string().optional(),
  degree: z.enum(["BE", "ME", "PHD", "DIPLOMA"]).optional(),
  admissionYear: z.coerce.number().int().min(1980).optional(),
  graduationYear: z.coerce.number().int().min(1980).optional(),
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
}).superRefine((data, ctx) => {
  // Alumni sign up after leaving college — years can never be in the future.
  const currentYear = new Date().getFullYear();
  if (data.graduationYear && data.graduationYear > currentYear) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["graduationYear"], message: "Graduation year cannot be in the future" });
  }
  if (data.admissionYear && data.admissionYear > currentYear) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["admissionYear"], message: "Admission year cannot be in the future" });
  }
  if (data.admissionYear && data.graduationYear && data.graduationYear < data.admissionYear) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["graduationYear"], message: "Graduation year cannot be before admission year" });
  }
});

export const sendRegistrationOtpSchema = z.object({ email: z.string().email() });

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
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;