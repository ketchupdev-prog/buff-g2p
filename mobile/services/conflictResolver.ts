/**
 * Conflict Resolver Service
 * 
 * Handles data conflicts when local and server versions differ.
 * Implements multiple resolution strategies (server wins, local wins, merged).
 * 
 * Location: mobile/services/conflictResolver.ts
 */

import { getDatabase } from './offlineDb';

export type ConflictStrategy = 'server_wins' | 'local_wins' | 'merged' | 'manual';

export interface ConflictResolution {
  entityType: string;
  entityId: string;
  localVersion: any;
  serverVersion: any;
  resolvedVersion: any;
  strategy: ConflictStrategy;
}

/**
 * Resolve conflict between local and server versions.
 * 
 * @param entityType - Type of entity (wallet, transaction, voucher)
 * @param entityId - Entity ID
 * @param localVersion - Local version of data
 * @param serverVersion - Server version of data
 * @param strategy - Resolution strategy
 * @returns Resolved version
 */
export async function resolveConflict(
  entityType: string,
  entityId: string,
  localVersion: any,
  serverVersion: any,
  strategy: ConflictStrategy = 'server_wins'
): Promise<any> {
  const db = await getDatabase();
  
  let resolvedVersion: any;
  
  switch (strategy) {
    case 'server_wins':
      resolvedVersion = serverVersion;
      break;
    
    case 'local_wins':
      resolvedVersion = localVersion;
      break;
    
    case 'merged':
      resolvedVersion = mergeVersions(entityType, localVersion, serverVersion);
      break;
    
    case 'manual':
      // Queue for manual resolution
      throw new Error('Manual conflict resolution required');
    
    default:
      resolvedVersion = serverVersion;
  }
  
  // Log conflict
  await db.runAsync(
    `INSERT INTO sync_conflicts (entity_type, entity_id, local_version, server_version, resolution)
     VALUES (?, ?, ?, ?, ?)`,
    [
      entityType,
      entityId,
      JSON.stringify(localVersion),
      JSON.stringify(serverVersion),
      strategy
    ]
  );
  
  console.log(`Resolved conflict for ${entityType}:${entityId} using ${strategy}`);
  
  return resolvedVersion;
}

/**
 * Merge local and server versions intelligently.
 * 
 * @param entityType - Type of entity
 * @param local - Local version
 * @param server - Server version
 * @returns Merged version
 */
function mergeVersions(entityType: string, local: any, server: any): any {
  // Entity-specific merge logic
  switch (entityType) {
    case 'wallet':
      return mergeWallet(local, server);
    
    case 'transaction':
      return mergeTransaction(local, server);
    
    case 'voucher':
      return mergeVoucher(local, server);
    
    default:
      // Default: server wins for most fields, local wins for user-modified fields
      return {
        ...server,
        // Keep local user modifications
        name: local.name || server.name,
        icon: local.icon || server.icon,
        // Server always wins for critical fields
        balance: server.balance,
        status: server.status,
        amount: server.amount
      };
  }
}

/**
 * Merge wallet versions.
 */
function mergeWallet(local: any, server: any): any {
  return {
    ...server,
    // User-customizable fields from local
    name: local.name || server.name,
    icon: local.icon || server.icon,
    card_design_frame_id: local.card_design_frame_id || server.card_design_frame_id,
    // Financial fields always from server
    balance: server.balance,
    status: server.status,
    type: server.type,
    // Timestamps from server
    updated_at: server.updated_at,
    synced_at: new Date().toISOString()
  };
}

/**
 * Merge transaction versions.
 */
function mergeTransaction(local: any, server: any): any {
  // For transactions, server always wins (immutable once processed)
  return {
    ...server,
    // Only merge metadata if it exists locally but not on server
    metadata: server.metadata || local.metadata,
    synced_at: new Date().toISOString()
  };
}

/**
 * Merge voucher versions.
 */
function mergeVoucher(local: any, server: any): any {
  // For vouchers, server always wins (controlled by backend)
  return {
    ...server,
    synced_at: new Date().toISOString()
  };
}

/**
 * Get conflict history for an entity.
 * 
 * @param entityType - Type of entity
 * @param entityId - Entity ID
 * @returns Array of conflict records
 */
export async function getConflictHistory(
  entityType: string,
  entityId: string
): Promise<any[]> {
  const db = await getDatabase();
  
  const conflicts = await db.getAllAsync<any>(
    `SELECT * FROM sync_conflicts 
     WHERE entity_type = ? AND entity_id = ? 
     ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  
  return conflicts.map(conflict => ({
    id: conflict.id,
    entityType: conflict.entity_type,
    entityId: conflict.entity_id,
    localVersion: JSON.parse(conflict.local_version),
    serverVersion: JSON.parse(conflict.server_version),
    resolution: conflict.resolution,
    resolvedAt: conflict.resolved_at,
    createdAt: conflict.created_at
  }));
}

/**
 * Get all unresolved conflicts.
 * 
 * @returns Array of unresolved conflicts
 */
export async function getUnresolvedConflicts(): Promise<any[]> {
  const db = await getDatabase();
  
  const conflicts = await db.getAllAsync<any>(
    `SELECT * FROM sync_conflicts 
     WHERE resolved_at IS NULL 
     ORDER BY created_at DESC`
  );
  
  return conflicts.map(conflict => ({
    id: conflict.id,
    entityType: conflict.entity_type,
    entityId: conflict.entity_id,
    localVersion: JSON.parse(conflict.local_version),
    serverVersion: JSON.parse(conflict.server_version),
    resolution: conflict.resolution,
    createdAt: conflict.created_at
  }));
}

/**
 * Mark conflict as resolved.
 * 
 * @param conflictId - Conflict ID
 */
export async function markConflictResolved(conflictId: number): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    `UPDATE sync_conflicts SET resolved_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [conflictId]
  );
}

/**
 * Clear all conflict history.
 */
export async function clearConflictHistory(): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(`DELETE FROM sync_conflicts`);
  
  console.log('Conflict history cleared');
}
