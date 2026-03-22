/**
 * Gamification Context – Buffr G2P.
 * Cross-app badge system, points tracking, and achievement toasts.
 * §19 Cross-App Gamification & Micro-Interactions.
 *
 * Usage:
 *   const { recordEvent, points, badges } = useGamification();
 *   recordEvent('send');  // triggers badge evaluation
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Badge IDs ────────────────────────────────────────────────────────────────
export type BadgeId =
  | 'first_send'
  | 'first_receive'
  | 'first_voucher'
  | 'first_cashout'
  | 'first_proof'
  | 'streak_3'
  | 'streak_6'
  | 'streak_12'
  | 'first_scan'
  | 'first_group'
  | 'first_loan'
  | 'first_bill';

export type GamificationEvent =
  | 'send'
  | 'receive'
  | 'voucher_redeem'
  | 'cashout'
  | 'proof_of_life'
  | 'monthly_claim'
  | 'qr_scan'
  | 'group_created'
  | 'loan_applied'
  | 'bill_paid';

export interface BadgeMeta {
  label: string;
  icon: string;
  color: string;
}

export const BADGE_META: Record<BadgeId, BadgeMeta> = {
  first_send:    { label: 'First Transfer',    icon: 'paper-plane',      color: '#0029D6' },
  first_receive: { label: 'First Receive',     icon: 'arrow-down-circle', color: '#22C55E' },
  first_voucher: { label: 'Voucher Redeemed',  icon: 'gift',             color: '#F59E0B' },
  first_cashout: { label: 'First Cash-Out',    icon: 'cash',             color: '#8B5CF6' },
  first_proof:   { label: 'Identity Verified', icon: 'shield-checkmark', color: '#0891B2' },
  streak_3:      { label: '3-Month Streak',    icon: 'flame',            color: '#F97316' },
  streak_6:      { label: '6-Month Streak',    icon: 'flame',            color: '#EF4444' },
  streak_12:     { label: 'Year Champion',     icon: 'trophy',           color: '#EAB308' },
  first_scan:    { label: 'QR Pioneer',        icon: 'qr-code',          color: '#6366F1' },
  first_group:   { label: 'Community Builder', icon: 'people',           color: '#EC4899' },
  first_loan:    { label: 'First Loan',        icon: 'cash-outline',     color: '#10B981' },
  first_bill:    { label: 'Bill Master',       icon: 'receipt',          color: '#64748B' },
};

// ─── State ───────────────────────────────────────────────────────────────────
interface BadgeState {
  earned: boolean;
  earnedAt?: string;
}

interface GamificationState {
  points: number;
  badges: Record<BadgeId, BadgeState>;
  monthStreak: number;
  lastClaimMonth: string | null; // 'YYYY-MM'
  pendingToast: BadgeId | null;
  hydrated: boolean;
}

const ALL_BADGE_IDS: BadgeId[] = [
  'first_send', 'first_receive', 'first_voucher', 'first_cashout',
  'first_proof', 'streak_3', 'streak_6', 'streak_12',
  'first_scan', 'first_group', 'first_loan', 'first_bill',
];

function defaultBadges(): Record<BadgeId, BadgeState> {
  return Object.fromEntries(ALL_BADGE_IDS.map((id) => [id, { earned: false }])) as Record<BadgeId, BadgeState>;
}

const INITIAL_STATE: GamificationState = {
  points: 0,
  badges: defaultBadges(),
  monthStreak: 0,
  lastClaimMonth: null,
  pendingToast: null,
  hydrated: false,
};

// ─── Reducer ─────────────────────────────────────────────────────────────────
type Action =
  | { type: 'HYDRATE'; payload: Partial<GamificationState> }
  | { type: 'EARN_BADGE'; badgeId: BadgeId; points: number }
  | { type: 'ADD_POINTS'; points: number }
  | { type: 'UPDATE_STREAK'; month: string }
  | { type: 'CLEAR_TOAST' };

function reducer(state: GamificationState, action: Action): GamificationState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, hydrated: true };

    case 'EARN_BADGE':
      if (state.badges[action.badgeId].earned) return state;
      return {
        ...state,
        points: state.points + action.points,
        badges: {
          ...state.badges,
          [action.badgeId]: { earned: true, earnedAt: new Date().toISOString() },
        },
        pendingToast: action.badgeId,
      };

    case 'ADD_POINTS':
      return { ...state, points: state.points + action.points };

    case 'UPDATE_STREAK':
      return {
        ...state,
        monthStreak: state.monthStreak + 1,
        lastClaimMonth: action.month,
      };

    case 'CLEAR_TOAST':
      return { ...state, pendingToast: null };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'buffr_gamification_state';

interface GamificationContextValue {
  points: number;
  badges: Record<BadgeId, BadgeState>;
  monthStreak: number;
  pendingToast: BadgeId | null;
  recordEvent: (event: GamificationEvent) => void;
  clearToast: () => void;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw) as Partial<GamificationState>;
          dispatch({ type: 'HYDRATE', payload: { ...saved, pendingToast: null } });
        } else {
          dispatch({ type: 'HYDRATE', payload: {} });
        }
      })
      .catch(() => {
        dispatch({ type: 'HYDRATE', payload: {} });
      });
  }, []);

  // Debounce-persist state changes
  useEffect(() => {
    if (!state.hydrated) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const { hydrated, pendingToast, ...persistable } = state;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistable)).catch(() => {});
    }, 800);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [state]);

  const recordEvent = useCallback((event: GamificationEvent) => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    switch (event) {
      case 'send':
        dispatch({ type: 'EARN_BADGE', badgeId: 'first_send', points: 50 });
        dispatch({ type: 'ADD_POINTS', points: 10 });
        break;
      case 'receive':
        dispatch({ type: 'EARN_BADGE', badgeId: 'first_receive', points: 50 });
        dispatch({ type: 'ADD_POINTS', points: 10 });
        break;
      case 'voucher_redeem':
        dispatch({ type: 'EARN_BADGE', badgeId: 'first_voucher', points: 50 });
        dispatch({ type: 'ADD_POINTS', points: 25 });
        break;
      case 'cashout':
        dispatch({ type: 'EARN_BADGE', badgeId: 'first_cashout', points: 50 });
        dispatch({ type: 'ADD_POINTS', points: 10 });
        break;
      case 'proof_of_life':
        dispatch({ type: 'EARN_BADGE', badgeId: 'first_proof', points: 50 });
        dispatch({ type: 'ADD_POINTS', points: 20 });
        break;
      case 'monthly_claim': {
        dispatch({ type: 'ADD_POINTS', points: 25 });
        dispatch({ type: 'UPDATE_STREAK', month: thisMonth });
        // Streak badges evaluated after streak is updated — use current+1
        const nextStreak = state.monthStreak + 1;
        if (nextStreak >= 3)  dispatch({ type: 'EARN_BADGE', badgeId: 'streak_3', points: 100 });
        if (nextStreak >= 6)  dispatch({ type: 'EARN_BADGE', badgeId: 'streak_6', points: 150 });
        if (nextStreak >= 12) dispatch({ type: 'EARN_BADGE', badgeId: 'streak_12', points: 250 });
        break;
      }
      case 'qr_scan':
        dispatch({ type: 'EARN_BADGE', badgeId: 'first_scan', points: 30 });
        break;
      case 'group_created':
        dispatch({ type: 'EARN_BADGE', badgeId: 'first_group', points: 50 });
        break;
      case 'loan_applied':
        dispatch({ type: 'EARN_BADGE', badgeId: 'first_loan', points: 30 });
        break;
      case 'bill_paid':
        dispatch({ type: 'EARN_BADGE', badgeId: 'first_bill', points: 30 });
        dispatch({ type: 'ADD_POINTS', points: 10 });
        break;
    }
  }, [state.monthStreak]);

  const clearToast = useCallback(() => {
    dispatch({ type: 'CLEAR_TOAST' });
  }, []);

  return (
    <GamificationContext.Provider
      value={{
        points: state.points,
        badges: state.badges,
        monthStreak: state.monthStreak,
        pendingToast: state.pendingToast,
        recordEvent,
        clearToast,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification(): GamificationContextValue {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider');
  return ctx;
}
