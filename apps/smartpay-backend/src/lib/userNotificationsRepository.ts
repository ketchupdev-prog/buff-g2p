/**
 * Single source of SQL for user `notifications` inbox (DRY with mobile API routes).
 * Location: fintech/apps/smartpay-backend/src/lib/userNotificationsRepository.ts
 */
import type { Pool, PoolClient } from 'pg';
import { pool } from './db';
import type { ListUserNotificationsResult, UserNotificationPublic } from '../types/userNotifications';

const SELECT_PUBLIC =
  'id, type, title, message, read, metadata, created_at, read_at';

type DbClient = Pool | PoolClient;

function clientOrPool(c?: DbClient): DbClient {
  return c ?? pool;
}

/**
 * Normalize JSONB metadata (pg may return object or string in edge cases).
 */
function normalizeMetadata(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown;
      return typeof p === 'object' && p !== null && !Array.isArray(p)
        ? (p as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function mapPublicRow(r: Record<string, unknown>): UserNotificationPublic {
  return {
    id: String(r.id),
    type: String(r.type),
    title: String(r.title),
    message: String(r.message),
    read: Boolean(r.read),
    metadata: normalizeMetadata(r.metadata),
    created_at: r.created_at as Date,
    read_at: (r.read_at as Date | null) ?? null,
  };
}

export async function countUnreadForUser(userId: string, db: DbClient = clientOrPool()): Promise<number> {
  const res = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1::uuid AND read = false`,
    [userId]
  );
  return parseInt(res.rows[0]?.count ?? '0', 10);
}

export async function countMatchingFilter(
  userId: string,
  unreadOnly: boolean,
  db: DbClient = clientOrPool()
): Promise<number> {
  const sql = unreadOnly
    ? `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1::uuid AND read = false`
    : `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1::uuid`;
  const res = await db.query<{ count: string }>(sql, [userId]);
  return parseInt(res.rows[0]?.count ?? '0', 10);
}

export async function listNotificationsForUser(
  userId: string,
  options: { limit: number; offset: number; unreadOnly: boolean },
  db: DbClient = clientOrPool()
): Promise<ListUserNotificationsResult> {
  const { limit, offset, unreadOnly } = options;

  let listSql = `
    SELECT ${SELECT_PUBLIC}
    FROM notifications
    WHERE user_id = $1::uuid`;
  const params: unknown[] = [userId];
  if (unreadOnly) {
    listSql += ` AND read = false`;
  }
  listSql += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
  params.push(limit, offset);

  const [listRes, totalMatchingFilter, unreadCount] = await Promise.all([
    db.query(listSql, params),
    countMatchingFilter(userId, unreadOnly, db),
    countUnreadForUser(userId, db),
  ]);

  const rows = listRes.rows.map((r) => mapPublicRow(r as Record<string, unknown>));

  return { rows, totalMatchingFilter, unreadCount };
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
  db: DbClient = clientOrPool()
): Promise<UserNotificationPublic | null> {
  const res = await db.query(
    `UPDATE notifications
       SET read = true, read_at = NOW(), updated_at = NOW()
     WHERE id = $1::uuid AND user_id = $2::uuid
     RETURNING ${SELECT_PUBLIC}`,
    [notificationId, userId]
  );
  if (res.rowCount === 0) return null;
  return mapPublicRow(res.rows[0] as Record<string, unknown>);
}

export async function markAllNotificationsRead(
  userId: string,
  db: DbClient = clientOrPool()
): Promise<number> {
  const res = await db.query(
    `UPDATE notifications
       SET read = true, read_at = NOW(), updated_at = NOW()
     WHERE user_id = $1::uuid AND read = false
     RETURNING id`,
    [userId]
  );
  return res.rowCount ?? 0;
}

export async function deleteNotificationForUser(
  userId: string,
  notificationId: string,
  db: DbClient = clientOrPool()
): Promise<boolean> {
  const res = await db.query(
    `DELETE FROM notifications WHERE id = $1::uuid AND user_id = $2::uuid RETURNING id`,
    [notificationId, userId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function insertNotificationForUser(
  params: {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown> | null;
  },
  db: DbClient = clientOrPool()
): Promise<UserNotificationPublic> {
  const { id, userId, type, title, message, metadata } = params;
  const res = await db.query(
    `INSERT INTO notifications
      (id, user_id, type, title, message, read, metadata, created_at)
     VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, false, COALESCE($6::jsonb, '{}'::jsonb), NOW())
     RETURNING ${SELECT_PUBLIC}`,
    [id, userId, type, title, message, metadata != null ? JSON.stringify(metadata) : null]
  );
  return mapPublicRow(res.rows[0] as Record<string, unknown>);
}
