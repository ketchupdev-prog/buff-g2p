# User context and state in the Buffr app

Single reference for how the agent gets user context and how conversation state is wired (DRY; single source of truth).

## Overview

- **User profile (onboarding):** Single source of truth is the **Node backend** (`GET /api/v1/mobile/user/profile`). The Companion does not store profile; it fetches it per request using the same Bearer token the app sends.
- **Conversation state:** Stored in LangGraph's Postgres checkpointer keyed by `thread_id`. The app sends `thread_id` on every request; no user identity is stored in the graph state beyond what's in the injected context.

## Flow (end-to-end)

```
Mobile (AI tab)
  → getAuthHeader() from secureStorage (buffr_access_token)
  → POST {EXPO_PUBLIC_BUFFR_AI_URL}/api/buffr-companion/chat
     Body: { message, thread_id } or { thread_id, resume: true }
     Headers: Authorization: Bearer <token>

Companion API (FastAPI)
  → get_deps(request): read Authorization, call fetch_user_profile(auth_header)
  → fetch_user_profile() → GET {BUFFR_API_BASE_URL}/api/v1/mobile/user/profile
     with same Bearer token → returns user object (id, name, phone, photo_url, etc.)
  → CompanionDeps(user_id, auth_token, user_profile) passed as context to graph

LangGraph
  → context_schema=CompanionDeps → deps available in every node as runtime.context
  → companion_node: if deps.user_profile, prefix message with format_user_context(profile)
  → run_companion(message, deps) → agent has get_user_info tool reading ctx.deps.user_profile
  → State (messages, pending_action, etc.) in Postgres checkpointer by thread_id
```

## Key files

| Layer | File | Responsibility |
|-------|------|----------------|
| Mobile | `mobile/services/companionApi.ts` | `getAuthHeader()` from secureStorage; `sendCompanionMessage(message, threadId, resume)` sends Bearer token. No user_id in body. |
| Mobile | `mobile/contexts/UserContext.tsx` | App-level user state (profile, walletStatus). AI tab does not send profile in the request; identity comes from the token. |
| Companion API | `backend/buffr_ai/api/companion_endpoint.py` | `get_deps(request)` builds `CompanionDeps` from Authorization and Node profile API. |
| Profile fetch | `backend/buffr_ai/user_profile.py` | `fetch_user_profile(auth_token)` calls Node; `format_user_context(profile)` and shared profile formatting for injection and tool. |
| Graph | `backend/buffr_ai/graph/workflow.py` | `StateGraph(BuffrAgentState, context_schema=CompanionDeps)`; context passed to `ainvoke(..., context=deps)`. |
| Graph nodes | `backend/buffr_ai/graph/nodes.py` | `companion_node`: injects user context into message when `deps.user_profile` exists; `execute_tool_node` uses `deps.user_id`, `deps.auth_token`. |
| Agent | `backend/buffr_ai/agents/companion/agent.py` | `CompanionDeps.user_profile`; tool `_get_user_info` returns name/phone from profile (uses shared formatter from user_profile). |

## Env required for user context

- **Backend (Companion):** `BUFFR_API_BASE_URL` in `backend/.env` (e.g. `http://localhost:3001`). If unset, Companion will not have user profile (and will log it).
- **Mobile:** `EXPO_PUBLIC_BUFFR_AI_URL` in `mobile/.env` (Companion base URL). Device must reach this (e.g. `http://<machine-ip>:8000` when running uvicorn with `--host 0.0.0.0`).

## DRY and single source of truth

- Profile data: only Node API. Companion and tools never store or duplicate profile; they use `fetch_user_profile()` and `CompanionDeps.user_profile`.
- Name/phone formatting: single helper in `user_profile.py` used by `format_user_context()` and by the agent's `get_user_info` response (see `user_profile.format_user_info_response()`).

## Companion agent tools

The Companion agent (Pydantic AI) has **five tools** registered in `backend/buffr_ai/agents/companion/agent.py`. Read-only tools are called by the model during `run_companion`; write actions are **not** called directly—the agent returns a `pending_action`, the graph runs approval, then `execute_tool_node` calls `execute_pending_action` in `tools.py`.

### Registered with the agent (model can call)

| Tool | Purpose |
|------|---------|
| **get_user_info** | Return current user's name, phone from `CompanionDeps.user_profile` |
| **search_knowledge_base** | Search curated Buffr KB (consumer protection, regulation, financial literacy); user-isolated via `user_id` |
| **route_to_guardian** | Read-only fraud/risk query to Guardian agent (stub; production: real agent/API) |
| **route_to_transaction_analyst** | Spending/transaction analysis (stub) |
| **route_to_voucher_analyst** | Voucher/redemption queries (stub) |

### Write actions (executed only after human approval)

Implemented in `backend/buffr_ai/agents/companion/tools.py`. Agent returns `CompanionResponse(pending_action=PendingAction(...))`; graph runs guardian check → human approval → `execute_tool_node` → `execute_pending_action(action_type, parameters)`.

| action_type | Tool function | Purpose |
|-------------|--------------|---------|
| `create_wallet` | `create_wallet_tool` | Create wallet (name, type); production: Node API with auth_token |
| `create_group` | `create_group_tool` | Create group (name, description, member_ids) |
| `add_members` | `add_group_members_tool` | Add members to group |
| `remove_member` | `remove_group_member_tool` | Remove member from group |
| `transfer_funds` | `transfer_funds_tool` | Transfer between wallets; 2FA token in production |
| `pay_bill` | `pay_bill_tool` | Pay bill (bill_id, amount, wallet_id) |
| `redeem_voucher` | `redeem_voucher_tool` | Redeem voucher to wallet or cash |
| `apply_loan` | `apply_loan_tool` | Apply for voucher-backed loan (amount, voucher_ids) |

Dispatcher: `ACTION_TOOL_MAP` and `execute_pending_action(user_id, auth_token, action_type, parameters)` in `tools.py`; called from `graph/nodes.py` `execute_tool_node`.

## Boy Scout note

When touching this flow, keep one place for "how we get profile" (endpoint + user_profile) and one place for "how we format profile for the model/tool" (user_profile helpers). Update this doc if you add new context (e.g. wallet status) or new tools so the next dev has a single reference.
