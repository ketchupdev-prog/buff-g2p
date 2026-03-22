/**
 * Background Sync Service
 * 
 * Manages background synchronization of offline data with backend.
 * Handles pull (server → local) and push (local → server) operations.
 * 
 * Location: mobile/services/backgroundSync.ts
 */

import NetInfo from '@react-native-community/netinfo';
import { getDatabase } from './offlineDb';
import { getSecureItem } from './secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

interface SyncConfig {
  enabled: boolean;
  interval: number; // milliseconds
  batchSize: number;
  retryDelay: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  enabled: true,
  interval: 30000, // 30 seconds when online
  batchSize: 10,
  retryDelay: 5000
};

class BackgroundSyncService {
  private config: SyncConfig = DEFAULT_CONFIG;
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private isOnline = false;

  /**
   * Initialize the background sync service.
   * Starts listening to network state changes.
   */
  async initialize() {
    console.log('Initializing background sync service...');
    
    // Listen to network state
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
      
      console.log(`Network state changed: ${wasOnline ? 'online' : 'offline'} → ${this.isOnline ? 'online' : 'offline'}`);
      
      if (this.isOnline && !wasOnline) {
        // Just came online - start sync immediately
        console.log('Device came online, starting sync...');
        this.startSync();
      } else if (!this.isOnline && wasOnline) {
        // Just went offline - stop sync
        console.log('Device went offline, stopping sync...');
        this.stopSync();
      }
    });

    // Initial check
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
    
    console.log(`Initial network state: ${this.isOnline ? 'online' : 'offline'}`);
    
    if (this.isOnline) {
      this.startSync();
    }
  }

  private startSync() {
    if (this.syncTimer) {
      console.log('Sync already running');
      return;
    }
    
    console.log('Starting periodic sync...');
    
    this.syncTimer = setInterval(() => {
      this.performSync();
    }, this.config.interval);
    
    // Immediate sync
    this.performSync();
  }

  private stopSync() {
    if (this.syncTimer) {
      console.log('Stopping periodic sync...');
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private async performSync() {
    if (this.isSyncing || !this.isOnline) {
      return;
    }
    
    this.isSyncing = true;
    console.log('Starting sync cycle...');
    
    try {
      // 1. Pull latest data from server
      await this.pullFromServer();
      
      // 2. Push local changes to server
      await this.pushToServer();
      
      // 3. Process sync queue
      await this.processSyncQueue();
      
      // 4. Clean up old data
      await this.cleanupOldData();
      
      console.log('Sync cycle completed successfully');
    } catch (error) {
      console.error('Background sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async pullFromServer() {
    console.log('Pulling data from server...');
    
    try {
      const authToken = await getSecureItem('buffr_access_token');
      if (!authToken) {
        console.log('No auth token, skipping pull');
        return;
      }

      // Sync wallets
      await this.syncWallets(authToken);
      
      // Sync transactions
      await this.syncTransactions(authToken);
      
      // Sync vouchers
      await this.syncVouchers(authToken);
      
      console.log('Pull from server completed');
    } catch (error) {
      console.error('Failed to pull from server:', error);
    }
  }

  private async syncWallets(authToken: string) {
    try {
      const response = await fetch(`${API_URL}/api/v1/mobile/wallets`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch wallets: ${response.status}`);
      }

      const data = await response.json();
      const wallets = data.wallets || [];

      const db = await getDatabase();
      
      for (const wallet of wallets) {
        await db.runAsync(
          `INSERT OR REPLACE INTO wallet_cache (
            id, wallet_id, user_id, name, type, balance, icon, 
            card_design_frame_id, is_main, synced_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            wallet.id,
            wallet.id,
            wallet.user_id,
            wallet.name,
            wallet.type || 'additional',
            wallet.balance || 0,
            wallet.icon || null,
            wallet.card_design_frame_id || null,
            wallet.is_main ? 1 : 0
          ]
        );
      }
      
      console.log(`Synced ${wallets.length} wallets`);
    } catch (error) {
      console.error('Failed to sync wallets:', error);
    }
  }

  private async syncTransactions(authToken: string) {
    try {
      const response = await fetch(`${API_URL}/api/v1/mobile/transactions?limit=100`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }

      const data = await response.json();
      const transactions = data.transactions || [];

      const db = await getDatabase();
      
      for (const tx of transactions) {
        await db.runAsync(
          `INSERT OR REPLACE INTO transaction_cache (
            id, transaction_id, wallet_id, type, amount, status, 
            counterparty, description, reference, metadata, synced_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
          [
            tx.id,
            tx.id,
            tx.wallet_id,
            tx.type,
            tx.amount,
            tx.status,
            tx.counterparty || null,
            tx.description || null,
            tx.reference || null,
            tx.metadata ? JSON.stringify(tx.metadata) : null,
            tx.created_at
          ]
        );
      }
      
      console.log(`Synced ${transactions.length} transactions`);
    } catch (error) {
      console.error('Failed to sync transactions:', error);
    }
  }

  private async syncVouchers(authToken: string) {
    try {
      const response = await fetch(`${API_URL}/api/v1/mobile/vouchers`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vouchers: ${response.status}`);
      }

      const data = await response.json();
      const vouchers = data.vouchers || [];

      const db = await getDatabase();
      
      for (const voucher of vouchers) {
        await db.runAsync(
          `INSERT OR REPLACE INTO voucher_cache (
            id, voucher_id, voucher_code, amount, status, type, 
            issued_by, expires_at, metadata, synced_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            voucher.id,
            voucher.id,
            voucher.voucher_code,
            voucher.amount,
            voucher.status || 'available',
            voucher.type || null,
            voucher.issued_by || null,
            voucher.expires_at || null,
            voucher.metadata ? JSON.stringify(voucher.metadata) : null
          ]
        );
      }
      
      console.log(`Synced ${vouchers.length} vouchers`);
    } catch (error) {
      console.error('Failed to sync vouchers:', error);
    }
  }

  private async pushToServer() {
    console.log('Pushing local changes to server...');
    
    const db = await getDatabase();
    
    try {
      // Find local transactions not synced
      const localTransactions = await db.getAllAsync<any>(
        `SELECT * FROM transaction_cache WHERE created_locally = 1 AND synced_at IS NULL LIMIT ?`,
        [this.config.batchSize]
      );
      
      console.log(`Found ${localTransactions.length} local transactions to push`);
      
      for (const tx of localTransactions) {
        try {
          await this.pushTransaction(tx);
          
          // Mark as synced
          await db.runAsync(
            `UPDATE transaction_cache SET synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [tx.id]
          );
          
          console.log(`Pushed transaction ${tx.id}`);
        } catch (error) {
          console.error(`Failed to push transaction ${tx.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to push to server:', error);
    }
  }

  private async pushTransaction(tx: any) {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('No auth token');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Idempotency-Key': tx.transaction_id
      },
      body: JSON.stringify({
        wallet_id: tx.wallet_id,
        type: tx.type,
        amount: tx.amount,
        counterparty: tx.counterparty,
        description: tx.description,
        reference: tx.reference
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to push transaction: ${response.status}`);
    }
  }

  private async processSyncQueue() {
    console.log('Processing sync queue...');
    
    const db = await getDatabase();
    
    try {
      // Get pending items from queue
      const queueItems = await db.getAllAsync<any>(
        `SELECT * FROM sync_queue 
         WHERE status = 'pending' AND retry_count < max_retries 
         ORDER BY created_at LIMIT ?`,
        [this.config.batchSize]
      );
      
      console.log(`Processing ${queueItems.length} queued items`);
      
      for (const item of queueItems) {
        try {
          // Mark as in progress
          await db.runAsync(
            `UPDATE sync_queue SET status = 'in_progress', attempted_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [item.id]
          );
          
          // Process based on operation type
          await this.processQueueItem(item);
          
          // Mark as completed
          await db.runAsync(
            `UPDATE sync_queue SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [item.id]
          );
          
          console.log(`Processed queue item ${item.id} (${item.operation_type})`);
        } catch (error) {
          console.error(`Failed to process queue item ${item.id}:`, error);
          
          // Increment retry count
          await db.runAsync(
            `UPDATE sync_queue SET status = 'pending', retry_count = retry_count + 1, error = ? WHERE id = ?`,
            [error instanceof Error ? error.message : String(error), item.id]
          );
        }
      }
    } catch (error) {
      console.error('Failed to process sync queue:', error);
    }
  }

  private async processQueueItem(item: any) {
    const payload = JSON.parse(item.payload);
    
    switch (item.operation_type) {
      case 'register_offline_code':
        await this.registerOfflineCode(payload);
        break;
      case 'voucher_redeem':
        await this.syncVoucherRedemption(payload);
        break;
      case 'wallet_update':
        await this.syncWalletUpdate(payload);
        break;
      default:
        throw new Error(`Unknown operation type: ${item.operation_type}`);
    }
  }

  private async registerOfflineCode(payload: any) {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('No auth token');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/offline-codes/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to register offline code: ${response.status} - ${error}`);
    }
    
    console.log(`Registered offline code: ${payload.code}`);
  }

  private async syncVoucherRedemption(payload: any) {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('No auth token');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/vouchers/${payload.voucherId}/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        wallet_id: payload.walletId,
        method: 'wallet'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to redeem voucher: ${response.status}`);
    }
  }

  private async syncWalletUpdate(payload: any) {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('No auth token');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/wallets/${payload.walletId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload.updates)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update wallet: ${response.status}`);
    }
  }

  private async cleanupOldData() {
    console.log('Cleaning up old data...');
    
    const db = await getDatabase();
    
    try {
      // Delete completed sync queue items older than 7 days
      await db.runAsync(
        `DELETE FROM sync_queue WHERE status = 'completed' AND completed_at < datetime('now', '-7 days')`
      );
      
      // Delete expired offline codes
      await db.runAsync(
        `DELETE FROM offline_codes WHERE status IN ('used', 'expired') AND expires_at < datetime('now', '-7 days')`
      );
      
      // Delete old analytics events that are synced
      await db.runAsync(
        `DELETE FROM analytics_queue WHERE synced = 1 AND created_at < datetime('now', '-30 days')`
      );
      
      console.log('Cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  /**
   * Manually trigger a sync cycle.
   */
  async manualSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Device is offline');
    }
    
    await this.performSync();
  }

  /**
   * Get current sync status.
   */
  getSyncStatus(): { isOnline: boolean; isSyncing: boolean } {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing
    };
  }
}

export const backgroundSync = new BackgroundSyncService();
