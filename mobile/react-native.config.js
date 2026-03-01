/**
 * React Native CLI config for buffr-g2p (Expo).
 * Ensures `react-native config` returns project.ios so Podfile autolinking works.
 */
const path = require('path');

module.exports = {
  project: {
    ios: {
      sourceDir: path.join(__dirname, 'ios'),
    },
    android: {
      sourceDir: path.join(__dirname, 'android'),
    },
  },
};
