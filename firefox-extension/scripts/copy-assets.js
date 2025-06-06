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

// WebExtension polyfill banner for Firefox compatibility
const webExtensionPolyfillBanner = `
// Import webextension-polyfill for Firefox compatibility
if (typeof browser === "undefined" && typeof chrome !== "undefined") {
  var browser = chrome;
}
`;

// Compile TypeScript files
async function compileTypeScript() {
  try {
    // Build background script with webextension-polyfill support
    await build({
      entryPoints: [path.join(srcDir, "background.ts")],
      bundle: true,
      outdir: targetDir,
      platform: "browser",
      minify: true,
      format: "iife",
      target: "es2020",
      loader: { ".ts": "ts" },
      banner: {
        js: webExtensionPolyfillBanner,
      },
      external: ["webextension-polyfill"],
      define: {
        "process.env.NODE_ENV": '"production"',
      },
    });

    // Build content script with webextension-polyfill support
    await build({
      entryPoints: [path.join(srcDir, "content.ts")],
      bundle: true,
      outdir: targetDir,
      platform: "browser",
      minify: true,
      format: "iife",
      target: "es2020",
      loader: { ".ts": "ts" },
      banner: {
        js: webExtensionPolyfillBanner,
      },
      external: ["webextension-polyfill"],
      define: {
        "process.env.NODE_ENV": '"production"',
      },
    });

    console.log("TypeScript files compiled successfully for Firefox!");
    return true;
  } catch (error) {
    console.error("TypeScript compilation failed:", error);
    return false;
  }
}

// Main execution
async function main() {
  try {
    console.log("Starting Firefox extension build process...");

    // First, copy all files from public to dist
    console.log("Copying files from public to dist...");
    copyFiles(sourceDir, targetDir);
    console.log("Files copied successfully!");

    // Then compile TypeScript
    console.log("Compiling TypeScript files...");
    const success = await compileTypeScript();

    if (success) {
      console.log("Firefox extension build completed successfully!");
    } else {
      console.error("Firefox extension build completed with errors.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Firefox extension build failed:", error);
    process.exit(1);
  }
}

main();