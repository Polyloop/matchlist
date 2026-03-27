import { z } from "zod/v4";

export const prospectImportRowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email().optional(),
  linkedin_url: z.url().optional(),
  employer: z.string().optional(),
});

export type ProspectImportRow = z.infer<typeof prospectImportRowSchema>;

export const csvColumnMappingSchema = z.record(z.string(), z.string());
