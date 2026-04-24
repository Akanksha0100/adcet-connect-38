import { z } from "zod";

export const updateProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  avatarKey: z.string().optional(),
  phone: z.string().max(40).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  linkedinUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  department: z.string().max(120).optional(),
  degree: z.enum(["BE", "ME", "PHD", "DIPLOMA"]).optional(),
  admissionYear: z.coerce.number().int().min(1980).max(2100).optional(),
  graduationYear: z.coerce.number().int().min(1980).max(2100).optional(),
  rollNumber: z.string().max(40).optional(),
  currentCompany: z.string().max(160).optional(),
  currentRole: z.string().max(160).optional(),
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