import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * This is the schema for the environment variables.
 *
 * Please import **this** file and use the `env` variable
 */

export const env = createEnv({
  server: {
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_S3_BUCKET_NAME: z.string().min(1),
    AWS_ENDPOINT: z.string().min(1),
    R2_URL: z.string().min(1),
    SCREENSHOT_WORKER_URL: z.string().min(1),
    NODE_ENV: z.enum(["development", "production", "test"]),
    RESEND_EMAIL_FROM: z
      .string()
      .default("Melvyn from SaveIt.now <help@re.saveit.now>"),
    HELP_EMAIL: z.string().min(1),
    STRIPE_COUPON_ID: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    CI: z.coerce.boolean().optional().default(false),
  },
  client: {},
  experimental__runtimeEnv: {},
});
