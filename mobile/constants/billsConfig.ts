/**
 * Bills Configuration - Shared types and data for bill payment flows.
 * Used across multi-step bill payment wizard.
 * Location: constants/billsConfig.ts (moved from app/bills/ so Expo Router does not treat it as a route).
 */

export interface CategoryConfig {
  icon: string;
  color: string;
  acctLabel: string;
  acctPlaceholder: string;
  acctKeyboard: 'default' | 'phone-pad' | 'number-pad';
  hasToken: boolean; // electricity prepaid token
  hasPackages: boolean; // TV subscriptions, data bundles
  quickAmounts?: number[];
}

export interface Bundle {
  id: string;
  label: string;
  desc: string;
  amount: number;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  electricity: {
    icon: 'flash-outline',
    color: '#F59E0B',
    acctLabel: 'Meter Number',
    acctPlaceholder: 'e.g. 12345678',
    acctKeyboard: 'number-pad',
    hasToken: true,
    hasPackages: false,
    quickAmounts: [100, 200, 500, 1000, 2000],
  },
  water: {
    icon: 'water-outline',
    color: '#06B6D4',
    acctLabel: 'Account Number',
    acctPlaceholder: 'e.g. WDH-123456',
    acctKeyboard: 'default',
    hasToken: false,
    hasPackages: false,
    quickAmounts: [100, 200, 500],
  },
  airtime: {
    icon: 'phone-portrait-outline',
    color: '#0029D6',
    acctLabel: 'Mobile Number',
    acctPlaceholder: '+264 81 xxx xxxx',
    acctKeyboard: 'phone-pad',
    hasToken: false,
    hasPackages: true,
  },
  tv: {
    icon: 'tv-outline',
    color: '#7C3AED',
    acctLabel: 'Smart Card / IUC Number',
    acctPlaceholder: 'e.g. 1234567890',
    acctKeyboard: 'number-pad',
    hasToken: false,
    hasPackages: true,
  },
  internet: {
    icon: 'wifi-outline',
    color: '#10B981',
    acctLabel: 'Account Number',
    acctPlaceholder: 'e.g. TN-123456',
    acctKeyboard: 'default',
    hasToken: false,
    hasPackages: false,
    quickAmounts: [199, 299, 499, 999],
  },
  insurance: {
    icon: 'shield-outline',
    color: '#E11D48',
    acctLabel: 'Policy Number',
    acctPlaceholder: 'e.g. POL-123456',
    acctKeyboard: 'default',
    hasToken: false,
    hasPackages: false,
    quickAmounts: [250, 500, 1000, 1500],
  },
  tickets: {
    icon: 'ticket-outline',
    color: '#D97706',
    acctLabel: 'Booking Reference',
    acctPlaceholder: 'e.g. TKT-ABCD123',
    acctKeyboard: 'default',
    hasToken: false,
    hasPackages: false,
    quickAmounts: [50, 100, 200, 350],
  },
  other: {
    icon: 'document-text-outline',
    color: '#6B7280',
    acctLabel: 'Account / Reference Number',
    acctPlaceholder: 'Enter account number',
    acctKeyboard: 'default',
    hasToken: false,
    hasPackages: false,
    quickAmounts: [100, 200, 500, 1000],
  },
};

// ─── Packages / Bundles ─────────────────────────────────────────────────────

const AIRTIME_BUNDLES: Record<string, Bundle[]> = {
  mtc: [
    { id: 'air_10', label: 'N$10', desc: 'Airtime top-up', amount: 10 },
    { id: 'air_20', label: 'N$20', desc: 'Airtime top-up', amount: 20 },
    { id: 'air_50', label: 'N$50', desc: 'Airtime top-up', amount: 50 },
    { id: 'air_100', label: 'N$100', desc: 'Airtime top-up', amount: 100 },
    { id: 'air_200', label: 'N$200', desc: 'Airtime top-up', amount: 200 },
    { id: 'dat_100mb', label: '100 MB', desc: '1 day validity', amount: 10 },
    { id: 'dat_500mb', label: '500 MB', desc: '7 day validity', amount: 35 },
    { id: 'dat_1gb', label: '1 GB', desc: '30 day validity', amount: 65 },
    { id: 'dat_2gb', label: '2 GB', desc: '30 day validity', amount: 99 },
    { id: 'dat_5gb', label: '5 GB', desc: '30 day validity', amount: 199 },
    { id: 'dat_10gb', label: '10 GB', desc: '30 day validity', amount: 349 },
  ],
  telecom: [
    { id: 'air_10', label: 'N$10', desc: 'Airtime top-up', amount: 10 },
    { id: 'air_30', label: 'N$30', desc: 'Airtime top-up', amount: 30 },
    { id: 'air_50', label: 'N$50', desc: 'Airtime top-up', amount: 50 },
    { id: 'air_100', label: 'N$100', desc: 'Airtime top-up', amount: 100 },
    { id: 'dat_500mb', label: '500 MB', desc: '7 day validity', amount: 40 },
    { id: 'dat_1gb', label: '1 GB', desc: '30 day validity', amount: 75 },
    { id: 'dat_3gb', label: '3 GB', desc: '30 day validity', amount: 149 },
    { id: 'dat_10gb', label: '10 GB', desc: '30 day validity', amount: 399 },
  ],
  tn_mobile: [
    { id: 'air_5', label: 'N$5', desc: 'Airtime top-up', amount: 5 },
    { id: 'air_10', label: 'N$10', desc: 'Airtime top-up', amount: 10 },
    { id: 'air_20', label: 'N$20', desc: 'Airtime top-up', amount: 20 },
    { id: 'air_50', label: 'N$50', desc: 'Airtime top-up', amount: 50 },
    { id: 'dat_200mb', label: '200 MB', desc: '3 day validity', amount: 12 },
    { id: 'dat_1gb', label: '1 GB', desc: '30 day validity', amount: 49 },
    { id: 'dat_3gb', label: '3 GB', desc: '30 day validity', amount: 99 },
  ],
};

const TV_PACKAGES: Record<string, Bundle[]> = {
  dstv: [
    { id: 'access', label: 'Access', desc: '40+ channels', amount: 129 },
    { id: 'family', label: 'Family', desc: '80+ channels', amount: 229 },
    { id: 'compact', label: 'Compact', desc: '125+ channels', amount: 399 },
    { id: 'compact_plus', label: 'Compact Plus', desc: '155+ channels', amount: 549 },
    { id: 'premium', label: 'Premium', desc: '175+ channels + sport', amount: 879 },
  ],
  gotv: [
    { id: 'lite', label: 'GOtv Lite', desc: '15+ channels', amount: 39 },
    { id: 'value', label: 'GOtv Value', desc: '30+ channels', amount: 75 },
    { id: 'plus', label: 'GOtv Plus', desc: '45+ channels', amount: 119 },
    { id: 'max', label: 'GOtv Max', desc: '60+ channels', amount: 159 },
  ],
  showmax: [
    { id: 'mobile', label: 'Mobile', desc: 'Phone & tablet only', amount: 49 },
    { id: 'standard', label: 'Standard', desc: '2 screens at once', amount: 99 },
    { id: 'pro', label: 'Pro (with Sport)', desc: '2 screens + live sport', amount: 199 },
  ],
};

export function getBundles(billerId: string, category: string): Bundle[] {
  if (category === 'airtime') return AIRTIME_BUNDLES[billerId] ?? AIRTIME_BUNDLES.mtc;
  if (category === 'tv') return TV_PACKAGES[billerId] ?? TV_PACKAGES.dstv;
  return [];
}
