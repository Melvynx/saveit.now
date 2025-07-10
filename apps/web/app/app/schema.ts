import { cleanUrl } from "@/lib/url-cleaner";
import { z } from "zod";

export const URL_SCHEMA = z
  .string()
  .url()
  .transform((url) => cleanUrl(url));
