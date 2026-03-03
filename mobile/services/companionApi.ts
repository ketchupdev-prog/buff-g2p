/**
 * Buffr AI Companion API client – mobile.
 * No mocks or fallbacks: all responses come from the backend.
 * Location: mobile/services/companionApi.ts
 */

import { getSecureItem } from './secureStorage';

const COMPANION_URL = (process.env.EXPO_PUBLIC_BUFFR_AI_URL ?? '').replace(/\/$/, '');

export const COMPANION_NOT_CONFIGURED = !COMPANION_URL;

export interface ChatResponseOk {
  status: 'ok';
  messages: Array<{ role: string; content: string }>;
  last_tool_result?: string;
}

export interface ChatResponseInterrupt {
  status: 'interrupt';
  approval_payload: {
    action_type?: string;
    parameters?: Record<string, unknown>;
    summary_for_user?: string;
  };
}

export type ChatResponse = ChatResponseOk | ChatResponseInterrupt;

export type CompanionError = 
  | { code: 'NOT_CONFIGURED'; message: string }
  | { code: 'NETWORK'; message: string }
  | { code: 'SERVER'; status: number; message: string }
  | { code: 'CLIENT'; status: number; message: string };

async function getAuthHeader(): Promise<string | undefined> {
  const token = await getSecureItem('buffr_access_token');
  return token ? `Bearer ${token}` : undefined;
}

/**
 * Send a message or resume after approval. No fallback: requires backend.
 * When backend adds POST /api/buffr-companion/chat/stream (SSE), use streamCompanionChat instead for streaming UX.
 */
export async function sendCompanionMessage(
  message: string | null,
  threadId: string,
  resume?: boolean
): Promise<{ data: ChatResponse } | { error: CompanionError }> {
  if (!COMPANION_URL) {
    return {
      error: {
        code: 'NOT_CONFIGURED',
        message: 'Companion is not configured. Set EXPO_PUBLIC_BUFFR_AI_URL.',
      },
    };
  }

  const auth = await getAuthHeader();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(auth && { Authorization: auth }),
  };

  const body = message != null && !resume
    ? { message, thread_id: threadId }
    : { thread_id: threadId, resume: resume ?? true };

  try {
    const res = await fetch(`${COMPANION_URL}/api/buffr-companion/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as ChatResponse & { detail?: string };

    if (!res.ok) {
      if (res.status >= 500) {
        return {
          error: {
            code: 'SERVER',
            status: res.status,
            message: (json as { detail?: string }).detail ?? 'Companion service unavailable.',
          },
        };
      }
      return {
        error: {
          code: 'CLIENT',
          status: res.status,
          message: (json as { detail?: string }).detail ?? 'Invalid request.',
        },
      };
    }

    if (json.status !== 'ok' && json.status !== 'interrupt') {
      return {
        error: {
          code: 'SERVER',
          status: res.status,
          message: 'Invalid response from companion.',
        },
      };
    }

    return { data: json };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed.';
    return { error: { code: 'NETWORK', message } };
  }
}

/**
 * Extract the last assistant reply text from ChatResponse (status ok).
 */
export function lastAssistantReply(data: ChatResponseOk): string {
  const messages = data.messages ?? [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && (m.role === 'assistant' || m.role === 'ai')) {
      const content = typeof m.content === 'string' ? m.content : '';
      if (content.trim()) return content;
    }
  }
  return data.last_tool_result ?? 'Done.';
}

/**
 * When the backend exposes POST /api/buffr-companion/chat/stream (SSE or ReadableStream),
 * implement this to consume chunks and yield partial reply text for streaming UX.
 * Mobile can then update the last bot message incrementally.
 */
// export async function* streamCompanionChat(
//   message: string,
//   threadId: string
// ): AsyncGenerator<string, void, unknown> { ... }
