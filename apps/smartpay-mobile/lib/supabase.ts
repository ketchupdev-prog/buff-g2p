/**
 * Supabase client – Smartpay.
 * Uses Buffr Connect Supabase project. Session stored in secure storage.
 * Location: fintech/smartpay/lib/supabase.ts
 */
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Expo's web bundling sometimes evaluates modules in a Node/SSR-like
    // environment where `window` is not defined. AsyncStorage can throw in
    // that case, so we swap to a safe in-memory storage when `window` is
    // missing.
    storage: typeof window === 'undefined'
      ? {
          // Supabase expects the RN storage interface.
          getItem: async () => null,
          setItem: async () => {},
          removeItem: async () => {},
        }
      : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
