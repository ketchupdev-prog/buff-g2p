import { useColorScheme as useColorSchemeCore } from 'react-native';

export const useColorScheme = () => {
  const coreScheme = useColorSchemeCore();
  // react-native may return null (or a third value depending on typings).
  // We normalize to 'light' | 'dark' for stable indexing in `Themed.tsx`.
  return coreScheme === 'dark' ? 'dark' : 'light';
};
