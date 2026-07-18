const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const archiver = require("archiver");

const extensionRoot = path.join(__dirname, "..");
const distDir = path.join(extensionRoot, "dist");
const packageDir = path.join(extensionRoot, "package");
const packageJson = require(path.join(extensionRoot, "package.json"));
const isDevelopment = process.argv.includes("--dev");

const allowedFiles = [
  "background.js",
  "content.js",
  "content.css",
  "intercept.js",
  "manifest.json",
  "images/icon16.png",
  "images/icon32.png",
  "images/icon48.png",
  "images/icon64.png",
  "images/icon128.png",
  "images/icon256.png",
];

function toPortablePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function listRelativeFiles(directory, root = directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const relativeDirectory = toPortablePath(
          path.relative(root, absolutePath),
        );
        if (relativeDirectory !== "images") {
          throw new Error(`Unexpected build directory: ${relativeDirectory}`);
        }
        return listRelativeFiles(absolutePath, root);
      }
      if (!entry.isFile()) {
        throw new Error(`Unsupported build entry: ${absolutePath}`);
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

function validateBuild() {
  if (!fs.existsSync(distDir)) {
    throw new Error("The extension must be built before it can be packaged.");
  }

  const files = listRelativeFiles(distDir);
  const allowedFileSet = new Set(allowedFiles);
  const missingFiles = allowedFiles.filter((file) => !files.includes(file));
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

  const manifest = JSON.parse(
    fs.readFileSync(path.join(distDir, "manifest.json"), "utf8"),
  );
  if (manifest.version !== packageJson.version) {
    throw new Error(
      `Version mismatch: manifest ${manifest.version}, package ${packageJson.version}`,
    );
  }

  const backgroundBundle = fs.readFileSync(
    path.join(distDir, "background.js"),
    "utf8",
  );
  const expectedOrigin = isDevelopment
    ? "http://localhost:3000"
    : "https://saveit.now";
  if (!backgroundBundle.includes(expectedOrigin)) {
    throw new Error(`Background bundle does not target ${expectedOrigin}`);
  }
  if (!isDevelopment && backgroundBundle.includes("http://localhost:3000")) {
    throw new Error("Production bundle contains the development origin.");
  }

  const expectedHostPermissions = isDevelopment
    ? ["https://saveit.now/*", "http://localhost:3000/*"]
    : ["https://saveit.now/*"];
  const hostPermissions = [...(manifest.host_permissions || [])].sort();
  if (
    JSON.stringify(hostPermissions) !==
    JSON.stringify(expectedHostPermissions.sort())
  ) {
    throw new Error(
      `Manifest host permissions do not match the ${isDevelopment ? "development" : "production"} origins.`,
    );
  }

  if (isDevelopment) {
    const executeAction = manifest.commands?._execute_action;
    if (
      Object.keys(manifest.commands || {}).length !== 1 ||
      !executeAction ||
      executeAction.suggested_key?.default !== "Ctrl+Shift+Y" ||
      executeAction.suggested_key?.mac !== "Command+Shift+Y"
    ) {
      throw new Error(
        "Development manifest is missing the action test command.",
      );
    }
  } else if (manifest.commands !== undefined) {
    throw new Error("Production manifest must not contain commands.");
  }
}

async function createArchive() {
  validateBuild();
  fs.mkdirSync(packageDir, { recursive: true });

  const suffix = isDevelopment ? "-dev" : "";
  const zipFileName = `saveit-extension-v${packageJson.version}${suffix}.zip`;
  const zipFilePath = path.join(packageDir, zipFileName);
  const temporaryZipPath = path.join(
    packageDir,
    `.${zipFileName}.${process.pid}.${Date.now()}.tmp`,
  );

  const output = fs.createWriteStream(temporaryZipPath, { flags: "wx" });
  const archive = archiver("zip", { zlib: { level: 9 } });

  const completed = new Promise((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
    archive.on("warning", reject);
  });

  try {
    archive.pipe(output);
    for (const file of allowedFiles) {
      archive.file(path.join(distDir, ...file.split("/")), { name: file });
    }
    await archive.finalize();
    await completed;
    if (archive.pointer() === 0) {
      throw new Error("The extension archive is empty.");
    }
    trashPath(zipFilePath);
    fs.renameSync(temporaryZipPath, zipFilePath);
  } catch (error) {
    trashPath(temporaryZipPath);
    throw error;
  }

  console.log(`Extension packaged: ${zipFilePath}`);
  console.log(`Archive size: ${(archive.pointer() / 1024).toFixed(1)} KB`);
}

createArchive().catch((error) => {
  console.error("Extension packaging failed", error);
  process.exit(1);
});
