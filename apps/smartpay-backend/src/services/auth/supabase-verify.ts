/**
 * Supabase JWT verification service
 *
 * Purpose: Verify bearer tokens issued by Supabase Auth and map them
 * into a stable backend principal shape used by middleware.
 *
 * Location: src/services/auth/supabase-verify.ts
 */

import { createClient } from '@supabase/supabase-js';

export interface SupabasePrincipal {
  sub: string;
  email?: string;
}

let cachedClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

export async function verifySupabaseBearerToken(
  token: string
): Promise<{ valid: true; principal: SupabasePrincipal } | { valid: false; error: string }> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return { valid: false, error: 'Supabase client not configured' };
    }

    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) {
      return { valid: false, error: error?.message || 'Invalid Supabase token' };
    }

    return {
      valid: true,
      principal: {
        sub: data.user.id,
        email: data.user.email ?? undefined,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Supabase verification failed',
    };
  }
}
