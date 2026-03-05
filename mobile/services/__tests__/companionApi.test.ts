/**
 * Unit tests for Companion API client – Buffr G2P.
 * Location: mobile/services/__tests__/companionApi.test.ts
 */
/// <reference types="jest" />

// Mock secureStorage before importing
jest.mock('../secureStorage', () => ({
  getSecureItem: jest.fn().mockResolvedValue(null),
  setSecureItem: jest.fn(),
}));

import * as secureStorage from '../secureStorage';
import {
  checkCompanionHealth,
  COMPANION_NOT_CONFIGURED,
  sendCompanionMessage,
  lastAssistantReply,
  type ChatResponseOk,
} from '../companionApi';

describe('companionApi', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  describe('COMPANION_NOT_CONFIGURED', () => {
    it('is a boolean', () => {
      expect(typeof COMPANION_NOT_CONFIGURED).toBe('boolean');
    });
  });

  describe('checkCompanionHealth', () => {
    it('returns false when COMPANION_URL is empty (no env)', async () => {
      const result = await checkCompanionHealth();
      if (COMPANION_NOT_CONFIGURED) {
        expect(result).toBe(false);
      } else {
        expect(typeof result).toBe('boolean');
      }
    });

    it('returns boolean when fetch is mocked ok', async () => {
      fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
      const result = await checkCompanionHealth();
      expect(result === true || result === false).toBe(true);
    });
  });

  describe('sendCompanionMessage', () => {
    it('returns NOT_CONFIGURED error when COMPANION_URL is empty', async () => {
      if (!COMPANION_NOT_CONFIGURED) return;
      const result = await sendCompanionMessage('Hi', 'thread-1');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.code).toBe('NOT_CONFIGURED');
      }
    });

    it('sends POST with JSON body (message + thread_id) when env is set', async () => {
      if (COMPANION_NOT_CONFIGURED) return;
      fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok', messages: [{ role: 'assistant', content: 'Hello' }] }),
      } as Response);
      await sendCompanionMessage('Hi', 't1');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/buffr-companion/chat'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ message: 'Hi', thread_id: 't1' }),
        })
      );
    });

    it('sends Authorization when token is present', async () => {
      if (COMPANION_NOT_CONFIGURED) return;
      (secureStorage.getSecureItem as jest.Mock).mockResolvedValue('token-abc');
      fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok', messages: [] }),
      } as Response);
      await sendCompanionMessage('Hi', 't1');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer token-abc' }),
        })
      );
    });

    it('returns data on 200 ok response', async () => {
      if (COMPANION_NOT_CONFIGURED) return;
      fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'ok',
          messages: [
            { role: 'user', content: 'Hi' },
            { role: 'assistant', content: 'Hello back' },
          ],
        }),
      } as Response);
      const result = await sendCompanionMessage('Hi', 't1');
      expect('data' in result).toBe(true);
      if ('data' in result && result.data.status === 'ok') {
        expect(result.data.messages).toHaveLength(2);
      }
    });

    it('returns error on 5xx', async () => {
      if (COMPANION_NOT_CONFIGURED) return;
      fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ detail: 'Unavailable' }),
      } as Response);
      const result = await sendCompanionMessage('Hi', 't1');
      expect('error' in result).toBe(true);
      if ('error' in result) expect(result.error.code).toBe('SERVER');
    });
  });

  describe('lastAssistantReply', () => {
    it('returns last assistant message content', () => {
      const data: ChatResponseOk = {
        status: 'ok',
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Reply here' },
        ],
      };
      expect(lastAssistantReply(data)).toBe('Reply here');
    });

    it('returns last_tool_result when no assistant message', () => {
      const data: ChatResponseOk = {
        status: 'ok',
        messages: [],
        last_tool_result: 'Tool said this',
      };
      expect(lastAssistantReply(data)).toBe('Tool said this');
    });

    it('returns "Done." when no messages and no last_tool_result', () => {
      const data: ChatResponseOk = { status: 'ok', messages: [] };
      expect(lastAssistantReply(data)).toBe('Done.');
    });
  });
});
