import { z } from "zod";
import { departmentSchema } from "../../lib/departments.js";
import { DEGREE_VALUES, MIN_ACADEMIC_YEAR } from "../../config/constants.js";

const optionalUrl = z
  .string()
  .max(500)
  .refine((v) => !v || /^https?:\/\//i.test(v), { message: "Must be a valid URL" })
  .optional();

/**
 * Every email entering the system goes through this. Lowercasing at the
 * boundary is what makes "Alice@adcet.in" and "alice@adcet.in" the same
 * account — without it the unique constraint on `User.email` happily allows
 * both. Migration `signup_required_fields` folds existing rows and adds a
 * `lower(email)` unique index so the guarantee survives any future code path.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(200);

/** A field the user must actually fill in — whitespace alone doesn't count. */
const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max);

const currentYear = new Date().getFullYear();

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
  // Email ownership must be proven via OTP before the account is created.
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit verification code"),
  firstName: requiredText(80, "First name is required"),
  lastName: requiredText(80, "Last name is required"),
  role: z.enum(["ALUMNI", "STUDENT", "RECRUITER"]).default("ALUMNI"),

  // --- Academic (all mandatory) ---
  department: departmentSchema,
  degree: z.enum(DEGREE_VALUES, { errorMap: () => ({ message: "Select your degree" }) }),
  // Admission year is NOT collected — it is derived from the graduation year
  // and the degree's course length (`admissionYearFor`).
  graduationYear: z.coerce
    .number({ invalid_type_error: "Graduation year is required" })
    .int()
    .min(MIN_ACADEMIC_YEAR)
    .max(currentYear + 10),

  /**
   * Birthday, day + month only — used to send birthday wishes. The year is
   * deliberately not collected. Validated as a real calendar date so 31/02
   * can't be stored; 29 February is allowed (it is a real date in leap years).
   */
  birthDay: z.coerce.number({ invalid_type_error: "Birth date is required" }).int().min(1).max(31),
  birthMonth: z.coerce.number({ invalid_type_error: "Birth month is required" }).int().min(1).max(12),

  // --- Contact & professional (all mandatory) ---
  phone: requiredText(40, "Phone number is required"),
  city: requiredText(120, "City is required"),
  currentCompany: requiredText(160, "Current company is required"),
  currentRole: requiredText(160, "Current role is required"),
  linkedinUrl: z.string().trim().min(1, "LinkedIn profile is required").max(500)
    .refine((v) => /^https?:\/\//i.test(v), { message: "Must be a valid URL" }),

  // --- Optional extras ---
  githubUrl: optionalUrl,
  twitterUrl: optionalUrl,
  websiteUrl: optionalUrl,
  bio: z.string().max(2000).optional(),
}).superRefine((data, ctx) => {
  // Alumni sign up after leaving college, but final-year students register
  // before convocation — so a near-future graduation year is legitimate while
  // a far-future one is a typo.
  if (data.graduationYear > currentYear + 6) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["graduationYear"],
      message: "Graduation year looks too far in the future",
    });
  }
  // Reject impossible day/month pairs (e.g. 31 April). Year 2024 is a leap
  // year, so 29 February validates.
  const probe = new Date(Date.UTC(2024, data.birthMonth - 1, data.birthDay));
  if (probe.getUTCMonth() !== data.birthMonth - 1 || probe.getUTCDate() !== data.birthDay) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["birthDay"],
      message: "That date doesn't exist in the selected month",
    });
  }
});

export const sendRegistrationOtpSchema = z.object({ email: emailSchema });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });
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
