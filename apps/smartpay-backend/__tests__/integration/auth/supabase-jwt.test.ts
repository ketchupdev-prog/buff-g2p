/**
 * Integration Tests: Supabase JWT Validation
 * Tests the backend's ability to validate Supabase-issued JWTs
 * 
 * Location: fintech/apps/smartpay-backend/__tests__/integration/auth/supabase-jwt.test.ts
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { verifySupabaseBearerToken } from '../../../src/services/auth/supabase-verify';

describe('Supabase JWT Validation Integration', () => {
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

  describe('Token Verification', () => {
    it('should validate a real Supabase JWT token', async () => {
      // Sign in to get a real token
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: testUserEmail,
        password: testUserPassword,
      });

      if (authError || !authData.session) {
        console.warn('Skipping test - unable to authenticate:', authError?.message);
        return;
      }

      const accessToken = authData.session.access_token;

      // Verify the token using our backend service
      const result = await verifySupabaseBearerToken(accessToken);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.principal.sub).toBe(authData.user.id);
        expect(result.principal.email).toBe(testUserEmail);
      }
    }, 15000);

    it('should reject an invalid token', async () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalid';

      const result = await verifySupabaseBearerToken(fakeToken);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should reject an expired token', async () => {
      // This is a properly formatted but expired Supabase token
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInN1YiI6InRlc3QtdXNlci1pZCIsImV4cCI6MTAwMDAwMDAwMH0.test';

      const result = await verifySupabaseBearerToken(expiredToken);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('Token Refresh', () => {
    it('should handle token refresh correctly', async () => {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: testUserEmail,
        password: testUserPassword,
      });

      if (authError || !authData.session) {
        console.warn('Skipping test - unable to authenticate:', authError?.message);
        return;
      }

      // Verify initial token
      const initialToken = authData.session.access_token;
      const initialResult = await verifySupabaseBearerToken(initialToken);
      expect(initialResult.valid).toBe(true);

      // Refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError || !refreshData.session) {
        console.warn('Skipping refresh test - unable to refresh:', refreshError?.message);
        return;
      }

      // Verify refreshed token
      const newToken = refreshData.session.access_token;
      const newResult = await verifySupabaseBearerToken(newToken);
      expect(newResult.valid).toBe(true);

      if (newResult.valid && initialResult.valid) {
        // User ID should remain the same
        expect(newResult.principal.sub).toBe(initialResult.principal.sub);
      }
    }, 20000);
  });

  afterAll(async () => {
    // Clean up: sign out
    await supabase.auth.signOut();
  });
});
