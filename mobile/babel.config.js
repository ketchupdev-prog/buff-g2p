/**
 * Babel config for Expo (Buffr G2P).
 * - babel-preset-expo: Expo default (Metro, React Native, path aliases from tsconfig).
 * - react-native-reanimated/plugin: Must be listed last. Required for Reanimated 3.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated plugin must be last in the plugins array.
      'react-native-reanimated/plugin',
    ],
  };
};
