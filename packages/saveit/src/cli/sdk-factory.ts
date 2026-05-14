import { Saveit } from "../sdk.js";
import { getToken } from "./auth-store.js";

let cachedClient: Saveit | null = null;

export function getClient(): Saveit {
  if (cachedClient) return cachedClient;
  const apiKey = getToken();
  cachedClient = new Saveit({
    apiKey,
    baseUrl: process.env.SAVEIT_BASE_URL,
  });
  return cachedClient;
}
