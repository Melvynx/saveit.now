const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Enable monorepo support
config.watchFolders = [
  monorepoRoot,
  path.resolve(monorepoRoot, 'packages/backend'),
];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Add resolver alias for @convex/* so Metro can resolve generated types
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@convex': path.resolve(monorepoRoot, 'packages/backend/convex'),
};

// Add support for workspace packages
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Enable symlinks
config.resolver.unstable_enableSymlinks = true;

// Enable package exports for Better Auth
config.resolver.unstable_enablePackageExports = true;

module.exports = withNativeWind(config, { input: './global.css' });