import { z } from "zod";

export const URL_SCHEMA = z.string().url();
