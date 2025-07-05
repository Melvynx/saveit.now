import { z } from "zod";

export const EmailChangeSchema = z.object({
  newEmail: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
});

export type EmailChangeInput = z.infer<typeof EmailChangeSchema>;
