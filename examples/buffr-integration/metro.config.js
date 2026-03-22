// Monorepo: allow Metro to follow the linked @buffr/sdk workspace package.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  path.resolve(projectRoot, '../../../buffr-connect/packages/buffr-sdk'),
  path.resolve(projectRoot, '../../../buffr-connect/packages/buffr-types'),
];

module.exports = config;
