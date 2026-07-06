import { z } from "zod";

/**
 * Profile update fields are all optional. The frontend often passes back the
 * raw values it loaded (which can be `null` for empty DB columns, or `""`
 * after the user clears an input). We accept both and normalize to `undefined`
 * so Prisma simply leaves them unchanged or stores NULL appropriately.
 */
const optionalString = (max: number) =>
  z
    .union([z.string().max(max), z.null()])
    .optional()
    .transform((v) => (v === "" || v === null ? null : v));

const optionalUrl = (max = 500) =>
  z
    .union([z.string().max(max), z.null()])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v))
    .refine((v) => v == null || /^https?:\/\//i.test(v), { message: "Must be a valid URL" });

const optionalYear = z
  .union([z.coerce.number().int().min(1980).max(2100), z.null(), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v == null ? null : (v as number)));

export const updateProfileSchema = z.object({
  bio: optionalString(2000),
  avatarKey: optionalString(500),
  bannerKey: optionalString(500),
  phone: optionalString(40),
  city: optionalString(120),
  country: optionalString(120),
  linkedinUrl: optionalUrl(),
  githubUrl: optionalUrl(),
  twitterUrl: optionalUrl(),
  websiteUrl: optionalUrl(),
  department: optionalString(120),
  degree: z.union([z.enum(["BE", "ME", "PHD", "DIPLOMA"]), z.null(), z.literal("")]).optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  admissionYear: optionalYear,
  graduationYear: optionalYear,
  rollNumber: optionalString(40),
  currentCompany: optionalString(160),
  currentRole: optionalString(160),
});

export const experienceSchema = z.object({
  company: z.string().min(1).max(160),
  title: z.string().min(1).max(160),
  location: z.string().max(200).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  isCurrent: z.boolean().optional().default(false),
  description: z.string().max(4000).optional(),
});

export const educationSchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().min(1).max(120),
  field: z.string().max(160).optional(),
  startYear: z.coerce.number().int().min(1950).max(2100),
  endYear: z.coerce.number().int().min(1950).max(2100).optional(),
});

export const skillsSchema = z.object({ skills: z.array(z.string().min(1).max(60)).max(50) });

export const preferencesSchema = z.object({
  theme: z.enum(["default", "ocean", "sunset", "forest", "royal"]).optional(),
  darkMode: z.boolean().optional(),
  notificationsEmail: z.boolean().optional(),
  notificationsPush: z.boolean().optional(),
});