/**
 * Copilot chat API types — SmartPay mobile ↔ backend /api/v1/copilot/chat
 */

export interface ChatRequest {
  message?: string;
  thread_id: string;
  resume?: boolean | object;
}

export interface ChatResponse {
  status: 'ok' | 'interrupt';
  messages: Array<{ role: string; content: string }>;
  thread_id: string;
  approval_payload?: any;
  last_tool_result?: string | null;
}
