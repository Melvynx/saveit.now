import { z } from "zod";

export const ServerToastEnum = z.enum(["success", "error", "warning", "info"]);

export type ServerToastEnum = z.infer<typeof ServerToastEnum>;

export const ServerToastSchema = z.object({
  message: z.string(),
  type: ServerToastEnum,
});

export type ServerToastType = z.infer<typeof ServerToastSchema>;
