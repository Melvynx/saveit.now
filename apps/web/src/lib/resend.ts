import { Resend } from "resend";
import { env } from "./env";

// Use a valid format API key for CI environments
const apiKey = env.RESEND_API_KEY === "re_placeholder_for_ci" ? "re_placeholder" : env.RESEND_API_KEY;

export const resend = new Resend(apiKey);
