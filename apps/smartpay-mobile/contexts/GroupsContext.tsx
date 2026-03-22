/**
 * GroupsContext – Smartpay Mobile Groups Provider.
 * Manages user groups, members, and group transactions.
 * Location: fintech/smartpay/mobile/contexts/GroupsContext.tsx
 */
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useUser } from './UserContext';
import { getGroups as getGroupsService } from '@/services/groups';
import type { Group as ApiGroup, GroupMember as ApiGroupMember } from '@/types/api';

/**
 * Group member interface.
 */
export interface GroupMember {
  /** User ID */
  userId: string;
  /** Member name */
  name: string;
  /** Member phone number */
  phone?: string;
  /** Member avatar URL */
  avatarUrl?: string;
  /** Member role in group */
  role: 'admin' | 'member';
  /** Join date */
  joinedAt: string;
}

/**
 * Group interface with complete type definitions.
 */
export interface Group {
  /** Unique group identifier */
  id: string;
  /** Group name */
  name: string;
  /** Group description */
  description?: string;
  /** Group type/category */
  type: 'savings' | 'social' | 'business' | 'family';
  /** Group avatar/icon URL */
  avatarUrl?: string;
  /** Total group balance */
  balance: number;
  /** Currency code */
  currency: 'NAD';
  /** Array of group members */
  members: GroupMember[];
  /** Whether current user is admin */
  isAdmin: boolean;
  /** Group creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Groups context state interface.
 */
interface GroupsState {
  /** Array of user groups */
  groups: Group[];
  /** Loading state */
  isLoading: boolean;
  /** Error message (if any) */
  error: string | null;
}

/**
 * Groups context value interface with state and actions.
 */
interface GroupsContextValue extends GroupsState {
  /** Refresh groups from API */
  refresh: () => Promise<void>;
  /** Get group by ID */
  getGroupById: (id: string) => Group | undefined;
}

const GroupsContext = createContext<GroupsContextValue | undefined>(undefined);

function toIsoString(value: string | Date | undefined): string {
  if (value == null) return '';
  return typeof value === 'string' ? value : value.toISOString();
}

/**
 * Maps API group payload to the richer UI `Group` shape used by this context.
 */
function mapApiGroupToContextGroup(api: ApiGroup): Group {
  const members: GroupMember[] = (api.members ?? []).map((m: ApiGroupMember) => ({
    userId: m.userId || m.user_id || '',
    name: m.name,
    phone: m.phone,
    avatarUrl: m.photoUrl ?? m.photo_url ?? undefined,
    role: m.role === 'member' ? 'member' : 'admin',
    joinedAt: toIsoString(m.joinedAt ?? m.joined_at),
  }));

  const isAdmin = api.role === 'admin' || api.role === 'treasurer';

  return {
    id: api.id,
    name: api.name,
    description: api.description,
    type: 'social',
    avatarUrl: undefined,
    balance: api.balance ?? api.walletBalance ?? api.wallet_balance ?? 0,
    currency: 'NAD',
    members,
    isAdmin,
    createdAt: toIsoString(api.createdAt ?? api.created_at),
    updatedAt: toIsoString(api.updatedAt ?? api.updated_at ?? api.createdAt ?? api.created_at),
  };
}

/**
 * GroupsProvider component that fetches and manages groups state.
 * @param children - Child components
 */
export function GroupsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useUser();
  
  const [state, setState] = useState<GroupsState>({
    groups: [],
    isLoading: true,
    error: null,
  });

  /**
   * Fetches groups from the API endpoint.
   */
  const loadGroups = useCallback(async () => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch using shared service so auth headers/retry/error mapping are consistent.
      const apiGroups = await getGroupsService();
      const groups = apiGroups.map(mapApiGroupToContextGroup);

      setState({
        groups,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading groups:', error);
      }
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load groups',
        groups: prev.groups,
      }));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  /**
   * Refreshes groups data from API.
   */
  const refresh = useCallback(async () => {
    await loadGroups();
  }, [loadGroups]);

  /**
   * Gets a group by its ID.
   * @param id - Group ID
   * @returns Group object or undefined
   */
  const getGroupById = useCallback((id: string) => {
    return state.groups.find(g => g.id === id);
  }, [state.groups]);

  const value: GroupsContextValue = {
    ...state,
    refresh,
    getGroupById,
  };

  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
}

/**
 * Hook to access groups context.
 * @throws Error if used outside GroupsProvider
 */
export function useGroups(): GroupsContextValue {
  const context = useContext(GroupsContext);
  if (context === undefined) {
    throw new Error('useGroups must be used within a GroupsProvider');
  }
  return context;
}
