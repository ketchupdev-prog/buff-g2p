/**
 * Country Selection Service
 * 
 * Purpose: Handle country detection, selection, and localization
 * Location: mobile/services/countryService.ts
 * 
 * Features:
 * - Fetch supported countries
 * - Auto-detect user's country
 * - Store country preference
 * - Format currency and phone numbers per country
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const SELECTED_COUNTRY_KEY = '@selected_country';

export interface Country {
  code: string;
  name: string;
  currency: {
    code: string;
    symbol: string;
  };
  phonePrefix: string;
  flag: string;
  features: {
    vouchers?: boolean;
    cash_out?: boolean;
    loans?: boolean;
  };
}

/**
 * Fetch all supported countries from backend
 */
export async function getSupportedCountries(): Promise<Country[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/mobile/countries`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch countries: ${response.status}`);
    }
    
    const data = await response.json();
    return data.countries || [];
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
}

/**
 * Auto-detect user's country based on location/IP
 */
export async function detectCountry(): Promise<Country | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/mobile/countries/detect`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to detect country: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.detected && data.country) {
      return data.country;
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting country:', error);
    return null;
  }
}

/**
 * Get currently selected country from storage
 */
export async function getSelectedCountry(): Promise<Country | null> {
  try {
    const stored = await AsyncStorage.getItem(SELECTED_COUNTRY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error('Error getting selected country:', error);
    return null;
  }
}

/**
 * Save selected country to storage
 */
export async function setSelectedCountry(country: Country): Promise<void> {
  try {
    await AsyncStorage.setItem(SELECTED_COUNTRY_KEY, JSON.stringify(country));
  } catch (error) {
    console.error('Error saving selected country:', error);
    throw error;
  }
}

/**
 * Format currency according to country settings
 */
export function formatCurrency(amount: number, country?: Country): string {
  const selectedCountry = country;
  const symbol = selectedCountry?.currency.symbol || 'N$';
  const code = selectedCountry?.currency.code || 'NAD';
  
  return `${symbol}${amount.toFixed(2)} ${code}`;
}

/**
 * Format phone number according to country prefix
 */
export function formatPhoneNumber(phone: string, country?: Country): string {
  const prefix = country?.phonePrefix || '+264';
  
  // Remove any existing prefix
  let cleaned = phone.replace(/^\+?\d{1,3}/, '').trim();
  
  // Format as: +264 81 234 5678
  if (cleaned.length >= 9) {
    cleaned = cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  
  return `${prefix} ${cleaned}`;
}

/**
 * Validate phone number for country
 */
export function validatePhoneNumber(phone: string, country?: Country): boolean {
  const prefix = country?.phonePrefix || '+264';
  
  // Remove spaces and check format
  const cleaned = phone.replace(/\s/g, '');
  
  // Must start with country prefix or be 9+ digits
  if (cleaned.startsWith(prefix)) {
    return cleaned.length >= prefix.length + 9;
  }
  
  return cleaned.length >= 9;
}
