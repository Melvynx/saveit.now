import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profileUuid = "3fff36d8-dd67-434f-9957-2aa249c4aea9";
const source = path.resolve(
  __dirname,
  "../ios/profiles/saveit-share-extension-appstore.mobileprovision",
);
const targetDir = path.join(
  os.homedir(),
  "Library/MobileDevice/Provisioning Profiles",
);
const target = path.join(targetDir, `${profileUuid}.mobileprovision`);

if (process.env.EAS_BUILD_PLATFORM !== "ios") {
  process.exit(0);
}

if (!existsSync(source)) {
  console.warn("[eas] Share Extension provisioning profile not found, skipping install");
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);
console.log(`[eas] installed Share Extension provisioning profile ${profileUuid}`);
