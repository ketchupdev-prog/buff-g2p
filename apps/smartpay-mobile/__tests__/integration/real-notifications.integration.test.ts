/**
 * Real Notifications Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/real-notifications.integration.test.ts
 * 
 * Tests:
 * - Notification creation
 * - Notification listing
 * - Mark as read
 * - Delete notification
 * - Clear all notifications
 * - Real API calls and database operations
 */

import crypto from 'crypto';
import axios from 'axios';
import {
  initTestDatabase,
  closeTestDatabase,
  cleanupTestData,
  createTestUser,
  generateTestToken,
  getTestPool,
} from './setup/test-database';
import { getBackendUrl } from './setup/test-servers';

const BACKEND_URL = getBackendUrl();

describe('Real Notifications Integration', () => {
  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestData();
    await closeTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Notification Listing', () => {
    it('should fetch user notifications', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      
      const notificationId1 = crypto.randomUUID();
      const notificationId2 = crypto.randomUUID();

      await pool.query(
        `INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at)
         VALUES 
           ($1, $2, 'transaction_completed', 'Payment Received', 'You received NAD 500', false, NOW()),
           ($3, $2, 'voucher_issued', 'New Voucher', 'You have a new voucher worth NAD 1000', false, NOW())`,
        [notificationId1, testUser.id, notificationId2]
      );

      const response = await axios.get(`${BACKEND_URL}/api/v1/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.notifications).toHaveLength(2);
      expect(response.data.data.unreadCount).toBe(2);

      const types = response.data.data.notifications.map((n: any) => n.type);
      expect(types).toContain('transaction_completed');
      expect(types).toContain('voucher_issued');
    });

    it('should return empty list for user with no notifications', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const response = await axios.get(`${BACKEND_URL}/api/v1/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.notifications).toHaveLength(0);
      expect(response.data.data.unreadCount).toBe(0);
    });
  });

  describe('Mark as Read', () => {
    it('should mark notification as read', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      const notificationId = crypto.randomUUID();

      await pool.query(
        `INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at)
         VALUES ($1, $2, 'system', 'Test', 'Test notification', false, NOW())`,
        [notificationId, testUser.id]
      );

      const response = await axios.patch(
        `${BACKEND_URL}/api/v1/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const notificationCheck = await pool.query(
        'SELECT is_read FROM notifications WHERE id = $1',
        [notificationId]
      );

      expect(notificationCheck.rows[0].is_read).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();

      await pool.query(
        `INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at)
         VALUES 
           ($1, $2, 'system', 'Test 1', 'Body 1', false, NOW()),
           ($3, $2, 'system', 'Test 2', 'Body 2', false, NOW()),
           ($4, $2, 'system', 'Test 3', 'Body 3', false, NOW())`,
        [crypto.randomUUID(), testUser.id, crypto.randomUUID(), crypto.randomUUID()]
      );

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/notifications/mark-all-read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const unreadCheck = await pool.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
        [testUser.id]
      );

      expect(parseInt(unreadCheck.rows[0].count)).toBe(0);
    }, 10000);
  });

  describe('Delete Notification', () => {
    it('should delete single notification', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      const notificationId = crypto.randomUUID();

      await pool.query(
        `INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at)
         VALUES ($1, $2, 'system', 'Delete Me', 'This will be deleted', false, NOW())`,
        [notificationId, testUser.id]
      );

      const response = await axios.delete(
        `${BACKEND_URL}/api/v1/notifications/${notificationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const notificationCheck = await pool.query(
        'SELECT * FROM notifications WHERE id = $1',
        [notificationId]
      );

      expect(notificationCheck.rowCount).toBe(0);
    });
  });

  describe('Notification Types', () => {
    it('should handle different notification types', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();

      const notificationTypes = [
        'transaction_completed',
        'transaction_failed',
        'voucher_issued',
        'voucher_redeemed',
        'kyc_approved',
        'kyc_rejected',
        'proof_of_life_due',
        'group_invite',
        'split_payment_reminder',
      ];

      for (const type of notificationTypes) {
        await pool.query(
          `INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, false, NOW())`,
          [
            crypto.randomUUID(),
            testUser.id,
            type,
            `Notification: ${type}`,
            `Body for ${type}`,
          ]
        );
      }

      const response = await axios.get(`${BACKEND_URL}/api/v1/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.notifications).toHaveLength(notificationTypes.length);

      const receivedTypes = response.data.data.notifications.map((n: any) => n.type);
      notificationTypes.forEach((type) => {
        expect(receivedTypes).toContain(type);
      });
    }, 10000);
  });

  describe('Notification Pagination', () => {
    it('should paginate notifications', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();

      for (let i = 0; i < 25; i++) {
        await pool.query(
          `INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at)
           VALUES ($1, $2, 'system', $3, $4, false, NOW() - INTERVAL '${i} minutes')`,
          [
            crypto.randomUUID(),
            testUser.id,
            `Notification ${i}`,
            `Body ${i}`,
          ]
        );
      }

      const response = await axios.get(
        `${BACKEND_URL}/api/v1/notifications?limit=10&offset=0`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.notifications).toHaveLength(10);
      expect(response.data.data.pagination.total).toBe(25);
      expect(response.data.data.pagination.hasMore).toBe(true);
    }, 15000);
  });
});
