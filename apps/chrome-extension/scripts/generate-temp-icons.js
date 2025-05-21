const fs = require("fs");
const path = require("path");

const targetDir = path.join(__dirname, "../public/images");

// Ensure the directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Function to create a simple SVG icon
function createSvgIcon(size) {
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#0070f3"/>
  <path d="M${size / 4} ${size / 2} L${size / 2} ${(size * 3) / 4} L${(size * 3) / 4} ${size / 4}" stroke="white" stroke-width="${size / 16}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
}

// Create SVG icons for different sizes
const iconSizes = [16, 48, 128];

for (const size of iconSizes) {
  const iconPath = path.join(targetDir, `icon${size}.svg`);
  fs.writeFileSync(iconPath, createSvgIcon(size));
  console.log(`Created ${iconPath}`);
}

console.log("Temporary icons created successfully!");
