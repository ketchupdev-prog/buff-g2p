/**
 * Metro config for buffr-g2p (Expo SDK 51).
 * Uses Expo default so resolution stays consistent and avoids @expo/metro path issues.
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
