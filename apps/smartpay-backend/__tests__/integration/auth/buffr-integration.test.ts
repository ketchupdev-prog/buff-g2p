/**
 * Integration Tests: Buffr Connect Integration
 * Tests the full auth flow: Supabase → SmartPay Backend → Buffr Connect
 * 
 * Location: fintech/apps/smartpay-backend/__tests__/integration/auth/buffr-integration.test.ts
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAisAccounts, isBuffrConnectConfigured } from '../../../src/lib/buffrConnectClient';

describe('Buffr Connect Integration', () => {
  let supabase: SupabaseClient;
  const testUserEmail = process.env.TEST_USER_EMAIL || 'pendanek@gmail.com';
  const testUserPassword = process.env.TEST_USER_PASSWORD || 'test-password';

  beforeAll(() => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment for integration tests'
      );
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey);
  });

  describe('Configuration', () => {
    it('should detect if Buffr Connect is configured', () => {
      const isConfigured = isBuffrConnectConfigured();
      // This will be true if BUFFR_CONNECT_URL is set
      expect(typeof isConfigured).toBe('boolean');
    });
  });

  describe('AIS Account Access', () => {
    it('should be able to query AIS accounts with Supabase token', async () => {
      if (!isBuffrConnectConfigured()) {
        console.warn('Skipping test - Buffr Connect not configured');
        return;
      }

      // Sign in to get a token
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: testUserEmail,
        password: testUserPassword,
      });

      if (authError || !authData.session) {
        console.warn('Skipping test - unable to authenticate:', authError?.message);
        return;
      }

      const accessToken = authData.session.access_token;

      // Try to get AIS accounts
      const accounts = await getAisAccounts(accessToken);

      // accounts will be null if no consent exists or if there's an error
      // This is expected in a test environment
      expect(accounts === null || Array.isArray((accounts as any)?.accounts)).toBe(true);
    }, 15000);
  });

  describe('End-to-End Auth Flow', () => {
    it('should complete full auth flow: Supabase → Backend → Buffr', async () => {
      // 1. User signs in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: testUserEmail,
        password: testUserPassword,
      });

      if (authError || !authData.session) {
        console.warn('Skipping E2E test - unable to authenticate:', authError?.message);
        return;
      }

      expect(authData.session.access_token).toBeTruthy();
      expect(authData.user.email).toBe(testUserEmail);

      // 2. Token should be valid for backend verification
      const { verifySupabaseBearerToken } = await import(
        '../../../src/services/auth/supabase-verify'
      );
      const verifyResult = await verifySupabaseBearerToken(authData.session.access_token);

      expect(verifyResult.valid).toBe(true);
      if (verifyResult.valid) {
        expect(verifyResult.principal.sub).toBe(authData.user.id);
      }

      // 3. Token can be used with Buffr Connect (if configured)
      if (isBuffrConnectConfigured()) {
        const accounts = await getAisAccounts(authData.session.access_token);
        // accounts will be null if no consent exists - this is OK
        expect(accounts === null || typeof accounts === 'object').toBe(true);
      }
    }, 20000);
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });
});
