import { z } from "zod";
import { UPLOAD_SCOPES } from "../../config/constants.js";

export const presignSchema = z
  .object({
    fileName: z.string().min(1).max(255),
    contentType: z.string().min(1).max(100),
    scope: z.enum(UPLOAD_SCOPES as unknown as [string, ...string[]]),
  })
  .refine(
    (d) => d.scope !== "resume" || d.contentType === "application/pdf",
    { message: "Resume uploads must be application/pdf", path: ["contentType"] },
  );

export const downloadSchema = z.object({
  key: z.string().min(1),
});