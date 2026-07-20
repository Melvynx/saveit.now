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

// Force a single React copy: workspace packages (backend -> better-auth ->
// tanstack) pull react 19.2.4 into the graph, which crashes hooks at runtime.
const reactPath = path.resolve(projectRoot, 'node_modules/react');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolveRequest ?? context.resolveRequest;
  if (moduleName === 'react') {
    return resolve(context, reactPath, platform);
  }
  if (moduleName.startsWith('react/')) {
    return resolve(
      context,
      path.join(reactPath, moduleName.slice('react/'.length)),
      platform,
    );
  }
  return resolve(context, moduleName, platform);
};

// Add support for workspace packages
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Enable symlinks
config.resolver.unstable_enableSymlinks = true;

// Enable package exports for Better Auth
config.resolver.unstable_enablePackageExports = true;

module.exports = withNativeWind(config, { input: './global.css' });