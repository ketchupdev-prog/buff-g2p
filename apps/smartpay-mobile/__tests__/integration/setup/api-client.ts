/**
 * Test API Client Helpers
 * Location: fintech/smartpay-mobile/__tests__/integration/setup/api-client.ts
 * 
 * Purpose:
 * - Provide authenticated API client for tests
 * - Reduce boilerplate in test files
 * - Handle common request patterns
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getBackendUrl } from './test-servers';

const BACKEND_URL = getBackendUrl();

export class TestApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(token?: string) {
    this.token = token || null;
    this.client = axios.create({
      baseURL: BACKEND_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  setToken(token: string): void {
    this.token = token;
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  async sendMoney(params: {
    amount: number;
    beneficiaryPhone: string;
    sourceWalletId: string;
    note?: string;
  }): Promise<any> {
    return this.post('/api/v1/send-money', params);
  }

  async getWallets(): Promise<any> {
    return this.get('/api/v1/wallets');
  }

  async getWallet(walletId: string): Promise<any> {
    return this.get(`/api/v1/wallets/${walletId}`);
  }

  async createWallet(params: {
    name: string;
    currency: string;
    icon?: string;
  }): Promise<any> {
    return this.post('/api/v1/wallets', params);
  }

  async getVouchers(): Promise<any> {
    return this.get('/api/v1/vouchers');
  }

  async redeemVoucher(voucherCode: string): Promise<any> {
    return this.post('/api/v1/vouchers/redeem', { voucherCode });
  }

  async cashOutToAgent(params: {
    walletId: string;
    amount: number;
    agentCode?: string;
  }): Promise<any> {
    return this.post('/api/v1/cash-out/agent', params);
  }

  async cashOutToBank(params: {
    walletId: string;
    amount: number;
    bankAccount: string;
    bankCode: string;
  }): Promise<any> {
    return this.post('/api/v1/cash-out/bank', params);
  }

  async getTransactions(params?: {
    walletId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    return this.get('/api/v1/transactions', { params });
  }

  async getTransaction(transactionId: string): Promise<any> {
    return this.get(`/api/v1/transactions/${transactionId}`);
  }

  async createGroup(params: {
    name: string;
    description?: string;
    members?: Array<{ userId: string; phone: string }>;
  }): Promise<any> {
    return this.post('/api/v1/groups', params);
  }

  async getGroups(): Promise<any> {
    return this.get('/api/v1/groups');
  }

  async getGroup(groupId: string): Promise<any> {
    return this.get(`/api/v1/groups/${groupId}`);
  }

  async createSplit(
    groupId: string,
    params: {
      description: string;
      totalAmount: number;
      currency: string;
      splitType: 'equal' | 'custom';
    }
  ): Promise<any> {
    return this.post(`/api/v1/groups/${groupId}/split`, params);
  }

  async paySplit(
    groupId: string,
    splitId: string,
    params: {
      sourceWalletId: string;
    }
  ): Promise<any> {
    return this.post(`/api/v1/groups/${groupId}/splits/${splitId}/pay`, params);
  }
}

/**
 * Create authenticated API client for test user
 */
export function createTestApiClient(token: string): TestApiClient {
  return new TestApiClient(token);
}

/**
 * Create unauthenticated API client
 */
export function createUnauthenticatedClient(): TestApiClient {
  return new TestApiClient();
}
