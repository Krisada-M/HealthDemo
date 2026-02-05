const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration for React Native with pnpm
 * https://reactnative.dev/docs/metro
 */
const config = {
  resolver: {
    nodeModulesPaths: [__dirname],
  },
  watchFolders: [__dirname],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
