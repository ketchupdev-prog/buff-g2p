# Buffr AI Payment Companion – Complete Architecture & Implementation Blueprint

**Document type:** Master blueprint  
**Location:** `docs/BUFFR_AI_COMPANION_BLUEPRINT.md`  
**Repository:** This blueprint is for the **buffr-g2p** project (root: `buffr-g2p/`). Code and paths are written relative to that repo unless a reference implementation is cited.  
**Related:** `docs/BUFFR_AI_COMPANION_PRP.json` (Archon PRP import)

### Relationship to buffr-g2p PRD

The **Product Requirements Document** (`mobile/docs/PRD.md`) is the full specification for the Buffr G2P **Beneficiary Platform mobile app** (Expo/React Native, iOS/Android). This blueprint **implements and extends** the AI/companion part of that product:

| PRD element | Blueprint role |
|-------------|----------------|
| **§3.6 Screen 43 – AI Chat** (`/ai-chat` or `/(tabs)/profile/ai-chat`) | This blueprint defines the **Buffr AI Payment Companion**: orchestrator agent, specialized analysts (Guardian, Transaction Analyst, Voucher Analyst), LangGraph HITL, and ML services that power the chat. The mobile app’s AI Chat screen is the **client** of the companion API. |
| **§2 Buffr G2P App Scope** (vouchers, wallet, cash-out, loans, proof-of-life, etc.) | The companion’s **capabilities** (§2) and **tools** (wallets, transfers, voucher insights, fraud/credit) align with these flows. All write actions go through human approval (§3.2.6). |
| **§9.4 API contract** (backend request/response shapes) | The app talks to the **Buffr backend**; the backend (or app via `EXPO_PUBLIC_BUFFR_AI_URL`) calls the **Buffr AI** service. This blueprint documents the AI/ML API (§20) and agent endpoints (§11). |
| **§12 / §14 Compliance** (ETA 2019, PSD-12, NAMQR, Open Banking) | Companion security and audit (§5) and agent behaviour must comply with the same regulatory context as the PRD. |

**Use the PRD for:** app screens, navigation, user flows, design system, backend API contract, and compliance. **Use this blueprint for:** AI companion architecture, agents, ML models, training, and the approval/workflow layer.

---

## 1. Vision: The Intelligent Financial Ally for Namibian Beneficiaries

The Buffr Payment Companion is not just a chatbot—it is a **proactive, personalized, and secure** AI-powered financial assistant integrated into the Buffr G2P platform. It empowers beneficiaries by:

- **Understanding** their financial situation, goals, and habits.
- **Anticipating** needs (e.g., voucher expiry, bill due dates, savings opportunities).
- **Executing** actions on their behalf with explicit approval.
- **Protecting** them from fraud and poor financial decisions.
- **Educating** them to improve financial literacy.

In the context of Buffr (Government-to-Person payments in Namibia), the companion must handle:

- Government vouchers (grants) and their redemption.
- Wallet management (multiple wallets for different purposes).
- Peer-to-peer transfers.
- Bill payments.
- Group finances (shared savings or expenses).
- Loan applications (voucher-backed advances).

The companion leverages state-of-the-art AI (LLMs, multi-agent systems, machine learning) while maintaining strict security, compliance with Namibian regulations (ETA 2019, PSD-12, etc.), and human oversight for sensitive actions.

---

## 2. Core Capabilities – What the Companion Can Do

### 2.1 Analysis & Insights (Read-Only)

| Capability | Description | Data Source | Agent |
|------------|-------------|-------------|-------|
| Spending analysis | Categorize transactions, detect trends, compare to past periods. | Wallet transactions | Transaction Analyst |
| Budget tracking | Show progress against set budgets, suggest adjustments. | User-defined budgets + spending | Transaction Analyst |
| Voucher forecasting | Predict when and how vouchers will be redeemed; identify expiry risk. | Voucher metadata + historical redemptions | Voucher Analyst |
| Financial health score | Compute a composite score based on savings rate, debt, regularity. | All financial data | Guardian (credit scoring) |
| Fraud risk assessment | Flag unusual activity; explain risk factors. | Real-time transaction data | Guardian |
| Peer comparison | Anonymously compare spending with similar beneficiaries (opt-in). | Aggregated cluster data | Transaction Analyst |
| Goal tracking | Monitor progress toward savings goals (e.g., school fees, livestock). | User-defined goals + wallet balances | Transaction Analyst |

### 2.2 Proactive Notifications & Alerts

- **Voucher expiry warnings** (e.g., "Your child grant voucher expires in 5 days – redeem it soon.")
- **Budget overspend alerts** (e.g., "You've spent 80% of your food budget this month.")
- **Unusual activity detection** (e.g., "We noticed a large withdrawal from your wallet – is this you?")
- **Savings opportunities** (e.g., "Based on your spending, you could save N$200/month by reducing takeaway meals.")
- **Payment reminders** (e.g., "Your electricity bill is due tomorrow – pay now to avoid disconnection.")
- **Personalized tips** (e.g., "Did you know you can redeem vouchers at NamPost without fees?")

### 2.3 Action Execution (Requires Human Approval)

| Action | Description | Approval Required | 2FA Required |
|--------|-------------|-------------------|---------------|
| Create wallet | Add a new wallet (e.g., "Savings for school fees"). | Yes | No |
| Rename/delete wallet | Modify existing wallets. | Yes | No |
| Create group | Start a shared group (e.g., "Family savings"). | Yes | No |
| Add/remove group members | Manage group composition. | Yes (admin only) | No |
| Transfer between wallets | Move funds between user's own wallets. | Yes | Yes (backend 2FA) |
| Send money to another user | P2P transfer. | Yes | Yes |
| Pay bill | Settle a bill (electricity, water, etc.). | Yes | Yes |
| Redeem voucher | Convert voucher to wallet credit or cash. | Yes | Yes (for cash-out) |
| Apply for loan | Take a voucher-backed advance. | Yes | Yes |
| Set up auto-pay | Schedule recurring payments. | Yes | No |
| Change profile info | Update name, phone, etc. | No | No (auth token required) |

### 2.4 Financial Education & Guidance

- Explain financial concepts (e.g., interest rates, budgeting) in simple terms.
- Suggest courses or articles from the Financial Literacy module.
- Walk users through complex processes (e.g., applying for a loan).

---

## 3. System Architecture – Multi-Agent with LangGraph HITL

### 3.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      User (via API/CLI)                      │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Buffr AI Companion                         │
│  (Orchestrator Agent – Pydantic AI)                           │
│  - Receives natural language input                            │
│  - Maintains conversation context                             │
│  - Routes to specialized agents                               │
│  - Decides if action needs approval                           │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
                ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   Read/Analysis Agents      │   │   Action Agents (Write)      │
│ - Transaction Analyst       │   │ - Wallet Tool Agent          │
│ - Voucher Analyst           │   │ - Group Tool Agent          │
│ - Guardian (read-only)      │   │ - Transfer Agent            │
│ - (Future: Planner)         │   │ - Bill Payment Agent        │
└─────────────────────────────┘   └───────────────┬─────────────┘
                                                   │
                                                   ▼
                                      ┌─────────────────────────┐
                                      │   LangGraph Workflow     │
                                      │   (State Machine)        │
                                      │ - Guardian Check Node    │
                                      │ - Human Approval Node    │
                                      │   (interrupt)            │
                                      │ - Execute Tool Node      │
                                      │ - Post-Execute Analysis  │
                                      └─────────────────────────┘
                                                   │
                                                   ▼
                                      ┌─────────────────────────┐
                                      │    Buffr Backend API     │
                                      │   (real database, no     │
                                      │    mocks)                │
                                      └─────────────────────────┘
```

### 3.2 Core Components

#### 3.2.1 Orchestrator Agent (`companion.py`)

- Built with Pydantic AI.
- System prompt includes knowledge of all capabilities and when to delegate.
- Uses tools: `route_to_transaction_analyst`, `route_to_voucher_analyst`, `route_to_guardian`, `create_wallet`, `create_group`, `transfer_funds`, etc.
- For write actions, the agent **does not execute the tool directly**; instead, it returns a structured output indicating the desired action and its parameters. This triggers the LangGraph workflow.

#### 3.2.2 Specialized Analysis Agents

- **Transaction Analyst** – Existing code extended with new tools for peer comparison, goal tracking.
- **Voucher Analyst** – Existing code extended with forecasting and expiry risk.
- **Guardian** – Existing code extended with credit scoring, fraud detection, compliance checks.

All analysis agents are **read-only** and can be called directly by the orchestrator.

#### 3.2.3 Tool Agents (Write Operations)

Each write operation is implemented as a separate tool agent (e.g., `wallet_tools.py`, `group_tools.py`) that:

- Accepts parameters.
- Calls the appropriate Buffr backend API endpoint.
- Handles authentication (using the user's token from context).
- Returns success/failure with details.

These tools are **only invoked by the LangGraph workflow after approval**.

#### 3.2.4 LangGraph Workflow (`graph/`)

- **State:** `BuffrAgentState` (extends conversation state with `pending_action`, `approval_granted`, `last_tool_result`, etc.).
- **Nodes:**
  - `companion_node`: Runs the orchestrator agent. If the output contains an action, sets `pending_action` and transitions to `guardian_check_node`. Otherwise, ends.
  - `guardian_check_node`: Calls Guardian agent to assess risk for the pending action. If risk > threshold, sets error message and returns to companion. Else, proceeds to `human_approval_node`.
  - `human_approval_node`: Calls `interrupt()` with action details. Resumes with user's decision.
  - `execute_tool_node`: Executes the tool (e.g., `create_wallet_tool`) using parameters from `pending_action`. For transfers, first obtains `verification_token` via backend 2FA.
  - `post_execute_node`: Optionally trigger analysis (e.g., update spending patterns) after a transfer.
- **Edges:** Defined based on state transitions.

#### 3.2.5 Backend API Integration

All tools call **real backend endpoints** (no mocks). The backend must provide:

- Authentication (JWT) and 2FA endpoints (`/auth/verify-2fa` returning `verification_token`).
- Wallet CRUD.
- Group CRUD and membership management.
- Transaction history.
- Voucher redemption.
- Bill payment.
- Transfer between wallets (new endpoint needed: `POST /wallets/transfer`).

#### 3.2.6 Human-in-the-Loop (HITL) Design

- **Interrupts:** Implemented via LangGraph's `interrupt()`. The UI (chat frontend) detects an interrupt and displays a modal with action details and "Approve" / "Decline" buttons.
- **Resumption:** The user's response (yes/no + optional feedback) is sent back as a `Command(resume=...)`.
- **State Persistence:** Postgres checkpointer stores the entire state, allowing resumption even after server restart.

---

## 4. Personalization & Learning

### 4.1 User Profile & Preferences

- Store in database: spending categories of interest, savings goals, preferred notification channels.
- The companion adapts its language and suggestions based on user's financial literacy level (inferred from interactions).

### 4.2 Collaborative Filtering

- Using K-means clustering (as in existing Transaction Analyst), group users into personas (e.g., "Conservative Saver", "Big Spender").
- Provide peer comparisons and recommendations based on similar users' behavior.

### 4.3 Feedback Loop

- After each action, ask user for implicit feedback (e.g., did they follow a suggestion?).
- Fine-tune recommendation models over time.

---

## 5. Security & Compliance

### 5.1 Fraud Detection (Guardian Agent)

- Real-time ML ensemble (Logistic Regression, Random Forest, Neural Network, GMM) to score transaction risk.
- If risk > 0.6, flag for manual review or block.
- Explain risk factors to user.

### 5.2 2FA for Sensitive Actions

- Before executing transfers, send-money, or cash-out, the backend requires `verification_token` obtained via 2FA (PIN/biometric).
- The companion triggers the 2FA flow (e.g., via a modal) and only proceeds after token is obtained.

### 5.3 Audit Trail

- All actions (approved or declined) are logged in the database with user ID, timestamp, action details, and approval decision.
- Logs are immutable and used for compliance reporting.

### 5.4 Data Privacy

- All PII encrypted at rest.
- User must consent to peer comparison.
- No sharing of raw data; only aggregated statistics.

### 5.5 Compliance with Namibian Regulations

- **ETA 2019:** Electronic signatures, record retention.
- **PSD-12:** 2FA, encryption, incident reporting.
- **AML/CFT:** Transaction monitoring, reporting thresholds.

---

## 6. Technology Stack

| Layer | Technology |
|-------|------------|
| Language | Python 3.11+ |
| AI Framework | Pydantic AI (for agents) |
| Orchestration | LangGraph (with Postgres checkpointer) |
| Web Framework | FastAPI (for endpoints) |
| Database | PostgreSQL (Neon) |
| ML | scikit-learn, PyTorch (fraud NN); see **§12 ML Module Reference** (`buffr_ai/ml`) |
| External APIs | Buffr backend (REST), Gmail (for email drafts if needed) |
| Authentication | JWT, OAuth2 |
| Testing | pytest, ruff, mypy |

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Sprint 1–2)

- Set up project structure with Pydantic AI and LangGraph.
- Implement Postgres checkpointer.
- Create basic orchestrator agent with no tools, just conversation.
- Build simple CLI for testing.

### Phase 2: Read-Only Agents (Sprint 3–4)

- Integrate existing Transaction Analyst, Voucher Analyst, Guardian as tools.
- Implement `get_transactions`, `analyze_spending`, `get_voucher_insights`, `check_fraud_risk` (read-only).
- Test via CLI.

### Phase 3: Write Tools & HITL (Sprint 5–6)

- Implement wallet, group, and transfer tools.
- Build LangGraph workflow with guardian check, approval node, execution node.
- Integrate with backend APIs (real DB).
- Test full approval flows.

### Phase 4: Proactive Features (Sprint 7–8)

- Implement scheduled tasks for notifications (expiry alerts, budget reminders).
- Build personalization layer (user profiles, clustering).
- Add peer comparison (opt-in).

### Phase 5: Integration & Production (Sprint 9–10)

- Integrate with Buffr API endpoint (`/api/buffr-companion`).
- Add comprehensive logging and monitoring.
- Performance tuning and load testing.
- Documentation and handover.

---

## 8. Testing Strategy

### Unit Tests

- Each tool function tested with mocked API responses.
- Each agent tested with sample inputs.

### Integration Tests

- Full workflow tests using an in-memory checkpointer.
- Mock the interrupt and simulate approval/decline.

### End-to-End Tests

- Run against a staging backend with real database.
- Test all happy paths and error cases.

### Security Tests

- Attempt to bypass approval.
- Verify 2FA required for transfers.
- Check audit logs.

---

## 9. Next Steps

1. Finalize backend API endpoints (especially `/wallets/transfer` and 2FA).
2. Set up LangGraph with Postgres.
3. Begin Phase 1 implementation.

---

## 10. Full Code Reference (Pydantic AI + LangGraph)

This section provides implementation-ready code aligned with [Pydantic AI](https://ai.pydantic.dev/) and [LangGraph](https://langchain-ai.github.io/langgraph/) documentation. Use it as the single source of truth for agent shape, state, and HITL flow.

### 10.1 Dependencies

```txt
# requirements.txt or pyproject.toml
pydantic-ai>=0.0.20
langgraph>=0.2.0
langgraph-checkpoint-postgres>=2.0.0
langchain-core
pydantic>=2.0
```

### 10.2 Pydantic AI – Orchestrator Agent

The companion is a single Pydantic AI agent with dependencies (user context, auth token), tools (read-only analysts + tools that *request* write actions), and structured output so the graph can detect when to run the approval workflow.

**References:** [Agents](https://ai.pydantic.dev/agent/), [Function Tools](https://ai.pydantic.dev/tools/), [Structured Output](https://ai.pydantic.dev/output/).

```python
# buffr_ai/companion/agent.py
from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext

# ---------------------------------------------------------------------------
# Dependencies (injected into tools and dynamic instructions)
# ---------------------------------------------------------------------------

@dataclass
class CompanionDeps:
    """Data and connections needed by the orchestrator agent."""
    user_id: str
    auth_token: str
    # Optional: backend client, analyst agents, etc.
    # backend: BuffrBackendClient
    # transaction_analyst: TransactionAnalystAgent
    # voucher_analyst: VoucherAnalystAgent
    # guardian_agent: GuardianAgent


# ---------------------------------------------------------------------------
# Structured output: either a reply only, or a pending action for LangGraph
# ---------------------------------------------------------------------------

class PendingAction(BaseModel):
    """Describes a write action that requires approval and execution in LangGraph."""
    action_type: Literal["create_wallet", "create_group", "transfer_funds", "pay_bill", "redeem_voucher", "apply_loan"]
    parameters: dict = Field(default_factory=dict, description="Arguments for the backend tool")
    summary_for_user: str = Field(description="Short explanation to show in the approval UI")


class CompanionResponse(BaseModel):
    """Final output of the orchestrator: either a message or a pending action."""
    message: str | None = Field(default=None, description="Reply to the user when no action is requested")
    pending_action: PendingAction | None = Field(default=None, description="Set when user requested a write action")


# ---------------------------------------------------------------------------
# Orchestrator agent
# ---------------------------------------------------------------------------

COMPANION_SYSTEM_PROMPT = """\
You are the Buffr AI Payment Companion for Namibian G2P beneficiaries.
You help with: spending analysis, budget tracking, voucher insights, fraud awareness,
and executing actions (wallets, groups, transfers, bills) only after the user approves.

For read-only questions (balance, history, insights), use the analysis tools and reply.
For write actions (create wallet, transfer, pay bill, etc.), do NOT call any execute tool.
Instead, return a structured output with pending_action filled and message as a short
confirmation like "I'll create a wallet named X. Please approve in the app."
"""

companion_agent = Agent(
    "anthropic:claude-sonnet-4-20250514",  # or gateway/openai:gpt-4o, etc.
    deps_type=CompanionDeps,
    output_type=CompanionResponse,
    instructions=COMPANION_SYSTEM_PROMPT,
)


# ---------------------------------------------------------------------------
# Read-only tools (call Buffr backend or sub-agents; no approval flow)
# ---------------------------------------------------------------------------

@companion_agent.tool
async def get_transactions(
    ctx: RunContext[CompanionDeps],
    wallet_id: str | None = None,
    limit: int = 20,
) -> str:
    """Fetch recent transactions for the user. Optionally filter by wallet_id."""
    # In practice: call ctx.deps.backend.get_transactions(ctx.deps.user_id, wallet_id, limit)
    return "[]"


@companion_agent.tool
async def analyze_spending(ctx: RunContext[CompanionDeps], period_days: int = 30) -> str:
    """Get spending analysis and trends for the user over the given period."""
    # Call Transaction Analyst or backend
    return "Spending analysis placeholder."


@companion_agent.tool
async def get_voucher_insights(ctx: RunContext[CompanionDeps]) -> str:
    """Get voucher status, expiry risk, and redemption suggestions."""
    # Call Voucher Analyst or backend
    return "Voucher insights placeholder."


@companion_agent.tool
async def check_fraud_risk(ctx: RunContext[CompanionDeps], context: str = "") -> str:
    """Check fraud/risk assessment for the current context (e.g. before a transfer)."""
    # Call Guardian (read-only)
    return "Risk check placeholder."


# ---------------------------------------------------------------------------
# Running the agent (used from LangGraph companion_node)
# ---------------------------------------------------------------------------

async def run_companion(user_message: str, deps: CompanionDeps) -> CompanionResponse:
    result = await companion_agent.run(user_message, deps=deps)
    return result.output
```

For **write actions**, the agent must not call a function that actually performs the write. It only returns `CompanionResponse(pending_action=PendingAction(...))`. The LangGraph workflow then runs guardian check → human approval → execute tool.

### 10.3 LangGraph – State and Workflow

State is a `TypedDict`; conversation history can be held in a `messages` channel with an `add_messages` reducer. Pending action, approval result, and last tool result are stored in state for the HITL flow.

**References:** [State](https://docs.langchain.com/oss/python/langgraph/graph-api#state), [Nodes and Edges](https://docs.langchain.com/oss/python/langgraph/graph-api#nodes), [Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts), [Command resume](https://docs.langchain.com/oss/python/langgraph/graph-api#command).

```python
# buffr_ai/graph/state.py
from typing import Annotated, TypedDict

from langgraph.graph.message import add_messages

# Re-use PendingAction from companion agent
from buffr_ai.companion.agent import PendingAction


class BuffrAgentState(TypedDict):
    """State for the Buffr companion graph."""
    messages: Annotated[list, add_messages]
    pending_action: PendingAction | None
    approval_granted: bool | None
    last_tool_result: str | None
    error_message: str | None
```

```python
# buffr_ai/graph/workflow.py
from typing import Literal

from langgraph.graph import START, END, StateGraph
from langgraph.types import Command, interrupt
from langgraph.checkpoint.postgres import AsyncPostgresSaver
from langgraph.runtime import Runtime

from buffr_ai.graph.state import BuffrAgentState
from buffr_ai.companion.agent import run_companion, CompanionDeps, PendingAction

# ---------------------------------------------------------------------------
# Nodes (deps come from runtime.context set at invoke time)
# ---------------------------------------------------------------------------

async def companion_node(state: BuffrAgentState, runtime: Runtime[CompanionDeps]) -> dict:
    """Run Pydantic AI orchestrator; if it returns a pending action, pass it to state."""
    deps = runtime.context
    last_message = state["messages"][-1].content if state["messages"] else ""
    response = await run_companion(last_message, deps)
    update: dict = {
        "last_tool_result": None,
        "error_message": None,
    }
    if response.pending_action:
        update["pending_action"] = response.pending_action
        update["messages"] = [{"role": "assistant", "content": response.message or "Please approve this action."}]
    else:
        update["pending_action"] = None
        update["messages"] = [{"role": "assistant", "content": response.message or "Done."}]
    return update


def guardian_check_node(state: BuffrAgentState) -> dict:
    """Assess risk for pending_action. If high risk, set error and clear pending_action."""
    action = state.get("pending_action")
    if not action:
        return {}
    # In practice: call Guardian agent/API, get risk score
    risk_score = 0.2  # placeholder
    if risk_score > 0.6:
        return {
            "error_message": "This action was flagged as high risk. Declined.",
            "pending_action": None,
            "approval_granted": None,
        }
    return {}


def human_approval_node(state: BuffrAgentState) -> dict:
    """Pause for human approval. interrupt() returns the value passed to Command(resume=...)."""
    action = state.get("pending_action")
    if not action:
        return {}
    # Interrupt with payload for UI (e.g. modal with action summary and Approve/Decline)
    payload = {
        "action_type": action.action_type,
        "parameters": action.parameters,
        "summary_for_user": action.summary_for_user,
    }
    approved = interrupt(payload)
    return {
        "approval_granted": approved is True or (isinstance(approved, dict) and approved.get("approved") is True),
    }


async def execute_tool_node(state: BuffrAgentState, runtime: Runtime[CompanionDeps]) -> dict:
    """Execute the approved action via backend (and 2FA if required)."""
    deps = runtime.context
    if not state.get("approval_granted") or not state.get("pending_action"):
        return {"last_tool_result": "No approved action to execute."}
    action = state["pending_action"]
    # In practice: map action_type to backend calls; for transfers get verification_token first
    # Example: await deps.backend.create_wallet(deps.user_id, deps.auth_token, action.parameters)
    result = f"Executed {action.action_type} with params {action.parameters}"
    return {
        "last_tool_result": result,
        "pending_action": None,
        "approval_granted": None,
    }


def route_after_companion(state: BuffrAgentState) -> Literal["guardian_check", "end"]:
    if state.get("pending_action"):
        return "guardian_check"
    return "end"


def route_after_guardian(state: BuffrAgentState) -> Literal["human_approval", "companion"]:
    if state.get("error_message"):
        return "companion"  # Send user back to companion with error
    return "human_approval"


# ---------------------------------------------------------------------------
# Build and compile graph
# ---------------------------------------------------------------------------

def build_buffr_graph():
    builder = StateGraph(BuffrAgentState, context_schema=CompanionDeps)

    builder.add_node("companion", companion_node)
    builder.add_node("guardian_check", guardian_check_node)
    builder.add_node("human_approval", human_approval_node)
    builder.add_node("execute_tool", execute_tool_node)

    builder.add_edge(START, "companion")
    builder.add_conditional_edges("companion", route_after_companion, {"guardian_check": "guardian_check", "end": END})
    builder.add_conditional_edges("guardian_check", route_after_guardian, {"human_approval": "human_approval", "companion": "companion"})
    builder.add_edge("human_approval", "execute_tool")
    builder.add_edge("execute_tool", "companion")

    return builder.compile()


# ---------------------------------------------------------------------------
# With Postgres checkpointer (required for interrupt/resume)
# ---------------------------------------------------------------------------

# In production: create checkpointer once at app startup and keep it open.
# Example:
#   async with AsyncPostgresSaver.from_conn_string(postgres_uri) as checkpointer:
#       await checkpointer.setup()
#       graph = builder.compile(checkpointer=checkpointer)
#       # ... run app (e.g. FastAPI) with this graph ...
async def get_compiled_graph(postgres_uri: str):
    builder = StateGraph(BuffrAgentState, context_schema=CompanionDeps)
    builder.add_node("companion", companion_node)
    builder.add_node("guardian_check", guardian_check_node)
    builder.add_node("human_approval", human_approval_node)
    builder.add_node("execute_tool", execute_tool_node)
    builder.add_edge(START, "companion")
    builder.add_conditional_edges("companion", route_after_companion, {"guardian_check": "guardian_check", "end": END})
    builder.add_conditional_edges("guardian_check", route_after_guardian, {"human_approval": "human_approval", "companion": "companion"})
    builder.add_edge("human_approval", "execute_tool")
    builder.add_edge("execute_tool", "companion")
    async with AsyncPostgresSaver.from_conn_string(postgres_uri) as checkpointer:
        await checkpointer.setup()
        graph = builder.compile(checkpointer=checkpointer)
        return graph  # Use graph within same lifecycle as checkpointer (e.g. app scope)
```

**Resuming after interrupt (e.g. from FastAPI):**

```python
# When the frontend sends "user approved" or "user declined"
from langgraph.types import Command

# First invoke: runs until human_approval_node calls interrupt(); result has __interrupt__
config = {"configurable": {"thread_id": "user-123-session-456"}}
result = await graph.ainvoke(
    {"messages": [{"role": "user", "content": "Transfer 100 from Wallet A to Wallet B"}]},
    config=config,
)
# result["__interrupt__"] = {"action_type": "transfer_funds", "parameters": {...}, "summary_for_user": "..."}

# After user clicks Approve in UI:
result = await graph.ainvoke(
    Command(resume=True),  # or resume={"approved": True}
    config=config,
)
# Graph continues from human_approval_node; execute_tool_node runs next.
```

### 10.4 Postgres Checkpointer Setup

**Reference:** [langgraph-checkpoint-postgres](https://pypi.org/project/langgraph-checkpoint-postgres/).

- Use `AsyncPostgresSaver.from_conn_string(uri)` (or sync `PostgresSaver`).
- Ensure connection uses `autocommit=True` and `row_factory=dict_row` (e.g. `psycopg.rows.dict_row`).
- Call `await checkpointer.setup()` once to create tables (`checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations`).

```python
# Example: create checkpointer and compile once per app lifecycle
import os
from langgraph.checkpoint.postgres import AsyncPostgresSaver

POSTGRES_URI = os.environ.get("BUFFR_CHECKPOINT_DATABASE_URL", "postgresql://localhost/buffr")

async def get_checkpointer():
    async with AsyncPostgresSaver.from_conn_string(POSTGRES_URI) as cp:
        await cp.setup()
        yield cp
```

### 10.5 FastAPI Entrypoint (Sketch)

- One endpoint receives user messages and optional `Command(resume=...)` for approval.
- Use a stable `thread_id` (e.g. from session or user) so the same checkpointer thread is resumed.

```python
# backend or buffr_ai/api/companion.py
from fastapi import APIRouter, Depends
from langgraph.types import Command
from pydantic import BaseModel

from buffr_ai.graph.workflow import build_buffr_graph
from buffr_ai.companion.agent import CompanionDeps

router = APIRouter(prefix="/api/buffr-companion", tags=["companion"])


class ChatRequest(BaseModel):
    message: str | None = None
    thread_id: str
    resume: bool | dict | None = None  # If set, pass Command(resume=resume) instead of message


async def get_deps() -> CompanionDeps:
    # Resolve user from JWT and build deps
    return CompanionDeps(user_id="user-123", auth_token="Bearer ...")


@router.post("/chat")
async def chat(req: ChatRequest, deps: CompanionDeps = Depends(get_deps)):
    graph = build_buffr_graph()
    config = {"configurable": {"thread_id": req.thread_id}}

    if req.resume is not None:
        result = await graph.ainvoke(Command(resume=req.resume), config=config, context=deps)
    else:
        result = await graph.ainvoke(
            {"messages": [{"role": "user", "content": req.message}]},
            config=config,
            context=deps,
        )

    # If interrupted, return payload for UI to show approval modal
    if "__interrupt__" in result:
        return {"status": "interrupt", "approval_payload": result["__interrupt__"]}
    return {"status": "ok", "messages": result.get("messages", []), "last_tool_result": result.get("last_tool_result")}
```

### 10.6 Documentation Links

| Topic | URL |
|-------|-----|
| Pydantic AI – Agents | https://ai.pydantic.dev/agent/ |
| Pydantic AI – Tools | https://ai.pydantic.dev/tools |
| Pydantic AI – Output | https://ai.pydantic.dev/output |
| LangGraph – Graph API (state, nodes, edges) | https://docs.langchain.com/oss/python/langgraph/graph-api |
| LangGraph – Interrupts | https://docs.langchain.com/oss/python/langgraph/interrupts |
| LangGraph – Command (resume) | https://docs.langchain.com/oss/python/langgraph/graph-api#command |
| LangGraph – Postgres checkpointer | https://pypi.org/project/langgraph-checkpoint-postgres/ |

---

## 11. Agent Code Reference (Implemented)

This section documents the **actual implemented code** for the Buffr AI agents. In **buffr-g2p**, these may live in a Python AI backend (e.g. `buffr_ai/agents/` or equivalent when integrated). Reference implementation: `ketchup-smartpay/buffr/buffr_ai/agents/`. Use this section as the single source of truth for agent shape, tools, and APIs.

### 11.1 Voucher Analyst Agent

**Path:** `buffr_ai/agents/voucher_analyst/`

**Purpose:** Voucher lifecycle analysis, redemption forecasting, expiry risk assessment, beneficiary voucher profiling.

**Files:**

| File | Purpose |
|------|---------|
| `agent.py` | Pydantic AI agent definition, `VoucherAnalystDependencies`, `run_voucher_analyst_agent()`, optional ML (VoucherRedemptionForecaster, ExpiryRiskEnsemble, BeneficiarySegmentationEngine) |
| `tools.py` | Tools: `analyze_voucher_lifecycle`, `predict_voucher_redemption`, `assess_expiry_risk`, `get_beneficiary_voucher_profile`, `suggest_optimal_redemption` (use `ctx.deps` for forecaster/expiry/segmentation models) |
| `prompts.py` | `VOUCHER_ANALYST_SYSTEM_PROMPT` – Namibian context, grant types, channels, ML tools |
| `models.py` | `VoucherAnalysisRequest/Response`, `ExpiringVouchersRequest`, `VoucherForecastRequest`, `VoucherSummary`, `ChatRequest` |
| `api.py` | FastAPI router `voucher_analyst_router` prefix `/voucher-analyst`: POST `/analyze`, `/expiring`, `/forecast`, `/chat`, GET `/summary/{user_id}`, `/health` |
| `db_utils.py` | Neon/asyncpg: `get_db_pool`, `fetch_user_vouchers`, `fetch_redemption_history`, `fetch_voucher_analytics`, `fetch_expiring_vouchers` |
| `graph_utils.py` | Optional Neo4j: `initialize_graph`, `close_graph` |
| `providers.py` | `get_llm_model()` – DeepSeek via OpenAI-compatible API; `VOUCHER_ANALYST_MODEL_CONFIG` |

**Key code (agent + deps):**

```python
# buffr_ai/agents/voucher_analyst/agent.py
@dataclass
class VoucherAnalystDependencies:
    session_id: str
    user_id: Optional[str] = None
    voucher_forecaster: Optional[VoucherRedemptionForecaster] = None
    expiry_model: Optional[ExpiryRiskEnsemble] = None
    segmentation_model: Optional[BeneficiarySegmentationEngine] = None
    db_pool: Optional[object] = None

voucher_analyst_agent = Agent(
    get_llm_model(),
    deps_type=VoucherAnalystDependencies,
    retries=2,
    system_prompt=VOUCHER_ANALYST_SYSTEM_PROMPT,
)
```

**API usage:** All routes under `/voucher-analyst`, auth via `authenticate` dependency. Chat: `POST /voucher-analyst/chat` with `ChatRequest(message, user_id?, session_id?)`.

---

### 11.2 Transaction Analyst Agent

**Path:** `buffr_ai/agents/transaction_analyst/`

**Purpose:** Spending analysis, transaction categorization (98%+), user personas, budget recommendations, peer comparison.

**Files:**

| File | Purpose |
|------|---------|
| `agent.py` | Pydantic AI agent, `TransactionAnalystDependencies`, `run_transaction_analyst_agent()`, optional ML (TransactionClassifier, SpendingAnalysisEngine) |
| `tools.py` | Tools: `classify_transaction`, `analyze_spending_patterns`, `generate_budget_recommendation`, `get_spending_insights`, `compare_with_peers` (K-Means + GMM, cluster stats, graph_utils) |
| `prompts.py` | `TRANSACTION_ANALYST_SYSTEM_PROMPT` – 14 categories, personas, tools list |
| `models.py` | `TransactionClassificationRequest/Response`, `SpendingAnalysisRequest/Response`, `BudgetRequest/Response` |
| `api.py` | Router `transaction_analyst_router` prefix `/transaction-analyst`: POST `/classify`, `/analyze`, `/budget`, `/chat`, GET `/health` |
| `db_utils.py` | `get_db_pool`, `fetch_user_transactions`, `get_cluster_statistics`, `get_peer_statistics` |
| `graph_utils.py` | Optional Neo4j: `initialize_graph`, `update_spending_graph`, `get_user_spending_network` |
| `providers.py` | `get_llm_model()` – DeepSeek |

**Key code (deps + tools):**

```python
# buffr_ai/agents/transaction_analyst/agent.py
@dataclass
class TransactionAnalystDependencies:
    session_id: str
    user_id: Optional[str] = None
    classifier_model: Optional[TransactionClassifier] = None
    spending_model: Optional[SpendingAnalysisEngine] = None
    db_pool: Optional[object] = None
    neo4j_client: Optional[object] = None
```

**API usage:** `/transaction-analyst` routes; chat: `POST /transaction-analyst/chat` (message, user_id optional).

---

### 11.3 Guardian Agent

**Path:** `buffr_ai/agents/guardian/`

**Purpose:** Fraud detection, credit scoring, compliance (ETA 2019, AML/CFT, PSD), spending anomalies, security investigations.

**Files:**

| File | Purpose |
|------|---------|
| `agent.py` | Pydantic AI agent, `GuardianDependencies`, `run_guardian_agent()`, `investigate_security_alert()`, `get_investigation_stats()`, FatigueHandler + ConsistencyTracker + AIInvestigationWorkflow |
| `tools.py` | Tools: `detect_transaction_fraud`, `assess_credit_risk`, `check_compliance`, `monitor_spending_anomalies`; audit via `store_fraud_check`, `store_credit_assessment` |
| `prompts.py` | `GUARDIAN_SYSTEM_PROMPT`, `FRAUD_EXPLANATION_TEMPLATE`, `CREDIT_ASSESSMENT_TEMPLATE`, `COMPLIANCE_REPORT_TEMPLATE` |
| `models.py` | `RiskLevel`, `RecommendedAction`, `CreditTier`; request/response models for fraud, credit, compliance, anomalies; DB models `FraudCheck`, `CreditAssessment`, `GuardianSession` |
| `api.py` | Router `guardian_router` prefix `/guardian`: POST `/fraud/check`, `/credit/assess`, `/chat`, GET `/health` |
| `db_utils.py` | `get_db_pool`, `store_fraud_check`, `store_credit_assessment`, `fetch_user_transaction_history`, `fetch_merchant_data`, `create_guardian_session` |
| `fatigue_handler.py` | `FatigueHandler` – fatigue threshold, `check_fatigue()`, `adjust_workflow()`, `record_investigation()` |
| `investigation_workflow.py` | `AIInvestigationWorkflow` – `investigate_alert()`, context gathering, correlation, AI analysis, consistency check |
| `consistency_tracker.py` | `ConsistencyTracker` – `record_investigation()`, `get_consistency_score()`, `get_pattern_statistics()` |
| `graph_utils.py` | Optional Neo4j: `update_transaction_graph`, `get_merchant_risk_network`, `get_user_transaction_patterns` |
| `providers.py` | `get_llm_model()`, `get_embedding_model()`, `GUARDIAN_MODEL_CONFIG` |

**Key code (deps + run):**

```python
# buffr_ai/agents/guardian/agent.py
@dataclass
class GuardianDependencies:
    session_id: str
    user_id: Optional[str] = None
    fraud_model: Optional[FraudDetectionEnsemble] = None
    credit_model: Optional[CreditScoringEnsemble] = None
    db_pool: Optional[object] = None
    neo4j_client: Optional[object] = None
```

**API usage:** `/guardian/fraud/check`, `/guardian/credit/assess`, `/guardian/chat`; all require auth.

---

### 11.4 Companion Agent (Orchestrator)

**Path:** `buffr_ai/agents/companion/`

**Purpose:** Main conversational orchestrator; routes to Guardian and Transaction Analyst; customer support (knowledge base, tickets, escalation).

**Files:**

| File | Purpose |
|------|---------|
| `agent.py` | Pydantic AI agent, `CompanionDependencies`, `run_companion_agent()` |
| `tools.py` | `route_to_guardian`, `route_to_transaction_analyst`, `coordinate_multi_agent` (sequential/parallel), `get_user_context`, `search_knowledge_base`, `create_support_ticket`, `escalate_to_admin`, `check_ticket_status`; enums `TicketCategory`, `TicketPriority`, `TicketStatus` |
| `prompts.py` | `COMPANION_SYSTEM_PROMPT` – routing rules, orchestration modes, support & escalation, Namibian context |
| `models.py` | `ChatRequest` (message, user_id, session_id, conversation_history), `ChatResponse`, `MultiAgentRequest/Response`, `UserContextResponse` |
| `api.py` | Router `companion_router` prefix `/companion`: POST `/chat`, `/chat/stream` (SSE), `/multi-agent`, GET `/context/{user_id}`, `/history/{session_id}`, `/health` |
| `db_utils.py` | `get_db_pool`, `store_conversation`, `get_conversation_history` |
| `providers.py` | `get_llm_model()` – DeepSeek |

**Key code (deps + tools):**

```python
# buffr_ai/agents/companion/agent.py
@dataclass
class CompanionDependencies:
    session_id: str
    user_id: Optional[str] = None
    db_pool: Optional[object] = None
    neo4j_client: Optional[object] = None
    conversation_history: List[Dict[str, Any]] = None
```

**Routing:** Companion currently routes only to **Guardian** and **Transaction Analyst**. To support voucher insights from the blueprint, add a tool `route_to_voucher_analyst` in `tools.py` that calls `run_voucher_analyst_agent()` from `buffr_ai.agents.voucher_analyst`, and register it in `coordinate_multi_agent` mapping.

**API usage:** `POST /companion/chat` or `POST /companion/chat/stream` (SSE); `POST /companion/multi-agent` for explicit multi-agent coordination.

---

### 11.5 Integration Summary

| Component | Location | Consumed by |
|-----------|----------|-------------|
| Voucher Analyst | `agents/voucher_analyst` | API only (Companion can add routing) |
| Transaction Analyst | `agents/transaction_analyst` | Companion (`route_to_transaction_analyst`, `coordinate_multi_agent`) |
| Guardian | `agents/guardian` | Companion (`route_to_guardian`, `coordinate_multi_agent`) |
| Companion | `agents/companion` | FastAPI app (mount `companion_router`) |

All agents use **Pydantic AI** with `deps_type`, **DeepSeek** via `providers.get_llm_model()`, and **Neon PostgreSQL** via per-agent `db_utils.get_db_pool()`. Optional: Neo4j (`graph_utils`), ML models (`buffr_ai.ml.*`).

---

## 12. ML Module Reference (buffr_ai/ml)

The Buffr AI backend includes a full ML module. In **buffr-g2p**, this may live under a Python AI backend (e.g. `buffr_ai/ml/` or equivalent when integrated). Reference implementation: `ketchup-smartpay/buffr/buffr_ai/ml/`. All models use **scikit-learn** (and **PyTorch** for the fraud neural network); they are **optional**: the module degrades gracefully if pandas/sklearn are missing (`ML_AVAILABLE`, `G2P_ML_AVAILABLE`).

**Purpose:** Provide production-ready ensembles and engines for Guardian (fraud, credit), Transaction Analyst (classification, spending, peer comparison), Voucher Analyst (forecast, expiry risk), and G2P operations (segmentation, adoption, churn, NPS, agent demand).

### 12.1 Module Layout and Availability

| File | Class / Main API | Used By | Notes |
|------|-------------------|---------|--------|
| `__init__.py` | `ML_AVAILABLE`, `G2P_ML_AVAILABLE`, all class exports | All | Optional imports; `load_*` are async where defined |
| `fraud_detection.py` | `FraudDetectionEnsemble`, `extract_fraud_features`, `load_fraud_models()` | Guardian | 4-model ensemble (LR, NN, RF, GMM); 29 features incl. 9 agent |
| `credit_scoring.py` | `CreditScoringEnsemble`, `extract_credit_features`, `load_credit_models()` | Guardian | 4-model ensemble; tiers EXCELLENT→DECLINED, NAD 500–10k |
| `transaction_classification.py` | `TransactionClassifier`, `load_classifier()` | Transaction Analyst | RF+DT+Bagging+AdaBoost; 14 categories + 3 agent categories |
| `spending_analysis.py` | `SpendingAnalysisEngine`, `load_spending_models()` | Transaction Analyst | K-Means + GMM; Namibian personas, budget recs |
| `agent_network_features.py` | `AgentNetworkFeatureExtractor`, `agent_feature_extractor` | Fraud, TransactionClassifier | 9 agent features; asyncpg fetch + pandas extract |
| `voucher_forecast.py` | `VoucherRedemptionForecaster`, `VoucherForecastFeatures`, `load_forecast_models()` | Voucher Analyst | Days-to-redeem (GBR) + channel (RFC); 11 features |
| `expiry_risk.py` | `ExpiryRiskEnsemble`, `ExpiryRiskFeatures`, `load_expiry_models()` | Voucher Analyst | 3-model ensemble (LR, RF, GB); risk tier + intervention |
| `beneficiary_segmentation.py` | `BeneficiarySegmentationEngine`, `BeneficiaryFeatures`, `load_segmentation_models()` | Voucher Analyst | K-Means + GMM; 6 segments (e.g. Rural Elderly, Digital-First) |
| `digital_adoption.py` | `DigitalAdoptionEngine`, `AdoptionFeatures`, `load_adoption_models()` | Product/Companion | K-Means + RFC; 5 tiers (Dormant→Champion) |
| `churn_prediction.py` | `ChurnPredictionEnsemble`, `ChurnFeatures`, `load_churn_models()` | Product/Companion | 3-model ensemble; risk tier, days estimate |
| `nps_scoring.py` | `NPSScoringEnsemble`, `NPSFeatures`, `load_nps_models()` | Product/Companion | 3-model regression; NPS 0–100, Promoter/Passive/Detractor |
| `agent_demand.py` | `AgentDemandForecaster`, `AgentDemandFeatures`, `load_demand_models()` | Ops/Backend | Daily agent float demand; restock alert |

### 12.2 Agent ↔ ML Mapping (Backend Integration)

| Agent | Dependency field | ML classes to inject |
|-------|-------------------|----------------------|
| **Guardian** | `fraud_model`, `credit_model` | `FraudDetectionEnsemble`, `CreditScoringEnsemble` |
| **Transaction Analyst** | `classifier_model`, `spending_model` | `TransactionClassifier`, `SpendingAnalysisEngine` |
| **Voucher Analyst** | `voucher_forecaster`, `expiry_model`, `segmentation_model` | `VoucherRedemptionForecaster`, `ExpiryRiskEnsemble`, `BeneficiarySegmentationEngine` |
| **Companion** | (optional) | Use analyst agents above; can add adoption/churn/NPS for proactive messaging |

At startup, the backend should: (1) check `ML_AVAILABLE` / `G2P_ML_AVAILABLE`; (2) call the relevant `load_*()` async loaders (e.g. `load_fraud_models()`, `load_credit_models()`, `load_classifier()`, `load_spending_models()`, `load_forecast_models()`, `load_expiry_models()`, `load_segmentation_models()`); (3) pass the loaded instances into each agent’s dependencies so tools can call `.predict()` / `.predict_ensemble()` / `.assess_credit()` / `.analyze()` without touching the DB for model weights.

### 12.3 Feature and Model Summary

- **Fraud (Guardian):** 29 features (20 base + 9 agent). Ensemble: LogisticRegression, FraudDetectionNN (PyTorch), RandomForest, GMM. Output: `fraud_probability`, `is_fraud`, `model_scores`, explainability via LR coefficients.
- **Credit (Guardian):** 30 features (transaction, merchant, alternative data, loan history). Ensemble: LR, DecisionTree, RF, GradientBoosting. Output: `credit_score` (300–850), `tier`, `max_loan_amount`, `interest_rate`; decision rules from DT.
- **Transaction classification (Transaction Analyst):** TF-IDF (merchant name) + numerical (amount, time, MCC) + 9 agent features. Categories: 14 standard + AGENT_CASHOUT, AGENT_CASHIN, AGENT_COMMISSION. Ensemble: RF (0.4), DT (0.2), Bagging (0.2), AdaBoost (0.2).
- **Spending (Transaction Analyst):** 10 features (e.g. avg_monthly_spending, cash_withdrawal_frequency, savings_rate). K-Means + GMM; Namibian personas (Grant Recipient, Urban Professional, Rural User, etc.); budget and peer comparison.
- **Agent network features:** Used by fraud and transaction classification. `AgentNetworkFeatureExtractor`: asyncpg query joining transactions → agent_transactions → agents; then `extract_agent_features()` adds 9 columns (e.g. `is_agent_transaction`, `agent_type_encoded`, `agent_risk_score`). Sync helper `agent_feature_extractor.extract_agent_features(df)` for use in training/prediction pipelines.
- **Voucher forecast (Voucher Analyst):** 11 features (e.g. days_since_issue, grant_type_encoded, beneficiary_segment). GradientBoostingRegressor (days to redeem) + RandomForestClassifier (channel). Output: `predicted_days_to_redeem`, `predicted_channel`, `confidence`.
- **Expiry risk (Voucher Analyst):** 12 features (e.g. days_until_expiry, channel_availability_score). LogisticRegression + RandomForest + GradientBoosting; weighted ensemble. Output: `expiry_probability`, `risk_tier` (High/Medium/Low), `recommended_intervention` (agent_outreach, sms_reminder, no_action), `top_risk_factors`.
- **Beneficiary segmentation (Voucher Analyst):** 12 features (e.g. age_bracket, redemption_frequency, digital_literacy_score). K-Means (6) + GMM (6). Segments: Rural Elderly, Urban Youth, Peri-Urban Family, Digital-First, Traditional Cash, New Enrollee; segment-specific recommendations.
- **Digital adoption:** 14 features (e.g. has_used_send_money, session_count_30d, features_used_count). K-Means (5 tiers) + RandomForest classifier. Tiers: Dormant, Basic, Active, Power, Champion; adoption_score 0–1, engagement_trend.
- **Churn:** 15 features (e.g. tx_count_30d, days_since_last_redemption, has_savings_goal). 3-model ensemble (LR, RF, GB). Output: `churn_probability`, `risk_tier`, `days_to_churn_estimate`, `top_risk_factors`.
- **NPS:** 12 features (e.g. tx_success_rate, support_ticket_count_30d, feature_adoption_score). 3-model regression (GB, RF, Ridge). Output: `nps_score` (0–100), `satisfaction_tier`, key_drivers, improvement_areas.
- **Agent demand:** 10 features (e.g. day_of_week, active_beneficiaries_in_region, pending_voucher_value_in_region). GBR + Ridge. Output: `predicted_daily_demand`, `recommended_float`, `restock_alert`, `confidence`.

### 12.4 Model Persistence and Environment

- All ML classes implement `save(directory: Path)` and `load(directory: Path)` (joblib for sklearn/PyTorch state).
- Async loaders use `os.getenv('MODEL_DIR', 'buffr_ai/models/<name>')` (e.g. `buffr_ai/models/fraud_detection`, `buffr_ai/models/voucher_forecast`). If the directory does not exist or load fails, they log a warning and return an untrained instance so the app still runs.
- For the **Buffr G2P backend**, set `MODEL_DIR` (or per-model dirs) to a path where trained artifacts are stored; run training pipelines offline and deploy the same paths so `load_*()` find the pkl/pt files.

### 12.5 Blueprint Cross-References

- **§2.1 Analysis & Insights:** Spending analysis → `SpendingAnalysisEngine`; Voucher forecasting / expiry risk → `VoucherRedemptionForecaster`, `ExpiryRiskEnsemble`; Financial health / fraud → `CreditScoringEnsemble`, `FraudDetectionEnsemble`; Peer comparison → cluster stats from `SpendingAnalysisEngine` / `BeneficiarySegmentationEngine`.
- **§4.2 Collaborative filtering:** K-Means clustering in `SpendingAnalysisEngine` and `BeneficiarySegmentationEngine`; peer stats from cluster aggregates.
- **§5.1 Fraud detection:** `FraudDetectionEnsemble.predict_ensemble()`; risk > 0.6 → flag/block; explain via `explain_prediction()`.
- **§6 Technology stack:** ML = scikit-learn, PyTorch (fraud NN); align backend runtime with these dependencies when deploying the buffr_ai/ml stack.

---

## 13. ML Training Guide (Complete)

*Source: `buffr_ai/COMPLETE_TRAINING_GUIDE.md`. Use this for training all Buffr ML models with best practices.*

### 13.1 Overview

Buffr uses **4 production ML model ensembles** (15 individual models) for critical business functions:

| Ensemble | Purpose | Models | Key Metrics |
|----------|---------|--------|-------------|
| **Fraud Detection** | Real-time transaction fraud detection | LR, NN, RF, GMM | Precision >95%, Recall >90%, &lt;10ms inference |
| **Credit Scoring** | Merchant credit risk (Buffr Lend) | LR, DT, RF, GB | ROC-AUC >0.75, Gini >0.50, Brier &lt;0.15 |
| **Spending Analysis** | User spending personas & segmentation | K-Means, GMM, Hierarchical | Silhouette >0.5, cluster stability |
| **Transaction Classifier** | Automatic transaction categorization | DT, RF, Bagging, AdaBoost | Accuracy per category >85% |

### 13.2 Quick Start

**Automated pipeline (recommended):**
```bash
# From the Python AI backend root (e.g. buffr_ai/ or the repo containing it)
python train_all_models.py
```
Runs: environment validation → data prep → train all ensembles → evaluation → report.

**Step-by-step:**
```bash
python validate_setup.py
python prepare_training_data.py --generate-synthetic   # or --export-transactions etc.
python train_models.py --all
python evaluate_models.py --all
```
For script options and G2P training, see **§15 Scripts Reference**. For visualizations and runbook, see **§16 ML Visualizations** and **§18 Training Runbook & Production Summary**.

**Train specific models:**
```bash
python train_all_models.py --models fraud credit
python train_models.py --fraud --credit --spending
```

### 13.3 Training Workflow

1. **Environment validation** – Dependencies, model imports, directories.
2. **Data preparation** – Synthetic (`--generate-synthetic`) or DB export (`--export-transactions`, `--export-credit`, `--days-back`, `--limit`); validate with `--validate`.
3. **Model training** – `train_models.py --all` or per-ensemble (`--fraud`, `--credit`, `--spending`, `--classification`); outputs under `models/<ensemble_name>/`.
4. **Evaluation** – `evaluate_models.py --all` (metrics, confusion matrices, ROC, feature importance).
5. **Review** – `models/training_summary.json`, logs, per-model `evaluation_report.json`.

**Output layout:**
```
models/
├── fraud_detection/     # logistic_model.pkl, nn_model.pt, random_forest_model.pkl, gmm_model.pkl, scaler.pkl
├── credit_scoring/      # logistic_model.pkl, decision_tree.pkl, random_forest_model.pkl, gradient_boosting_model.pkl, scaler.pkl
├── spending_analysis/   # kmeans.pkl, gmm.pkl, scaler.pkl, personas.pkl
├── transaction_classification/  # rf_classifier.pkl, dt_classifier.pkl, bagging_classifier.pkl, adaboost_classifier.pkl, vectorizer.pkl, scaler.pkl, label_encoder.pkl
└── training_summary.json
```

### 13.4 Statistical Learning Foundations (Applied)

- **Bias–variance:** Regularization (e.g. LR `C=0.5`), early stopping (NN), max depth limits (DT).
- **Cross-validation:** Train/val/test (e.g. 80/10/10), stratified splits for imbalanced fraud/credit; K-fold for tuning.
- **Feature engineering:** Log transform (`np.log1p(amount)`), cyclical encoding (hour sin/cos), StandardScaler, one-hot/categorical encoding.
- **Ensembles:** Weighted voting; bagging/boosting as in §12 model descriptions.

### 13.5 Evaluation Metrics

- **Classification (fraud, credit, transaction):** Precision, Recall, F1, ROC-AUC, confusion matrix.
- **Probability/calibration:** Brier score, Gini = 2×ROC-AUC − 1.
- **Clustering (spending):** Silhouette score, Davies-Bouldin index, inertia (elbow).

### 13.6 Retraining and Automation

- **When to retrain:** Monthly; after data drift or feature/business-rule changes.
- **Automation example:** Weekly cron `0 2 * * 0 cd /path/to/buffr && python train_all_models.py`.

### 13.7 Troubleshooting

| Issue | Mitigation |
|-------|------------|
| Insufficient data | `--min-samples` or `--generate-synthetic --n-samples 20000` |
| Low performance | More data, feature engineering, hyperparameter tuning, **check data leakage** (§14), `class_weight='balanced'` |
| Memory | Smaller batch size (NN), train one ensemble at a time, data generators for large sets |
| Import errors | `python validate_setup.py`, reinstall deps, set `PYTHONPATH` |

---

## 14. Data Leakage Prevention & Handling

*Source: `buffr_ai/DATA_LEAKAGE_HANDLING.md`. Ensures production-ready, realistic model performance.*

### 14.1 What is Data Leakage?

Data leakage is when features contain information that would **not be available at prediction time**, inflating metrics and hurting generalization.

**Common patterns:**

- **Target leakage** – Features derived from the target (e.g. using `defaulted` to build `default_history_flag`). Fix: use only historical/independent inputs.
- **Perfect correlation** – A feature with >99% correlation with the target. Fix: remove or redesign.
- **Temporal leakage** – Using future data to predict the past. Fix: time-based train/test splits.

### 14.2 Detection and Removal (`check_data_leakage`)

**Location:** `train_models.py` → `check_data_leakage()`.

- Computes correlation of each feature with the target; handles NaNs.
- Flags features with correlation > 0.99 (leakage) or > 0.95 (high risk).
- **Auto-removal** (`auto_remove=True`): drops features above threshold, returns cleaned `X_cleaned`, logs removed feature names.
- Feature names from dataclass: `[f.name for f in fields(CreditFeatures)]` for accurate reporting.

**Example log:**
```
⚠️  Data leakage warnings detected:
  - Feature default_history_flag has near-perfect correlation (1.0000) with target - LEAKAGE DETECTED!
🔧 Automatically removed 2 leaky features: ['default_history_flag', 'has_previous_loans']
   Features before: 30, Features after: 28
✅ Using cleaned feature matrix with 28 features
```

### 14.3 Root Cause Prevention (Credit Scoring)

In **credit feature engineering**, avoid building features from the target:

- **Leaky:** `has_previous_loans = int(row.get('defaulted', 0))`, `default_history_flag = int(row.get('defaulted', 0))`, or `previous_loan_repayment_rate` derived from `defaulted`.
- **Fixed:** Use independent or historically available data only (e.g. from prior periods, not the current outcome).

### 14.4 Results and Best Practices

- **Before fix (leakage):** ROC-AUC ≈ 1.0 (unrealistic).
- **After fix:** ROC-AUC ~0.58–0.59 (realistic for credit); no obvious leakage.
- **Practices:** Run leakage check before every training run; auto-remove above threshold; log removed features; fix feature engineering at source; use dataclass fields for names; handle NaNs in correlation.

### 14.5 Monitoring and Extensions

- Leakage check runs in credit scoring prep; extend to other models as needed.
- **Future:** Temporal validation, feature importance before/after removal, leakage checks inside CV folds, model comparison with/without leaky features.

---

## 15. Scripts Reference (Training & Evaluation)

All scripts run from the Python AI backend used by buffr-g2p. In that backend, scripts live under the project root (e.g. `buffr_ai/` or the repo that contains `buffr_ai`). Reference implementation: `ketchup-smartpay/buffr/buffr_ai/`. They are used in the order given in §13.2.

| Script | Purpose | CLI entrypoint | Main options |
|--------|---------|----------------|--------------|
| **validate_setup.py** | Check Python version, core deps (numpy, pandas, sklearn, torch, joblib), ML model files, training scripts, config, data/model dirs; test model imports. | `python validate_setup.py` | (none) |
| **prepare_training_data.py** | Export transactions/credit from DB or generate synthetic Namibian-aligned data; validate data quality. | `python prepare_training_data.py` | `--generate-synthetic`, `--export-transactions`, `--export-credit`, `--validate`, `--data-dir`, `--db-url`, `--days-back`, `--limit` |
| **train_models.py** | Train the 4 core ensembles (fraud, credit, spending, transaction classification). Data loading, feature prep, leakage check (§14), train/val/test split, CV, SMOTE, save models and metadata, generate plots (§16). | `python train_models.py` | `--all`, `--fraud`, `--credit`, `--spending`, `--classification`, `--data-dir`, `--model-dir`, `--min-samples`, `--no-cv`, `--no-smote`, `--cv-folds` |
| **train_g2p_models.py** | Train 7 G2P-specific models: churn, NPS, digital adoption, beneficiary segmentation, voucher forecast, agent demand, expiry risk. Reads CSV from `buffr_ai/data/`, saves to `buffr_ai/models/`. | `python -m buffr_ai.train_g2p_models` | `--all`, `--churn`, `--nps`, `--adoption`, `--segmentation`, `--forecast`, `--demand`, `--expiry` |
| **train_all_models.py** | Master pipeline: validate → prepare data → train (via train_models.py) → evaluate → report. Subprocesses the above scripts. | `python train_all_models.py` | `--models fraud credit ...`, `--use-db`, `--skip-validation`, `--skip-data-prep`, `--no-cv`, `--no-smote`, `--cv-folds`, `--data-dir`, `--model-dir` |
| **evaluate_models.py** | Load trained models and test data; compute metrics (accuracy, precision, recall, F1, ROC-AUC, Gini, Brier, confusion matrix); save `evaluation_results.json`. | `python evaluate_models.py` | `--all`, `--fraud`, `--credit`, `--spending`, `--classification`, `--data-dir`, `--model-dir` |

**Workflow:** See §13.2 and §13.3. Validate first, then prepare data, then train (either `train_all_models.py` or `train_models.py` + optionally `train_g2p_models.py`), then evaluate.

---

## 16. ML Visualizations

*Source: `buffr_ai/VISUALIZATION_GUIDE.md`. All plots are written to **`models/plots/`** (created by `train_models.py`).*

### 16.1 Generated Plots

| Model | Files | Description |
|-------|--------|-------------|
| **Fraud detection** | `fraud_detection_roc_curve.png`, `_precision_recall_curve.png`, `_confusion_matrix.png`, `_feature_importance.png`, `_metrics_comparison.png` | ROC, PR curve, confusion matrix, top-15 feature importance, train/val/test metrics bars |
| **Credit scoring** | `credit_scoring_roc_curve.png`, `_precision_recall_curve.png`, `_confusion_matrix.png`, `_feature_importance.png`, `_metrics_comparison.png` | Same pattern; feature importance from Random Forest |
| **Spending analysis** | `spending_analysis_clustering.png` | 2D PCA projection of 8 spending personas (K-Means labels) |

Transaction classification does not auto-generate plots (can be added).

### 16.2 Specs and Viewing

- **Format:** PNG, 300 DPI, 10×8 in (12×8 for feature importance). Seaborn + Matplotlib.
- **View:** Open `models/plots/*.png` directly, or use Python/Jupyter: `PIL.Image.open(...)` / `IPython.display.Image(...)`.
- **Customization:** In `train_models.py`: `plot_roc_curve`, `plot_precision_recall_curve`, `plot_confusion_matrix`, `plot_feature_importance`, `plot_training_metrics_comparison` (see VISUALIZATION_GUIDE.md for line references).

Plots are generated automatically at the end of each ensemble training in `train_models.py`; no separate step required.

---

## 17. UCI German Credit Comparison (Credit Benchmark)

*Source: `buffr_ai/UCI_GERMAN_CREDIT_COMPARISON.md`. Use for context when interpreting credit model design and benchmarks.*

Buffr credit data is **merchant lending** (Namibian, transaction-based); UCI German Credit is **consumer lending** (1990s Germany, application-form). Comparison summary:

| Dimension | UCI German Credit | Buffr Credit |
|-----------|-------------------|--------------|
| Domain | Consumer | Merchant (Buffr Lend) |
| Samples | 1,000 | 5,000+ |
| Features | 20 (mostly categorical) | 30 (transaction/behavioral) |
| Data | Historical, static | Real-time, behavioral |
| Class balance | ~70/30 | ~90/10 (default) |
| Use | Benchmark, research | Production merchant lending |

**Takeaways:** Buffr has more samples, richer features, and domain fit for Namibia; UCI is better for academic baselines and interpretability. For production merchant lending, Buffr data is preferred. Evaluation should focus recall (cost of missing defaults), precision–recall curves, Gini, and Brier (§13.5, §14.4). Full feature mapping and recommendations: see **UCI_GERMAN_CREDIT_COMPARISON.md**.

---

## 18. Training Runbook & Production Summary

*Source: `buffr_ai/TRAINING_COMPLETE_SUMMARY.md`. Use after a full training run to verify production readiness.*

### 18.1 Runbook (concise)

1. **Validate:** `python validate_setup.py` (§15).
2. **Prepare data:** `python prepare_training_data.py --generate-synthetic` (or DB export); optionally `--validate` (§15).
3. **Train core:** `python train_models.py --all` or `python train_all_models.py` (§13.2, §15).
4. **Train G2P (optional):** `python -m buffr_ai.train_g2p_models --all` (§15).
5. **Evaluate:** `python evaluate_models.py --all` (§15).
6. **Review:** `models/training_summary.json`, `models/plots/`, §16; confirm no leakage (§14).

### 18.2 Achieved Metrics (reference)

From TRAINING_COMPLETE_SUMMARY.md (post–leakage fix, Namibian-aligned synthetic data):

| Model | Target | Achieved | Status |
|-------|--------|----------|--------|
| Fraud detection | ROC-AUC > 0.85 | 0.90 | ✅ |
| Transaction classification | Accuracy > 95% | 99.79% | ✅ |
| Spending analysis | Silhouette > 0.2 | 0.25 | ✅ |
| Credit scoring | ROC-AUC > 0.55 | 0.59 | ✅ (no leakage) |

Full tables (CV scores, top features, persona list, leakage handling) are in **TRAINING_COMPLETE_SUMMARY.md**.

---

## 19. Python Dependencies (ML & Training)

*Relevant subset of `buffr_ai/requirements.txt`. See full file for pinned versions.*

| Category | Packages |
|----------|----------|
| **Core ML** | `numpy`, `pandas`, `scikit-learn`, `torch`, `joblib` |
| **Imbalanced data** | `imbalanced-learn` (SMOTE) |
| **Visualization** | `matplotlib`, `seaborn` |
| **API / app** | `fastapi`, `uvicorn`, `pydantic`, `python-dotenv` |
| **Agents / infra** | `pydantic-ai`, `langgraph`, MCP, Anthropic/OpenAI/DeepSeek clients, etc. |

ML training and evaluation require at least: `numpy`, `pandas`, `scikit-learn`, `torch`, `joblib`, `imbalanced-learn`, `matplotlib`, `seaborn`. Run `python validate_setup.py` to confirm imports (§15).

---

## 20. API Entrypoints (main.py & ml_api.py)

*Source: `buffr_ai/main.py`, `buffr_ai/ml_api.py`. Describes how the app and ML API are served and mounted.*

### 20.1 Main application (main.py)

- **Run:** `python main.py` or `uvicorn main:app`; default host `0.0.0.0`, port **8001** (`PORT` env).
- **Environment:** `.env.local` (parent or `buffr_ai`), then `.env`; **JWT_SECRET** required at startup.
- **Startup:** Load ML models (fraud, credit, spending, classifier; optional), init DB, register cron tasks. On failure, ML is disabled; app still runs.
- **Mounts:** ML API at **`/api/ml`** (if available); RAG at root. Agents and G2P/mobile/admin/BON/webhook routers under `/api` or `/api/v1`.
- **Root:** `GET /` returns service list (ml_api, agents, G2P, mobile, docs). **Health:** `GET /health` returns status of ML, RAG, DB, and agents (200 if DB connected, else 503).

### 20.2 ML API (ml_api.py)

- **Mounted at:** `/api/ml` by main app (e.g. `/api/ml/health`, `/api/ml/fraud/check`).
- **Lifespan:** Loads all ML models (core + G2P: fraud, credit, spending, classifier, churn, NPS, adoption, segmentation, voucher forecast, agent demand, expiry risk). On load failure, that model is unavailable; endpoints return 503 when used.
- **Auth:** Endpoints use `Depends(authenticate)` (API key or JWT per `buffr_ai.middleware.auth`).
- **Core routes:** `POST /fraud/check`, `POST /credit/assess`, `POST /transactions/classify`, `POST /spending/analyze`, `POST /spending/budget`; **G2P routes:** `POST /churn/predict`, `POST /nps/score`, `POST /adoption/analyze`, `POST /beneficiaries/segment`, `POST /vouchers/forecast`, `POST /agents/demand-forecast`, `POST /vouchers/expiry-risk`; **Health:** `GET /health` (model availability map).
- **Request/response models:** Pydantic models in `ml_api.py` (e.g. `FraudCheckRequest`, `CreditAssessmentRequest`); see **ml_api.py** for full route list, request/response schemas, and dependency helpers.

---

*This document serves as the master blueprint. All subsequent development should reference it.*

*For Archon PRP import, use `docs/BUFFR_AI_COMPANION_PRP.json` with the `manage_document` MCP tool (project_id required).*
