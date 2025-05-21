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
const zipFileName = `saveit-extension-v${require("../package.json").version}.zip`;
const zipFilePath = path.join(packageDir, zipFileName);
const output = fs.createWriteStream(zipFilePath);

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

// Log when the zip has been created
output.on("close", () => {
  console.log(`Extension packaged successfully: ${zipFilePath}`);
  console.log(`Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});
