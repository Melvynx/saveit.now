const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const distDir = path.join(__dirname, "../dist");
const packageDir = path.join(__dirname, "../package");

// Create package directory if it doesn't exist
if (!fs.existsSync(packageDir)) {
  fs.mkdirSync(packageDir, { recursive: true });
}

// Create a file to stream archive data to
// Firefox extensions use .xpi files, but they're essentially zip files
const xpiFileName = `saveit-firefox-extension-v${require("../package.json").version}.xpi`;
const xpiFilePath = path.join(packageDir, xpiFileName);
const output = fs.createWriteStream(xpiFilePath);

// Create archive
const archive = archiver("zip", {
  zlib: { level: 9 }, // Best compression
});

// Listen for errors
archive.on("error", (err) => {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add files from dist directory to the archive
archive.directory(distDir, false);

// Finalize the archive
archive.finalize();

// Log when the xpi has been created
output.on("close", () => {
  console.log(`Firefox extension packaged successfully: ${xpiFilePath}`);
  console.log(`Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  console.log(`\nTo install in Firefox:`);
  console.log(`1. Open Firefox and go to about:debugging`);
  console.log(`2. Click "This Firefox" in the sidebar`);
  console.log(`3. Click "Load Temporary Add-on..."`);
  console.log(`4. Select the generated .xpi file or the manifest.json from the dist folder`);
  console.log(`\nFor permanent installation, submit to Firefox Add-ons (AMO).`);
});