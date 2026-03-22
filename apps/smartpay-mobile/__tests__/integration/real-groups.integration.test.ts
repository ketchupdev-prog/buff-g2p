/**
 * Real Groups and Split Bills Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/real-groups.integration.test.ts
 * 
 * Tests:
 * - Group creation with members
 * - Split bill creation
 * - Split payment
 * - Group member management
 * - Group wallet operations
 * - Real API calls and database operations
 */

import axios from 'axios';
import {
  initTestDatabase,
  closeTestDatabase,
  cleanupTestData,
  createTestUser,
  createTestWallet,
  createTestGroup,
  getWalletBalance,
  generateTestToken,
  getTestPool,
} from './setup/test-database';
import { getBackendUrl } from './setup/test-servers';

const BACKEND_URL = getBackendUrl();

describe('Real Groups and Split Bills Integration', () => {
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

  describe('Group Creation', () => {
    it('should create group with members', async () => {
      const creator = await createTestUser({
        phone: '+264811111111',
        firstName: 'Alice',
      });

      const member1 = await createTestUser({
        phone: '+264822222222',
        firstName: 'Bob',
      });

      const member2 = await createTestUser({
        phone: '+264833333333',
        firstName: 'Charlie',
      });

      const token = generateTestToken(creator.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/groups`,
        {
          name: 'Weekend Crew',
          description: 'Friends group for activities',
          members: [
            { userId: member1.id, phone: member1.phone },
            { userId: member2.id, phone: member2.phone },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.group.name).toBe('Weekend Crew');
      expect(response.data.data.group.created_by).toBe(creator.id);

      const groupId = response.data.data.group.id;

      const pool = getTestPool();
      const membersCheck = await pool.query(
        'SELECT user_id, role FROM group_members WHERE group_id = $1',
        [groupId]
      );

      expect(membersCheck.rowCount).toBe(3);
      
      const adminMember = membersCheck.rows.find((m) => m.role === 'admin');
      expect(adminMember.user_id).toBe(creator.id);
    }, 10000);

    it('should list user groups', async () => {
      const testUser = await createTestUser();
      const group1 = await createTestGroup({
        name: 'Group 1',
        createdBy: testUser.id,
      });

      const group2 = await createTestGroup({
        name: 'Group 2',
        createdBy: testUser.id,
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.get(`${BACKEND_URL}/api/v1/groups`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.groups).toHaveLength(2);

      const groupIds = response.data.data.groups.map((g: any) => g.id);
      expect(groupIds).toContain(group1.id);
      expect(groupIds).toContain(group2.id);
    });
  });

  describe('Group Details', () => {
    it('should fetch group details with members', async () => {
      const creator = await createTestUser({ firstName: 'Alice' });
      const member = await createTestUser({ firstName: 'Bob' });

      const group = await createTestGroup({
        name: 'Test Group',
        createdBy: creator.id,
        members: [member.id],
      });

      const token = generateTestToken(creator.id);

      const response = await axios.get(
        `${BACKEND_URL}/api/v1/groups/${group.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.group.id).toBe(group.id);
      expect(response.data.data.group.name).toBe('Test Group');
      expect(response.data.data.members).toHaveLength(2);
    });
  });

  describe('Split Bill Creation and Payment', () => {
    it('should create split bill and track payments', async () => {
      const creator = await createTestUser();
      const member1 = await createTestUser();
      const member2 = await createTestUser();

      await createTestWallet({ userId: creator.id, balance: 1000 });
      await createTestWallet({ userId: member1.id, balance: 1000 });
      await createTestWallet({ userId: member2.id, balance: 1000 });

      const group = await createTestGroup({
        name: 'Dinner Group',
        createdBy: creator.id,
        members: [member1.id, member2.id],
      });

      const token = generateTestToken(creator.id);

      const splitResponse = await axios.post(
        `${BACKEND_URL}/api/v1/groups/${group.id}/split`,
        {
          description: 'Dinner bill',
          totalAmount: 900,
          currency: 'NAD',
          splitType: 'equal',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(splitResponse.status).toBe(201);
      expect(splitResponse.data.success).toBe(true);
      expect(splitResponse.data.data.split.total_amount).toBe(900);
      expect(splitResponse.data.data.shares).toHaveLength(3);
      expect(splitResponse.data.data.shares[0].amount).toBe(300);

      const splitId = splitResponse.data.data.split.id;

      const pool = getTestPool();
      const splitCheck = await pool.query(
        'SELECT * FROM group_splits WHERE id = $1',
        [splitId]
      );

      expect(splitCheck.rowCount).toBe(1);
      expect(splitCheck.rows[0].status).toBe('pending');
    }, 10000);

    it('should pay split share and update balances', async () => {
      const creator = await createTestUser();
      const member1 = await createTestUser();

      const creatorWallet = await createTestWallet({
        userId: creator.id,
        balance: 1000,
      });
      await createTestWallet({ userId: member1.id, balance: 1000 });

      const group = await createTestGroup({
        name: 'Split Test',
        createdBy: creator.id,
        members: [member1.id],
      });

      const creatorToken = generateTestToken(creator.id);

      const splitResponse = await axios.post(
        `${BACKEND_URL}/api/v1/groups/${group.id}/split`,
        {
          description: 'Test split',
          totalAmount: 400,
          currency: 'NAD',
          splitType: 'equal',
        },
        {
          headers: {
            Authorization: `Bearer ${creatorToken}`,
          },
        }
      );

      const splitId = splitResponse.data.data.split.id;
      const initialBalance = await getWalletBalance(creatorWallet.id);

      const paymentResponse = await axios.post(
        `${BACKEND_URL}/api/v1/groups/${group.id}/splits/${splitId}/pay`,
        {
          sourceWalletId: creatorWallet.id,
        },
        {
          headers: {
            Authorization: `Bearer ${creatorToken}`,
          },
        }
      );

      expect(paymentResponse.status).toBe(200);
      expect(paymentResponse.data.success).toBe(true);

      const finalBalance = await getWalletBalance(creatorWallet.id);
      expect(finalBalance).toBe(initialBalance - 200);

      const pool = getTestPool();
      const shareCheck = await pool.query(
        `SELECT status FROM group_split_shares 
         WHERE split_id = $1 AND user_id = $2`,
        [splitId, creator.id]
      );

      expect(shareCheck.rows[0].status).toBe('paid');
    }, 10000);
  });

  describe('Group Member Management', () => {
    it('should add member to existing group', async () => {
      const creator = await createTestUser();
      const newMember = await createTestUser({ phone: '+264811111111' });

      const group = await createTestGroup({
        name: 'Expandable Group',
        createdBy: creator.id,
      });

      const token = generateTestToken(creator.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/groups/${group.id}/members`,
        {
          userId: newMember.id,
          phone: newMember.phone,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);

      const pool = getTestPool();
      const memberCheck = await pool.query(
        'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
        [group.id, newMember.id]
      );

      expect(memberCheck.rowCount).toBe(1);
    }, 10000);

    it('should allow member to leave group', async () => {
      const creator = await createTestUser();
      const member = await createTestUser();

      const group = await createTestGroup({
        name: 'Leavable Group',
        createdBy: creator.id,
        members: [member.id],
      });

      const memberToken = generateTestToken(member.id);

      const pool = getTestPool();
      const membershipResult = await pool.query(
        'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
        [group.id, member.id]
      );

      const membershipId = membershipResult.rows[0].id;

      const response = await axios.delete(
        `${BACKEND_URL}/api/v1/groups/${group.id}/members/${membershipId}`,
        {
          headers: {
            Authorization: `Bearer ${memberToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const memberCheck = await pool.query(
        'SELECT * FROM group_members WHERE id = $1',
        [membershipId]
      );

      expect(memberCheck.rowCount).toBe(0);
    }, 10000);
  });

  describe('Group Reminders', () => {
    it('should send reminder for unpaid split', async () => {
      const creator = await createTestUser();
      const member = await createTestUser();

      await createTestWallet({ userId: creator.id, balance: 1000 });
      await createTestWallet({ userId: member.id, balance: 1000 });

      const group = await createTestGroup({
        name: 'Reminder Test',
        createdBy: creator.id,
        members: [member.id],
      });

      const token = generateTestToken(creator.id);

      const splitResponse = await axios.post(
        `${BACKEND_URL}/api/v1/groups/${group.id}/split`,
        {
          description: 'Test reminder',
          totalAmount: 200,
          currency: 'NAD',
          splitType: 'equal',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const splitId = splitResponse.data.data.split.id;

      const reminderResponse = await axios.post(
        `${BACKEND_URL}/api/v1/groups/${group.id}/splits/${splitId}/remind`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(reminderResponse.status).toBe(200);
      expect(reminderResponse.data.success).toBe(true);
    }, 10000);
  });
});
