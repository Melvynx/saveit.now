const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Enable monorepo support
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Add support for workspace packages
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Enable symlinks
config.resolver.unstable_enableSymlinks = true;

// Enable package exports for Better Auth
config.resolver.unstable_enablePackageExports = true;

module.exports = config;