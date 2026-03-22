# SmartPay Copilot API

**Last updated:** 2026-03-21  

End-to-end reference for the **SmartPay Copilot**: mobile and other clients call the **Node API**, which can **proxy** to the **Python (FastAPI + LangGraph)** service. A separate **local Node agent** endpoint exists for RAG/analytics without Python.

**Related:** [Copilot test scenarios & guardrails](../reference/copilot-test-scenarios.md) · [Python endpoints](./python-endpoints.md) · Monorepo overview: [`../../../README.md`](../../../README.md) · Docs hub: [`../../README.md`](../../README.md)

---

## 1. Architecture overview

```
┌─────────────────┐     POST /api/v1/copilot/chat      ┌──────────────────────┐
│  Mobile / CLI   │ ─────────────────────────────────►│  smartpay-backend    │
│  (JWT Bearer)   │     Authorization forwarded         │  (copilotProxy.ts)   │
└─────────────────┘                                     └──────────┬───────────┘
                                                                   │ fetch
                                                                   ▼
                                                        ┌──────────────────────┐
                                                        │  smartpay-ai         │
                                                        │  LangGraph + HITL    │
                                                        │  POST /api/v1/       │
                                                        │       copilot/chat   │
                                                        └──────────────────────┘

Optional path: POST /api/v1/copilot  ──►  runSmartpayAgent (in-process on Node)
```

| Layer | Endpoint | Implementation |
|-------|----------|----------------|
| **Mobile default** | `POST {NODE}/api/v1/copilot/chat` | [`apps/smartpay-backend/src/routes/copilotProxy.ts`](../../../apps/smartpay-backend/src/routes/copilotProxy.ts) |
| **Python canonical** | `POST {AI}/api/v1/copilot/chat` | [`apps/smartpay-ai/smartpay_ai/api/copilot_endpoint.py`](../../../apps/smartpay-ai/smartpay_ai/api/copilot_endpoint.py) |
| **Local Node agent** | `POST {NODE}/api/v1/copilot` | [`apps/smartpay-backend/src/routes/copilotEndpoint.ts`](../../../apps/smartpay-backend/src/routes/copilotEndpoint.ts) |

**Why proxy?** Single JWT verification and rate limits on Node; mobile does not need the AI service URL. The proxy forwards the JSON body and `Authorization` header.

---

## 2. Authentication

| Surface | Requirement |
|---------|-------------|
| `POST /api/v1/copilot/chat` (Node) | **`Authorization: Bearer <access_token>`** — `requireAuth` on the proxy route. |
| `POST /api/v1/copilot/chat` (Python) | Same header — used to **`fetch_user_profile`** from Node (`SMARTPAY_API_BASE_URL`) for DRY user context. |
| `POST /api/v1/copilot` (Node local) | JWT required — same middleware pattern as other copilot routes. |

---

## 3. Request / response schemas (chat)

### 3.1 `POST /api/v1/copilot/chat` (Node proxy and Python)

The proxy passes the body through unchanged. Shape matches Pydantic **`ChatRequest`** in [`apps/smartpay-ai/smartpay_ai/agents/copilot/models.py`](../../../apps/smartpay-ai/smartpay_ai/agents/copilot/models.py).

**Request JSON**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `thread_id` | string | **Yes** | LangGraph checkpointer thread. **Reuse** for one conversation; **new UUID** for a new chat. |
| `message` | string | If `resume` is not set | User message. |
| `user_id` | string | No | Optional hint; server prefers profile from JWT/Node. |
| `resume` | boolean \| object | No | Resume after HITL — `Command(resume=…)` on the graph. |

**Response JSON** (`ChatResponse`)

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"ok"` \| `"interrupt"` | `interrupt` = human approval / HITL pending. |
| `messages` | array | `{ role, content }[]` — populated for typical `ok` replies. |
| `approval_payload` | object | Present when `status === "interrupt"`. |
| `last_tool_result` | string \| null | Optional tool output summary. |
| `thread_id` | string | Echo of request `thread_id`. |

**Mobile normalization:** [`apps/smartpay-mobile/services/copilot.ts`](../../../apps/smartpay-mobile/services/copilot.ts) maps the payload into [`ChatResponse`](../../../apps/smartpay-mobile/types/copilot.ts) for the UI.

### 3.2 `POST /api/v1/copilot` (Node local agent only)

**Body:** `{ "message": string, "messageHistory"?: array, "stream"?: boolean }`

**Success:** `{ response, toolCalls?, messageHistory, usage? }` — see [`copilotEndpoint.ts`](../../../apps/smartpay-backend/src/routes/copilotEndpoint.ts).

This path does **not** replace LangGraph HITL on Python; it is a separate in-process agent stack.

---

## 4. Thread management

1. **Client:** Generate or load one `thread_id` per conversation. The mobile app persists it in AsyncStorage (`smartpay_copilot_thread_id` in [`CopilotContext.tsx`](../../../apps/smartpay-mobile/contexts/copilot/CopilotContext.tsx)).
2. **Server:** Python passes `{"configurable": {"thread_id": req.thread_id}}` into LangGraph so checkpoint state is isolated per thread.
3. **New chat:** New UUID + clear local messages (e.g. `resetConversation`).

---

## 5. Error handling

| HTTP | Source | Meaning / action |
|------|--------|------------------|
| **400** | Python | Missing `message` when not resuming; malformed body. |
| **401** | Node | Invalid or missing JWT on proxy or `/copilot`. |
| **502** | Node proxy | Upstream fetch failed — body: `{ error, message }`. Start or fix **`AI_SERVICE_URL`**. |
| **503** | Python | `graph` not on `app.state` — DB/lifespan issue; check `DATABASE_URL` and startup logs. |
| **4xx/5xx** | Python | Proxied as-is; Node may wrap as `{ error: "AI service error", details }`. |

**Transient DB:** The Python handler **retries once** on certain Postgres connection/SSL errors from the checkpointer.

---

## 6. Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| **`AI_SERVICE_URL`** | smartpay-backend | Base URL for proxy target (default `http://localhost:8000`). |
| **`AI_SERVICE_ENABLED`** | smartpay-backend `.env.example` | Operational flag (“is AI expected up?”). Documented for runbooks; **ensure `AI_SERVICE_URL` is correct** when testing. |
| **`EXPO_PUBLIC_COPILOT_API_URL`** | smartpay-mobile | Optional override for copilot **host** (path remains `/api/v1/copilot/chat`). |
| **`EXPO_PUBLIC_API_BASE_URL`** | smartpay-mobile | Default copilot host when override empty. |
| **`SMARTPAY_API_BASE_URL`** | smartpay-ai | Node API base for `fetch_user_profile`. |
| **`LLM_API_KEY`** | smartpay-ai | LLM credential (with `LLM_PROVIDER` / `LLM_MODEL`). |
| **`DATABASE_URL`** | smartpay-ai | Required for graph + checkpointer. |

---

## 7. Code examples

### 7.1 cURL (via Node proxy)

```bash
export ACCESS_TOKEN="your_jwt"
export THREAD_ID="11111111-1111-4111-8111-111111111111"

curl -s -X POST http://localhost:4000/api/v1/copilot/chat \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"What is my wallet balance?\",\"thread_id\":\"$THREAD_ID\"}"
```

### 7.2 cURL (direct to Python — debugging)

```bash
curl -s -X POST http://localhost:8000/api/v1/copilot/chat \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"What is my wallet balance?\",\"thread_id\":\"$THREAD_ID\"}"
```

### 7.3 TypeScript (React Native service)

Same contract as [`sendChatMessage`](../../../apps/smartpay-mobile/services/copilot.ts):

```typescript
import { sendChatMessage } from '@/services/copilot';

const res = await sendChatMessage('Show my balance', threadId, accessToken);
if (res.status === 'interrupt') {
  // handle res.approval_payload — HITL
} else {
  // use res.messages
}
```

### 7.4 Python (`requests`)

```python
import requests

r = requests.post(
    "http://localhost:4000/api/v1/copilot/chat",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    json={
        "message": "Show my balance",
        "thread_id": thread_id,
    },
    timeout=120,
)
r.raise_for_status()
data = r.json()
```

### 7.5 Node.js (`fetch`)

```javascript
const res = await fetch(`${process.env.API_BASE}/api/v1/copilot/chat`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message: 'Hello', thread_id: threadId }),
});
const data = await res.json();
```

---

## 8. Troubleshooting

| Issue | Check |
|-------|--------|
| Proxy 502 | `AI_SERVICE_URL`, smartpay-ai running, firewall. |
| 503 graph not ready | smartpay-ai `DATABASE_URL`, migrations, lifespan logs. |
| Empty profile in AI logs | Node running; `SMARTPAY_API_BASE_URL`; JWT valid for Node `/api/v1/users/profile`. |
| Conversation “forgets” | Same `thread_id` per session; avoid resetting storage unintentionally. |
| LLM errors | `LLM_API_KEY`, provider quotas, `LLM_MODEL` name. |

---

## 9. Implementation reference (March 2026 fixes)

- **Async:** `await` on `fetch` (Node proxy), `await graph.ainvoke` (Python), and profile/audit calls so clients receive complete responses.
- **Threading:** Mandatory stable `thread_id` aligned with LangGraph `configurable`.
- **HTTP:** Proxy forwards Authorization; JSON error surfaces from upstream when possible.

---

## 10. Further reading

- Mobile: [`apps/smartpay-mobile/README.md`](../../../apps/smartpay-mobile/README.md)  
- Backend: [`apps/smartpay-backend/README.md`](../../../apps/smartpay-backend/README.md)  
- AI: [`apps/smartpay-ai/README.md`](../../../apps/smartpay-ai/README.md)  
- Tests: [`apps/smartpay-mobile/__tests__/integration/copilot-flows.test.ts`](../../../apps/smartpay-mobile/__tests__/integration/copilot-flows.test.ts)
