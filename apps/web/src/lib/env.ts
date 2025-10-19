import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * This is the schema for the environment variables.
 *
 * Please import **this** file and use the `env` variable
 */

export const env = createEnv({
  server: {
    AWS_ACCESS_KEY_ID: z.string().min(1).default("ci-placeholder"),
    AWS_SECRET_ACCESS_KEY: z.string().min(1).default("ci-placeholder"),
    AWS_S3_BUCKET_NAME: z.string().min(1).default("ci-placeholder"),
    AWS_ENDPOINT: z.string().min(1).default("https://ci-placeholder.com"),
    R2_URL: z.string().min(1).default("https://ci-placeholder.com"),
    CLOUDFLARE_API_TOKEN: z.string().min(1).default("ci-placeholder"),
    CLOUDFLARE_ACCOUNT_ID: z.string().min(1).default("ci-placeholder"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("test"),
    UPSTASH_REDIS_REST_URL: z.string().min(1),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    RESEND_EMAIL_FROM: z
      .string()
      .default("Melvyn from SaveIt.now <help@re.saveit.now>"),
    HELP_EMAIL: z.string().min(1).default("help@saveit.now"),
    STRIPE_COUPON_ID: z.string().min(1).default("ci-placeholder"),
    RESEND_API_KEY: z.string().min(1).default("re_placeholder_for_ci"),
    CI: z.coerce.boolean().optional().default(false),
  },
  client: {},
  experimental__runtimeEnv: {},
});
