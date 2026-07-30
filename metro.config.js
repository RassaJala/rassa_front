const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const path = require('path');

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  path.resolve(__dirname, 'packages/common'),
  path.resolve(__dirname, 'packages/chat'),
];

module.exports = withNativeWind(config, { input: './src/styles/global.css' });
