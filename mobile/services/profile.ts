/**
 * Profile service – Buffr G2P.
 * Backend and database only. Handles profile updates and PIN changes via API.
 */
import { getSecureItem } from '@/services/secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

async function getAuthHeader(): Promise<{ Authorization: string } | Record<string, never>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Update user profile (firstName, lastName, photoUrl)
 */
export async function updateProfile(params: {
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}): Promise<{ success: boolean; user?: any; error?: string }> {
  if (!API_BASE_URL) {
    return { success: false, error: 'Backend not configured' };
  }
  
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/user/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error ?? 'Failed to update profile' };
  } catch (e) {
    console.error('updateProfile error:', e);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Change user PIN
 */
export async function changePin(params: {
  currentPin: string;
  newPin: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!API_BASE_URL) {
    return { success: false, error: 'Backend not configured' };
  }
  
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/auth/change-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true };
    }
    return { success: false, error: data.error ?? 'Failed to change PIN' };
  } catch (e) {
    console.error('changePin error:', e);
    return { success: false, error: 'Network error' };
  }
}
