// lib/logger.ts
import { createConsola } from "consola";

const isProd = process.env.NODE_ENV === "production";
const isBrowser = typeof window !== "undefined";

export const logger = createConsola({
  level: isProd ? 2 : 4, // info en prod, debug en dev
  formatOptions: {
    colors: !isProd && !isBrowser,
    compact: isProd,
    date: true,
  },
}).withTag(isBrowser ? "client" : "server");
