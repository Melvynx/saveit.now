const fs = require("fs");
const path = require("path");
const { build } = require("esbuild");

const sourceDir = path.join(__dirname, "../public");
const targetDir = path.join(__dirname, "../dist");
const srcDir = path.join(__dirname, "../src");

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Function to copy files recursively
function copyFiles(source, target) {
  // Create target directory if it doesn't exist
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Read source directory
  const files = fs.readdirSync(source);

  // Copy each file/directory
  for (const file of files) {
    const sourceFilePath = path.join(source, file);
    const targetFilePath = path.join(target, file);

    // Check if it's a directory
    const stat = fs.statSync(sourceFilePath);

    if (stat.isDirectory()) {
      // Recursively copy directory
      copyFiles(sourceFilePath, targetFilePath);
    } else {
      // Copy file
      fs.copyFileSync(sourceFilePath, targetFilePath);
    }
  }
}

// Compile TypeScript files
async function compileTypeScript() {
  try {
    // Build background and popup with ESM format
    await build({
      entryPoints: [
        path.join(srcDir, "popup.ts"),
        path.join(srcDir, "background.ts"),
      ],
      bundle: true,
      outdir: targetDir,
      platform: "browser",
      minify: true,
      format: "esm",
      target: "es2020",
      loader: { ".ts": "ts" },
    });

    // Build content script with IIFE format to avoid export token issues
    await build({
      entryPoints: [path.join(srcDir, "content.ts")],
      bundle: true,
      outdir: targetDir,
      platform: "browser",
      minify: true,
      format: "iife", // Use IIFE format for content scripts
      target: "es2020",
      loader: { ".ts": "ts" },
    });

    console.log("TypeScript files compiled successfully!");
    return true;
  } catch (error) {
    console.error("TypeScript compilation failed:", error);
    return false;
  }
}

// Main execution
async function main() {
  try {
    console.log("Starting build process...");

    // First, copy all files from public to dist
    console.log("Copying files from public to dist...");
    copyFiles(sourceDir, targetDir);
    console.log("Files copied successfully!");

    // Then compile TypeScript
    console.log("Compiling TypeScript files...");
    const success = await compileTypeScript();

    if (success) {
      console.log("Build completed successfully!");
    } else {
      console.error("Build completed with errors.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

main();
