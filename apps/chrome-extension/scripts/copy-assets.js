const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { build, context } = require("esbuild");

const extensionRoot = path.join(__dirname, "..");
const sourceDir = path.join(extensionRoot, "public");
const targetDir = path.join(extensionRoot, "dist");
const packageDir = path.join(extensionRoot, "package");
const srcDir = path.join(extensionRoot, "src");
const ignoredAssetNames = new Set([".DS_Store"]);
const publicAssetFiles = [
  "content.css",
  "manifest.json",
  "images/icon16.png",
  "images/icon32.png",
  "images/icon48.png",
  "images/icon64.png",
  "images/icon128.png",
  "images/icon256.png",
];
const buildOutputFiles = [
  "background.js",
  "content.js",
  "intercept.js",
  ...publicAssetFiles,
];

function toPortablePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function listRelativeFiles(
  directory,
  root = directory,
  ignoreKnownJunk = false,
) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (ignoreKnownJunk && ignoredAssetNames.has(entry.name)) return [];

      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const relativeDirectory = toPortablePath(
          path.relative(root, absolutePath),
        );
        if (relativeDirectory !== "images") {
          throw new Error(`Unexpected asset directory: ${relativeDirectory}`);
        }
        return listRelativeFiles(absolutePath, root, ignoreKnownJunk);
      }
      if (!entry.isFile()) {
        throw new Error(`Unsupported public asset: ${absolutePath}`);
      }
      return [toPortablePath(path.relative(root, absolutePath))];
    })
    .sort();
}

function trashPath(targetPath) {
  if (!fs.existsSync(targetPath)) return;

  const result = spawnSync("/usr/bin/trash", [targetPath], {
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    const detail =
      result.error?.message || result.stderr.trim() || "unknown error";
    throw new Error(`Could not move ${targetPath} to Trash: ${detail}`);
  }
}

function validatePublicAssets(files) {
  const allowedFiles = new Set(publicAssetFiles);
  const extras = files.filter((file) => !allowedFiles.has(file));
  if (extras.length > 0) {
    throw new Error(`Unexpected public extension assets: ${extras.join(", ")}`);
  }
}

function validateBuildOutputs() {
  const files = listRelativeFiles(targetDir);
  const allowedFileSet = new Set(buildOutputFiles);
  const missingFiles = buildOutputFiles.filter((file) => !files.includes(file));
  const extraFiles = files.filter((file) => !allowedFileSet.has(file));
  if (missingFiles.length > 0 || extraFiles.length > 0) {
    const details = [
      missingFiles.length > 0 ? `missing: ${missingFiles.join(", ")}` : null,
      extraFiles.length > 0 ? `unexpected: ${extraFiles.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("; ");
    throw new Error(`Invalid extension build contents (${details})`);
  }
}

function copyFiles(source, target) {
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (ignoredAssetNames.has(entry.name)) continue;

    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyFiles(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function updateManifestForDevelopment() {
  const manifestPath = path.join(targetDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const localOrigin = "http://localhost:3000/*";

  if (!manifest.host_permissions.includes(localOrigin)) {
    manifest.host_permissions.push(localOrigin);
  }

  manifest.commands = {
    _execute_action: {
      suggested_key: {
        default: "Ctrl+Shift+Y",
        mac: "Command+Shift+Y",
      },
    },
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function syncPublicAssets(isDevelopment) {
  const sourceFiles = listRelativeFiles(sourceDir, sourceDir, true);
  const sourceFileSet = new Set(sourceFiles);
  for (const publicAssetFile of publicAssetFiles) {
    if (!sourceFileSet.has(publicAssetFile)) {
      trashPath(path.join(targetDir, ...publicAssetFile.split("/")));
    }
  }

  validatePublicAssets(sourceFiles);

  const missingFiles = publicAssetFiles.filter(
    (file) => !sourceFileSet.has(file),
  );
  if (missingFiles.length > 0) {
    throw new Error(
      `Missing public extension assets: ${missingFiles.join(", ")}`,
    );
  }

  copyFiles(sourceDir, targetDir);
  if (isDevelopment) updateManifestForDevelopment();
}

function getBuildOptions(isDevelopment) {
  const baseUrl = isDevelopment
    ? "http://localhost:3000"
    : "https://saveit.now";

  return {
    entryPoints: [
      path.join(srcDir, "background.ts"),
      path.join(srcDir, "content.ts"),
      path.join(srcDir, "intercept.ts"),
    ],
    bundle: true,
    outdir: targetDir,
    platform: "browser",
    minify: !isDevelopment,
    format: "iife",
    target: "es2020",
    loader: { ".ts": "ts" },
    define: {
      __BASE_URL__: JSON.stringify(baseUrl),
      __IS_DEV__: JSON.stringify(isDevelopment),
    },
  };
}

function watchPublicAssets(isDevelopment) {
  let syncTimer;
  return fs.watch(sourceDir, { recursive: true }, () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      try {
        syncPublicAssets(isDevelopment);
        validateBuildOutputs();
        console.log("Public extension assets updated");
      } catch (error) {
        console.error("Public asset update failed", error);
        process.exit(1);
      }
    }, 80);
  });
}

async function main() {
  if (process.argv.includes("--clean-all")) {
    trashPath(targetDir);
    trashPath(packageDir);
    console.log("Extension build artifacts moved to Trash");
    return;
  }

  const isDevelopment = process.argv.includes("--dev");
  const shouldWatch = process.argv.includes("--watch");
  const mode = isDevelopment ? "development" : "production";

  console.log(`Building SaveIt extension for ${mode}`);
  trashPath(targetDir);
  syncPublicAssets(isDevelopment);

  if (!shouldWatch) {
    await build(getBuildOptions(isDevelopment));
    validateBuildOutputs();
    console.log("Extension build completed");
    return;
  }

  const buildContext = await context(getBuildOptions(isDevelopment));
  await buildContext.rebuild();
  validateBuildOutputs();
  await buildContext.watch();
  const assetWatcher = watchPublicAssets(isDevelopment);
  console.log("Watching extension source and public assets");

  const close = async () => {
    assetWatcher.close();
    await buildContext.dispose();
    process.exit(0);
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

main().catch((error) => {
  console.error("Extension build failed", error);
  process.exit(1);
});
