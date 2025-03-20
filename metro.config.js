const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];
config.resolver.assetExts = [...config.resolver.assetExts, 'db'];

module.exports = config;