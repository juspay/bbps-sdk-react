const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sdkRoot = path.resolve(projectRoot, 'node_modules/bbps-sdk-react');

const defaultConfig = getDefaultConfig(projectRoot);

defaultConfig.watchFolders = [sdkRoot];
defaultConfig.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

const config = {};

module.exports = mergeConfig(defaultConfig, config);
