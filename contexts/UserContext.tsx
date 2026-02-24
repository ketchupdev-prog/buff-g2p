/**
 * UserContext – Buffr G2P.
 * Holds user profile from onboarding (name, phone, photo) and Buffr ID/card number.
 * Persists to AsyncStorage; rehydrates on app load. Production: replace Buffr ID with API when backend exists.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PROFILE = 'buffr_user_profile';
const STORAGE_KEY_BUFFR_ID = 'buffr_card_id';
const STORAGE_KEY_POF_DUE = 'buffr_proof_of_life_due';
const STORAGE_KEY_WALLET_STATUS = 'buffr_wallet_status';

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone: string; // E.164 or display, e.g. +264811234567
  photoUri: string | null;
}

export type WalletStatus = 'active' | 'frozen' | 'deactivated';

export interface UserState {
  profile: UserProfile | null;
  buffrId: string | null; // unique account/card id; from API or generated
  cardNumberMasked: string | null; // display e.g. "XXXX XXXX XXXX 1234"
  expiryDate: string | null; // from API when available
  /** ISO date string; when proof-of-life is due (e.g. from GET /api/v1/mobile/user/profile). */
  proofOfLifeDueDate: string | null;
  /** From backend; when 'frozen' redirect to /proof-of-life/expired. */
  walletStatus: WalletStatus | null;
}

const defaultProfile: UserProfile = {
  firstName: '',
  lastName: '',
  phone: '',
  photoUri: null,
};

interface UserContextValue extends UserState {
  setProfile: (profile: Partial<UserProfile>) => Promise<void>;
  setBuffrId: (id: string, cardNumberMasked: string, expiryDate?: string | null) => Promise<void>;
  /** Set proof-of-life due date and wallet status (e.g. after fetching profile). */
  setProofOfLife: (dueDate: string | null, status: UserState['walletStatus']) => Promise<void>;
  clearUser: () => Promise<void>;
  isLoaded: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [buffrId, setBuffrIdState] = useState<string | null>(null);
  const [cardNumberMasked, setCardNumberMaskedState] = useState<string | null>(null);
  const [expiryDate, setExpiryDateState] = useState<string | null>(null);
  const [proofOfLifeDueDate, setProofOfLifeDueDateState] = useState<string | null>(null);
  const [walletStatus, setWalletStatusState] = useState<UserState['walletStatus']>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadFromStorage = useCallback(async () => {
    try {
      const [storedProfile, storedBuffrId, storedMasked, storedExpiry, storedPofDue, storedWalletStatus] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_PROFILE),
        AsyncStorage.getItem(STORAGE_KEY_BUFFR_ID),
        AsyncStorage.getItem('buffr_card_number_masked'),
        AsyncStorage.getItem('buffr_card_expiry'),
        AsyncStorage.getItem(STORAGE_KEY_POF_DUE),
        AsyncStorage.getItem(STORAGE_KEY_WALLET_STATUS),
      ]);
      if (storedProfile) {
        const p = JSON.parse(storedProfile) as UserProfile;
        setProfileState({ ...defaultProfile, ...p });
      }
      if (storedBuffrId) setBuffrIdState(storedBuffrId);
      if (storedMasked) setCardNumberMaskedState(storedMasked);
      if (storedExpiry) setExpiryDateState(storedExpiry);
      if (storedPofDue) setProofOfLifeDueDateState(storedPofDue);
      if (storedWalletStatus) setWalletStatusState(storedWalletStatus as UserState['walletStatus']);
    } catch (e) {
      console.error('UserContext loadFromStorage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const setProfile = useCallback(async (next: Partial<UserProfile>) => {
    const nextProfile = { ...defaultProfile, ...profile, ...next };
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(nextProfile));
      setProfileState(nextProfile);
    } catch (e) {
      console.error('UserContext setProfile:', e);
    }
  }, [profile]);

  const setBuffrId = useCallback(
    async (id: string, masked: string, expiry?: string | null) => {
      setBuffrIdState(id);
      setCardNumberMaskedState(masked);
      setExpiryDateState(expiry ?? null);
      await AsyncStorage.setItem(STORAGE_KEY_BUFFR_ID, id);
      await AsyncStorage.setItem('buffr_card_number_masked', masked);
      if (expiry != null) await AsyncStorage.setItem('buffr_card_expiry', expiry);
    },
    []
  );

  const setProofOfLife = useCallback(async (dueDate: string | null, status: UserState['walletStatus']) => {
    setProofOfLifeDueDateState(dueDate);
    setWalletStatusState(status);
    try {
      if (dueDate != null) await AsyncStorage.setItem(STORAGE_KEY_POF_DUE, dueDate);
      else await AsyncStorage.removeItem(STORAGE_KEY_POF_DUE);
      if (status != null) await AsyncStorage.setItem(STORAGE_KEY_WALLET_STATUS, status);
      else await AsyncStorage.removeItem(STORAGE_KEY_WALLET_STATUS);
    } catch (e) {
      console.error('UserContext setProofOfLife:', e);
    }
  }, []);

  const clearUser = useCallback(async () => {
    setProfileState(null);
    setBuffrIdState(null);
    setCardNumberMaskedState(null);
    setExpiryDateState(null);
    setProofOfLifeDueDateState(null);
    setWalletStatusState(null);
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY_PROFILE),
      AsyncStorage.removeItem(STORAGE_KEY_BUFFR_ID),
      AsyncStorage.removeItem('buffr_card_number_masked'),
      AsyncStorage.removeItem('buffr_card_expiry'),
      AsyncStorage.removeItem(STORAGE_KEY_POF_DUE),
      AsyncStorage.removeItem(STORAGE_KEY_WALLET_STATUS),
    ]);
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      profile,
      buffrId,
      cardNumberMasked,
      expiryDate,
      proofOfLifeDueDate,
      walletStatus,
      setProfile,
      setBuffrId,
      setProofOfLife,
      clearUser,
      isLoaded,
    }),
    [profile, buffrId, cardNumberMasked, expiryDate, proofOfLifeDueDate, walletStatus, setProfile, setBuffrId, setProofOfLife, clearUser, isLoaded]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
