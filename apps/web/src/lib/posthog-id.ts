import { createHash } from "crypto";

export const getPosthogId = (ip: string, userAgent: string) => {
  const total = ip + userAgent;
  const hash = createHash("md5").update(total).digest("hex");
  return hash;
};