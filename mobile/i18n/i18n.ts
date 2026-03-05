/**
 * Internationalization Configuration
 * 
 * Multi-language support using i18next and expo-localization.
 * Supports English, Afrikaans, Oshiwambo, and German.
 * 
 * Location: mobile/i18n/i18n.ts
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from './locales/en.json';
import af from './locales/af.json';
import kj from './locales/kj.json';
import de from './locales/de.json';

const STORAGE_KEY = 'user_language_preference';

/**
 * Get user's preferred language from storage or system locale.
 */
async function getPreferredLanguage(): Promise<string> {
  try {
    // Check for saved preference
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) {
      return saved;
    }
    
    // Fall back to device locale
    const locales = Localization.getLocales();
    const languageCode = locales[0]?.languageCode || 'en';
    
    // Map to supported languages
    const supported = ['en', 'af', 'kj', 'de'];
    return supported.includes(languageCode) ? languageCode : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Save user's language preference.
 * 
 * @param languageCode - Language code (en, af, kj, de)
 */
export async function setLanguagePreference(languageCode: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, languageCode);
    await i18n.changeLanguage(languageCode);
    console.log('Language preference saved:', languageCode);
  } catch (error) {
    console.error('Failed to save language preference:', error);
  }
}

/**
 * Get current language code.
 */
export function getCurrentLanguage(): string {
  return i18n.language || 'en';
}

/**
 * Get list of supported languages.
 */
export function getSupportedLanguages(): Array<{
  code: string;
  name: string;
  nativeName: string;
}> {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
    { code: 'kj', name: 'Oshiwambo', nativeName: 'Oshiwambo' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' }
  ];
}

// Initialize i18next
const initI18n = async () => {
  const preferredLanguage = await getPreferredLanguage();
  
  const initOptions = {
    resources: {
      en: { translation: en },
      af: { translation: af },
      kj: { translation: kj },
      de: { translation: de }
    },
    lng: preferredLanguage,
    fallbackLng: 'en',
    compatibilityJSON: 'v4' as const, // For React Native
    interpolation: {
      escapeValue: false // React already escapes
    },
    react: {
      useSuspense: false
    }
  };
  
  await i18n
    .use(initReactI18next)
    .init(initOptions);
    
  console.log('i18n initialized with language:', preferredLanguage);
};

// Initialize on import
initI18n();

export default i18n;

/**
 * Hook to get RTL text direction (for future RTL support).
 */
export function useIsRTL(): boolean {
  const currentLang = getCurrentLanguage();
  // Add RTL languages here when supported (e.g., Arabic 'ar')
  const rtlLanguages: string[] = [];
  return rtlLanguages.includes(currentLang);
}
