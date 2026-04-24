import { z } from "zod";

export const updateMeSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
});

export const updatePreferencesSchema = z.object({
  notificationsEmail: z.boolean().optional(),
  notificationsPush: z.boolean().optional(),
  darkMode: z.boolean().optional(),
  language: z.string().min(2).max(8).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});