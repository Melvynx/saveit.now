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
    // Check if --dev flag is passed
    const isDev = process.argv.includes('--dev');
    const baseUrl = isDev ? 'http://localhost:3000' : 'https://saveit.now';
    
    console.log(`Building for ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}`);
    console.log(`Base URL: ${baseUrl}`);

    // Build background, content, and popup scripts with IIFE format for Chrome extension compatibility
    await build({
      entryPoints: [
        path.join(srcDir, "background.ts"),
        path.join(srcDir, "content.ts"),
        path.join(srcDir, "popup.ts"),
      ],
      bundle: true,
      outdir: targetDir,
      platform: "browser",
      minify: !isDev, // Don't minify in dev mode for better debugging
      format: "iife",
      target: "es2020",
      loader: { ".ts": "ts" },
      define: {
        '__BASE_URL__': JSON.stringify(baseUrl),
        '__IS_DEV__': JSON.stringify(isDev),
      },
    });

    console.log("TypeScript files compiled successfully!");
    return true;
  } catch (error) {
    console.error("TypeScript compilation failed:", error);
    return false;
  }
}

// Function to update manifest.json for development
function updateManifestForDev() {
  const manifestPath = path.join(targetDir, "manifest.json");
  
  if (fs.existsSync(manifestPath)) {
    const manifestContent = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(manifestContent);
    
    // Add localhost:3000 to host_permissions for dev builds
    if (!manifest.host_permissions.includes("http://localhost:3000/*")) {
      manifest.host_permissions.push("http://localhost:3000/*");
    }
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log("Updated manifest.json for development with localhost:3000");
  }
}

// Main execution
async function main() {
  try {
    console.log("Starting build process...");

    // Check if --dev flag is passed
    const isDev = process.argv.includes('--dev');

    // First, copy all files from public to dist
    console.log("Copying files from public to dist...");
    copyFiles(sourceDir, targetDir);
    console.log("Files copied successfully!");

    // Update manifest for development if needed
    if (isDev) {
      updateManifestForDev();
    }

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
