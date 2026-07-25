import { mobileConfig } from "./config";

export function getWebUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, mobileConfig.apiUrl).toString();
}
