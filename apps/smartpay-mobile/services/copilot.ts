/**
 * Copilot HTTP client — POST /api/v1/copilot/chat
 * Uses EXPO_PUBLIC_API_BASE_URL by default; optional EXPO_PUBLIC_COPILOT_API_URL overrides the host (same path).
 */
import type { ChatResponse } from '@/types/copilot';

function getCopilotApiBase(): string {
  const override = process.env.EXPO_PUBLIC_COPILOT_API_URL?.trim();
  const base = override || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  return base.replace(/\/$/, '');
}

function normalizeChatResponse(data: unknown, requestThreadId: string): ChatResponse {
  const raw = data as Record<string, unknown>;
  const status = raw?.status === 'interrupt' ? 'interrupt' : 'ok';
  const threadId =
    typeof raw?.thread_id === 'string' && raw.thread_id.trim()
      ? raw.thread_id
      : requestThreadId;

  let messages: Array<{ role: string; content: string }> = [];
  if (Array.isArray(raw?.messages)) {
    messages = raw.messages
      .map((m) => {
        const item = m as Record<string, unknown>;
        const rawRole =
          typeof item.role === 'string'
            ? item.role
            : typeof item.type === 'string'
              ? item.type
              : 'assistant';
        const role = rawRole.toLowerCase();
        const content = typeof item.content === 'string' ? item.content : '';
        return { role, content };
      })
      .filter((m) => m.content.trim().length > 0);
  }

  return {
    status,
    messages,
    thread_id: threadId,
    approval_payload: raw?.approval_payload,
    last_tool_result:
      typeof raw?.last_tool_result === 'string' || raw?.last_tool_result === null
        ? (raw.last_tool_result as string | null)
        : undefined,
  };
}

/**
 * Send a user message to the copilot chat endpoint.
 */
export async function sendChatMessage(
  message: string,
  threadId: string,
  token: string
): Promise<ChatResponse> {
  const url = `${getCopilotApiBase()}/api/v1/copilot/chat`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, thread_id: threadId }),
    });

    let data: unknown = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const errBody = data as { message?: string; error?: { message?: string } };
      const msg =
        errBody?.message ||
        errBody?.error?.message ||
        `Copilot request failed (${response.status})`;
      throw new Error(msg);
    }

    return normalizeChatResponse(data, threadId);
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    }
    throw new Error('Failed to reach copilot');
  }
}
