import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

interface TestConfig {
  apiKey: string;
  userId: string;
  userEmail: string;
}

let testConfig: TestConfig | null = null;

export async function getTestConfig(): Promise<TestConfig> {
  if (!testConfig) {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const configPath = join(__dirname, "..", "test-config.json");
      const configData = await readFile(configPath, "utf-8");
      testConfig = JSON.parse(configData);
    } catch (error) {
      throw new Error("Test config not found. Make sure global setup has run.");
    }
  }

  if (!testConfig) {
    throw new Error("Test config is invalid.");
  }

  return testConfig;
}

export function getTestApiKey(): Promise<string> {
  return getTestConfig().then((config) => config.apiKey);
}
