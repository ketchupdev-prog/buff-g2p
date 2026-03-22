/**
 * Metro config for Smartpay mobile (Expo).
 * Resolves Node built-ins (e.g. node:buffer) to polyfills for packages that require them.
 * Note: CopilotKit web integration has been removed; this polyfill remains for other dependencies.
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;

// Monorepo note:
// `buffer` is often hoisted to `fintech/node_modules`, not under
// `apps/smartpay-mobile/node_modules`. Resolve from whichever exists.
const localBufferPath = path.resolve(__dirname, 'node_modules/buffer/index.js');
const hoistedBufferPath = path.resolve(__dirname, '../../node_modules/buffer/index.js');
const monorepoRoot = path.resolve(__dirname, '../..');

// Add watchFolders to ensure Metro watches the hoisted node_modules
config.watchFolders = [monorepoRoot];

// Web shim:
// `react-native-maps` imports native-only react-native internals and breaks
// web bundling. We redirect all `react-native-maps*` imports to a tiny shim
// when Metro is targeting `web`.
const mapsShimPath = path.resolve(__dirname, 'shims/react-native-maps-web.tsx');

function resolveBufferFilePath() {
  if (fs.existsSync(localBufferPath)) return localBufferPath;
  if (fs.existsSync(hoistedBufferPath)) return hoistedBufferPath;
  // Fall back to local path so Metro throws a clearer error if missing entirely.
  return localBufferPath;
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName && moduleName.startsWith('react-native-maps')) {
    return {
      type: 'sourceFile',
      filePath: mapsShimPath,
    };
  }
  if (moduleName === 'node:buffer' || moduleName === 'buffer') {
    return {
      type: 'sourceFile',
      filePath: resolveBufferFilePath(),
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
