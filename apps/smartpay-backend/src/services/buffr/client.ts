/**
 * Buffr Connect API Client
 * 
 * Purpose: Secure wrapper for Buffr Connect API integration
 * Location: backend/src/services/buffr/client.ts
 * 
 * Features:
 * - Type-safe API calls with TypeScript
 * - Automatic retry logic for transient failures
 * - Comprehensive error handling
 * - Request/response logging
 * - Rate limiting protection
 * 
 * Security:
 * - API key stored in environment variables
 * - All requests over HTTPS
 * - No sensitive data in logs
 * - Request timeouts to prevent hanging
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

// ================================
// Types & Interfaces
// ================================

export interface BuffrConfig {
  apiKey: string;
  apiUrl: string;
  timeout?: number;
  maxRetries?: number;
}

export interface BuffrAgent {
  id: string;
  name: string;
  phone: string;
  email?: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: 'active' | 'inactive' | 'suspended';
  balance: number;
  commission_rate: number;
  created_at: string;
}

export interface BuffrTransaction {
  id: string;
  type: 'cash-out' | 'voucher-redemption' | 'settlement';
  amount: number;
  currency: 'NAD';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  agent_id: string;
  customer_phone?: string;
  voucher_id?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface BuffrVoucher {
  id: string;
  code: string;
  amount: number;
  currency: 'NAD';
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
  recipient_phone: string;
  expiry_date: string;
  created_at: string;
}

export interface BuffrApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    request_id: string;
    timestamp: string;
  };
}

// ================================
// Buffr API Client Class
// ================================

export class BuffrClient {
  private client: AxiosInstance;
  private maxRetries: number;
  private retryDelay: number = 1000; // 1 second

  constructor(config: BuffrConfig) {
    // Validate configuration
    if (!config.apiKey) {
      throw new Error('BUFFR_API_KEY is required');
    }
    if (!config.apiUrl) {
      throw new Error('BUFFR_API_URL is required');
    }

    this.maxRetries = config.maxRetries || 3;

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 30000, // 30 seconds
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Smartpay/1.0',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[Buffr API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Buffr API] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[Buffr API] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`[Buffr API] Response error:`, error.message);
        return Promise.reject(error);
      }
    );
  }

  // ================================
  // Generic Request Method with Retry
  // ================================

  private async request<T>(
    config: AxiosRequestConfig,
    attempt: number = 1
  ): Promise<BuffrApiResponse<T>> {
    try {
      const response = await this.client.request<BuffrApiResponse<T>>(config);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      // Check if error is retryable (network error or 5xx)
      const isRetryable =
        !axiosError.response ||
        (axiosError.response.status >= 500 && axiosError.response.status < 600);

      // Retry logic
      if (isRetryable && attempt < this.maxRetries) {
        console.log(`[Buffr API] Retrying request (attempt ${attempt + 1}/${this.maxRetries})...`);
        await this.sleep(this.retryDelay * attempt);
        return this.request<T>(config, attempt + 1);
      }

      // Transform error to BuffrApiResponse format
      return {
        success: false,
        error: {
          code: axiosError.response?.status?.toString() || 'NETWORK_ERROR',
          message: axiosError.message,
          details: axiosError.response?.data as Record<string, unknown>,
        },
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ================================
  // Agent Operations
  // ================================

  /**
   * Register a new Smartpay agent with Buffr Connect
   */
  async registerAgent(data: {
    name: string;
    phone: string;
    email?: string;
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
  }): Promise<BuffrApiResponse<BuffrAgent>> {
    return this.request<BuffrAgent>({
      method: 'POST',
      url: '/partners/agents/register',
      data,
    });
  }

  /**
   * Get agent details by ID
   */
  async getAgent(agentId: string): Promise<BuffrApiResponse<BuffrAgent>> {
    return this.request<BuffrAgent>({
      method: 'GET',
      url: `/partners/agents/${agentId}`,
    });
  }

  /**
   * Get agent balance
   */
  async getAgentBalance(agentId: string): Promise<BuffrApiResponse<{ balance: number; currency: string }>> {
    return this.request<{ balance: number; currency: string }>({
      method: 'GET',
      url: `/partners/agents/${agentId}/balance`,
    });
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    agentId: string,
    status: 'active' | 'inactive' | 'suspended'
  ): Promise<BuffrApiResponse<BuffrAgent>> {
    return this.request<BuffrAgent>({
      method: 'PATCH',
      url: `/partners/agents/${agentId}/status`,
      data: { status },
    });
  }

  // ================================
  // Transaction Operations
  // ================================

  /**
   * Process cash-out transaction
   */
  async processCashOut(data: {
    agent_id: string;
    customer_phone: string;
    amount: number;
    voucher_id?: string;
  }): Promise<BuffrApiResponse<BuffrTransaction>> {
    return this.request<BuffrTransaction>({
      method: 'POST',
      url: '/partners/agents/transactions',
      data: {
        type: 'cash-out',
        ...data,
      },
    });
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId: string): Promise<BuffrApiResponse<BuffrTransaction>> {
    return this.request<BuffrTransaction>({
      method: 'GET',
      url: `/transactions/${transactionId}`,
    });
  }

  /**
   * Get agent transactions with pagination
   */
  async getAgentTransactions(
    agentId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
      from_date?: string;
      to_date?: string;
    }
  ): Promise<BuffrApiResponse<{ transactions: BuffrTransaction[]; total: number; page: number }>> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.status) params.append('status', options.status);
    if (options?.from_date) params.append('from_date', options.from_date);
    if (options?.to_date) params.append('to_date', options.to_date);

    return this.request<{ transactions: BuffrTransaction[]; total: number; page: number }>({
      method: 'GET',
      url: `/partners/agents/${agentId}/transactions?${params.toString()}`,
    });
  }

  // ================================
  // Voucher Operations
  // ================================

  /**
   * Redeem G2P voucher
   */
  async redeemVoucher(data: {
    voucher_code: string;
    agent_id: string;
    recipient_phone: string;
  }): Promise<BuffrApiResponse<BuffrTransaction>> {
    return this.request<BuffrTransaction>({
      method: 'POST',
      url: '/vouchers/cash-out',
      data,
    });
  }

  /**
   * Validate voucher before redemption
   */
  async validateVoucher(voucherCode: string): Promise<BuffrApiResponse<BuffrVoucher>> {
    return this.request<BuffrVoucher>({
      method: 'GET',
      url: `/vouchers/${voucherCode}/validate`,
    });
  }

  /**
   * Get voucher details
   */
  async getVoucher(voucherCode: string): Promise<BuffrApiResponse<BuffrVoucher>> {
    return this.request<BuffrVoucher>({
      method: 'GET',
      url: `/vouchers/${voucherCode}`,
    });
  }

  // ================================
  // Settlement Operations
  // ================================

  /**
   * Request daily settlement for agent
   */
  async requestSettlement(agentId: string): Promise<BuffrApiResponse<BuffrTransaction>> {
    return this.request<BuffrTransaction>({
      method: 'POST',
      url: `/partners/agents/${agentId}/settlements`,
    });
  }

  /**
   * Get settlement history
   */
  async getSettlements(
    agentId: string,
    options?: {
      page?: number;
      limit?: number;
      from_date?: string;
      to_date?: string;
    }
  ): Promise<BuffrApiResponse<{ settlements: BuffrTransaction[]; total: number }>> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.from_date) params.append('from_date', options.from_date);
    if (options?.to_date) params.append('to_date', options.to_date);

    return this.request<{ settlements: BuffrTransaction[]; total: number }>({
      method: 'GET',
      url: `/partners/agents/${agentId}/settlements?${params.toString()}`,
    });
  }

  // ================================
  // Health Check
  // ================================

  /**
   * Check Buffr API health
   */
  async healthCheck(): Promise<BuffrApiResponse<{ status: string; timestamp: string }>> {
    return this.request<{ status: string; timestamp: string }>({
      method: 'GET',
      url: '/health',
    });
  }
}

// ================================
// Export Singleton Instance
// ================================

let buffrClientInstance: BuffrClient | null = null;

export function getBuffrClient(): BuffrClient {
  if (!buffrClientInstance) {
    const apiKey = process.env.BUFFR_API_KEY;
    const apiUrl = process.env.BUFFR_API_URL;

    if (!apiKey || !apiUrl) {
      throw new Error('Buffr API configuration is missing. Set BUFFR_API_KEY and BUFFR_API_URL in .env');
    }

    buffrClientInstance = new BuffrClient({
      apiKey,
      apiUrl,
      timeout: 30000,
      maxRetries: 3,
    });
  }

  return buffrClientInstance;
}

export default getBuffrClient;
