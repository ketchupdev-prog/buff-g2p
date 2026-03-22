"""
HTTP tests for POST /api/v1/copilot/chat.

Uses a minimal FastAPI app with the real router and a mocked LangGraph (no LLM/DB).

Run:
  cd fintech/apps/smartpay-ai && pytest smartpay_ai/tests/test_chat_http_api.py -v
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from smartpay_ai.api.copilot_endpoint import router as copilot_router


class _FakeGraph:
    """Stub graph matching the chat handler's ainvoke contract."""

    def __init__(self, result):
        self._result = result
        self.ainvoke = AsyncMock(return_value=result)


@pytest.fixture
def chat_app():
    app = FastAPI()
    app.include_router(copilot_router)
    app.state.graph = _FakeGraph(
        {"messages": [{"role": "assistant", "content": "Integration test reply"}]}
    )
    return app


@pytest.fixture
def chat_client(chat_app):
    return TestClient(chat_app)


@pytest.mark.unit
@patch(
    "smartpay_ai.api.copilot_endpoint.fetch_user_profile",
    new_callable=AsyncMock,
)
def test_post_chat_returns_assistant_message(mock_profile, chat_client):
    mock_profile.return_value = {
        "id": "user-int-test",
        "email": "test@example.com",
    }

    res = chat_client.post(
        "/api/v1/copilot/chat",
        json={"message": "Hello", "thread_id": "thread-int-1"},
        headers={"Authorization": "Bearer fake-jwt"},
    )

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "ok"
    assert body["thread_id"] == "thread-int-1"
    assert len(body["messages"]) >= 1
    last = body["messages"][-1]
    assert last["role"] == "assistant"
    assert "Integration test reply" in last["content"]


@pytest.mark.unit
@patch(
    "smartpay_ai.api.copilot_endpoint.fetch_user_profile",
    new_callable=AsyncMock,
)
def test_post_chat_interrupt_for_human_approval(mock_profile, chat_app):
    mock_profile.return_value = {"id": "user-int-test"}
    chat_app.state.graph = _FakeGraph(
        {
            "__interrupt__": {
                "action_type": "transfer_money",
                "parameters": {"amount": 10},
                "summary_for_user": "Send N$10?",
                "risk_level": "low",
            }
        }
    )
    client = TestClient(chat_app)

    res = client.post(
        "/api/v1/copilot/chat",
        json={"message": "Send 10 bucks", "thread_id": "thread-hitl"},
        headers={"Authorization": "Bearer fake-jwt"},
    )

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "interrupt"
    assert body["approval_payload"]["action_type"] == "transfer_money"
    assert body["thread_id"] == "thread-hitl"


@pytest.mark.unit
def test_post_chat_graph_unavailable_returns_503(chat_app):
    chat_app.state.graph = None
    client = TestClient(chat_app)

    res = client.post(
        "/api/v1/copilot/chat",
        json={"message": "Hi", "thread_id": "thread-x"},
    )

    assert res.status_code == 503
    assert "not ready" in res.json()["detail"].lower()


@pytest.mark.unit
def test_post_chat_requires_message_when_not_resuming(chat_client):
    res = chat_client.post(
        "/api/v1/copilot/chat",
        json={"thread_id": "thread-y"},
    )

    assert res.status_code == 400
    assert "message required" in res.json()["detail"].lower()
