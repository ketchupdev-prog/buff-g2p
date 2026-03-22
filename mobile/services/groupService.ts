/**
 * Group Service
 * 
 * Manages group wallets, shared balances, member contributions, and group transactions.
 * Implements group send/request with contribution tracking.
 * 
 * Location: mobile/services/groupService.ts
 */

import { getSecureItem } from './secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export interface GroupMember {
  userId: string;
  name: string;
  phoneNumber: string;
  joinedAt: string;
  role: 'admin' | 'member';
  totalContributed: number;
  lastContribution?: string;
}

export interface GroupWallet {
  id: string;
  groupId: string;
  balance: number;
  currency: string;
  type: 'shared' | 'pooled';
  isActive: boolean;
  createdAt: string;
}

export interface GroupTransaction {
  id: string;
  groupId: string;
  type: 'contribution' | 'withdrawal' | 'send' | 'receive';
  amount: number;
  fromUserId?: string;
  toUserId?: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface GroupContribution {
  id: string;
  groupId: string;
  userId: string;
  amount: number;
  method: 'wallet' | 'voucher';
  transactionId: string;
  createdAt: string;
}

/**
 * Get group shared wallet balance.
 * 
 * @param groupId - Group ID
 * @returns Group wallet with balance
 */
export async function getGroupBalance(groupId: string): Promise<GroupWallet> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/groups/${groupId}/wallet`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch group balance: ${response.status}`);
    }

    const data = await response.json();
    return data.wallet;
  } catch (error) {
    console.error('Failed to get group balance:', error);
    throw error;
  }
}

/**
 * Get member contributions for a group.
 * 
 * @param groupId - Group ID
 * @returns Array of members with contribution totals
 */
export async function getGroupMemberContributions(groupId: string): Promise<GroupMember[]> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/groups/${groupId}/contributions`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch contributions: ${response.status}`);
    }

    const data = await response.json();
    return data.members;
  } catch (error) {
    console.error('Failed to get member contributions:', error);
    throw error;
  }
}

/**
 * Get group transaction history.
 * 
 * @param groupId - Group ID
 * @param limit - Number of transactions to fetch
 * @returns Array of group transactions
 */
export async function getGroupTransactions(
  groupId: string, 
  limit: number = 50
): Promise<GroupTransaction[]> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${API_URL}/api/v1/mobile/groups/${groupId}/transactions?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch group transactions: ${response.status}`);
    }

    const data = await response.json();
    return data.transactions;
  } catch (error) {
    console.error('Failed to get group transactions:', error);
    throw error;
  }
}

/**
 * Contribute to group wallet from personal wallet.
 * 
 * @param groupId - Group ID
 * @param amount - Amount to contribute
 * @param fromWalletId - Source wallet ID
 * @returns Transaction details
 */
export async function contributeToGroup(
  groupId: string,
  amount: number,
  fromWalletId: string
): Promise<GroupTransaction> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/groups/${groupId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        amount,
        fromWalletId,
        method: 'wallet'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Contribution failed: ${response.status}`);
    }

    const data = await response.json();
    return data.transaction;
  } catch (error) {
    console.error('Failed to contribute to group:', error);
    throw error;
  }
}

/**
 * Send money from group wallet to member or external recipient.
 * 
 * @param groupId - Group ID
 * @param recipientId - Recipient user ID or phone number
 * @param amount - Amount to send
 * @param description - Optional description
 * @returns Transaction details
 */
export async function sendFromGroup(
  groupId: string,
  recipientId: string,
  amount: number,
  description?: string
): Promise<GroupTransaction> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/groups/${groupId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        recipientId,
        amount,
        description
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Send failed: ${response.status}`);
    }

    const data = await response.json();
    return data.transaction;
  } catch (error) {
    console.error('Failed to send from group:', error);
    throw error;
  }
}

/**
 * Withdraw from group wallet to personal wallet.
 * 
 * @param groupId - Group ID
 * @param amount - Amount to withdraw
 * @param toWalletId - Destination wallet ID
 * @returns Transaction details
 */
export async function withdrawFromGroup(
  groupId: string,
  amount: number,
  toWalletId: string
): Promise<GroupTransaction> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/groups/${groupId}/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        amount,
        toWalletId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Withdrawal failed: ${response.status}`);
    }

    const data = await response.json();
    return data.transaction;
  } catch (error) {
    console.error('Failed to withdraw from group:', error);
    throw error;
  }
}

/**
 * Get contribution breakdown by member.
 * 
 * @param groupId - Group ID
 * @returns Contribution statistics
 */
export async function getContributionBreakdown(groupId: string): Promise<{
  total: number;
  byMember: Array<{
    userId: string;
    name: string;
    amount: number;
    percentage: number;
  }>;
}> {
  try {
    const members = await getGroupMemberContributions(groupId);
    const total = members.reduce((sum, member) => sum + member.totalContributed, 0);
    
    return {
      total,
      byMember: members.map(member => ({
        userId: member.userId,
        name: member.name,
        amount: member.totalContributed,
        percentage: total > 0 ? (member.totalContributed / total) * 100 : 0
      }))
    };
  } catch (error) {
    console.error('Failed to get contribution breakdown:', error);
    throw error;
  }
}
