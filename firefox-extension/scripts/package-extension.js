const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const distDir = path.join(__dirname, "../dist");
const packageDir = path.join(__dirname, "../package");

// Read package.json to get version
const packageJsonPath = path.join(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version || "1.0.0";

// Ensure package directory exists
if (!fs.existsSync(packageDir)) {
  fs.mkdirSync(packageDir, { recursive: true });
}

async function createXpiPackage() {
  const packagePath = path.join(packageDir, `firefox-extension.xpi`);
  
  // Remove existing package if it exists
  if (fs.existsSync(packagePath)) {
    fs.unlinkSync(packagePath);
  }

  const output = fs.createWriteStream(packagePath);
  const archive = archiver("zip", {
    zlib: { level: 9 } // Maximum compression
  });

  return new Promise((resolve, reject) => {
    output.on("close", () => {
      const sizeMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
      console.log(`Firefox extension packaged: ${archive.pointer()} total bytes`);
      console.log(`Package created: ${packagePath}`);
      console.log(`File size: ${sizeMB} MB`);
      console.log("\nTo install in Firefox:");
      console.log("1. Open Firefox and go to about:addons");
      console.log("2. Click the gear icon and select 'Install Add-on From File...'");
      console.log("3. Navigate to and select the .xpi file");
      console.log("\nFor development:");
      console.log("1. Go to about:debugging#/runtime/this-firefox");
      console.log("2. Click 'Load Temporary Add-on...'");
      console.log("3. Navigate to the dist folder and select manifest.json");
      resolve();
    });

    archive.on("error", (err) => {
      reject(err);
    });

    archive.pipe(output);
    
    // Add all files from dist directory
    archive.directory(distDir, false);
    
    archive.finalize();
  });
}

async function main() {
  try {
    console.log("Creating Firefox extension package...");
    
    if (!fs.existsSync(distDir)) {
      console.error("Distribution directory not found. Please run 'npm run build' first.");
      process.exit(1);
    }
    
    await createXpiPackage();
    console.log("Firefox extension packaging completed successfully!");
  } catch (error) {
    console.error("Packaging failed:", error);
    process.exit(1);
  }
}

main();