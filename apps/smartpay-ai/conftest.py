"""
Pytest configuration and shared fixtures for Smartpay AI tests.

This file provides:
- Database connection fixtures (with proper cleanup)
- Mock external services
- Shared test utilities
- Environment configuration
"""

import os
import asyncio
import pytest
from typing import AsyncGenerator, Dict, Any
from unittest.mock import Mock, AsyncMock, MagicMock
from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()


# ============================================================================
# Pytest Configuration
# ============================================================================

def pytest_configure(config):
    """Configure pytest with custom settings."""
    # Ensure test environment is set
    os.environ.setdefault("ENVIRONMENT", "test")
    os.environ.setdefault("LOG_LEVEL", "WARNING")
    
    # Disable ML models for faster tests
    os.environ.setdefault("ML_ENABLED", "false")
    
    print("\n🧪 Test Environment Configuration:")
    print(f"   DATABASE_URL: {'✓ Set' if os.getenv('DATABASE_URL') else '✗ Missing'}")
    print(f"   DEEPSEEK_API_KEY: {'✓ Set' if os.getenv('DEEPSEEK_API_KEY') else '✗ Missing'}")
    print(f"   LLM_PROVIDER: {os.getenv('LLM_PROVIDER', 'deepseek')}")
    print(f"   ENVIRONMENT: {os.getenv('ENVIRONMENT')}")
    print()


def pytest_collection_modifyitems(config, items):
    """
    Modify test collection to add markers automatically based on test names and paths.
    """
    for item in items:
        # Auto-mark database tests
        if "db" in item.nodeid.lower() or "database" in item.nodeid.lower():
            item.add_marker(pytest.mark.database)
        
        # Auto-mark integration tests
        if "integration" in item.nodeid.lower():
            item.add_marker(pytest.mark.integration)
        
        # Auto-mark live tests (security_live, lance_ingest, etc.)
        if "live" in item.nodeid.lower() or "_live" in item.nodeid.lower():
            item.add_marker(pytest.mark.live)
        
        # Auto-mark agent tests
        if "agent" in item.nodeid.lower() or "copilot" in item.nodeid.lower():
            item.add_marker(pytest.mark.agent)
        
        # Auto-mark analytics tests
        if "duckdb" in item.nodeid.lower() or "analytics" in item.nodeid.lower():
            item.add_marker(pytest.mark.analytics)


# ============================================================================
# Event Loop Fixtures (for async tests)
# ============================================================================

@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the entire test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ============================================================================
# Database Fixtures
# ============================================================================

@pytest.fixture
def test_database_url() -> str:
    """
    Get test database URL from environment.
    
    Falls back to production database if TEST_DATABASE_URL not set.
    In CI/CD, you should set TEST_DATABASE_URL to a separate test database.
    """
    return os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")


@pytest.fixture
async def db_pool(test_database_url: str) -> AsyncGenerator:
    """
    Create a database connection pool for tests.
    
    Note: This creates a real database connection. Tests marked with @pytest.mark.database
    will use this fixture. Other tests should use mocked connections.
    """
    import asyncpg
    
    if not test_database_url:
        pytest.skip("No database URL configured (DATABASE_URL or TEST_DATABASE_URL)")
    
    try:
        pool = await asyncpg.create_pool(test_database_url, min_size=1, max_size=5)
        # If we can connect but required tables don't exist, treat this like
        # an unavailable test database and skip database-marked tests.
        try:
            async with pool.acquire() as conn:
                exists = await conn.fetchval(
                    """
                    SELECT EXISTS (
                      SELECT 1
                      FROM information_schema.tables
                      WHERE table_schema = 'public' AND table_name = 'users'
                    )
                    """
                )
                if not exists:
                    pytest.skip("Database connected, but required tables are missing (did you run migrations?)")
        except Exception as e:
            pytest.skip(f"Database schema check failed: {e}")
        yield pool
        await pool.close()
    except Exception as e:
        pytest.skip(f"Could not connect to database: {e}")


@pytest.fixture
async def clean_test_data(db_pool):
    """
    Clean test data before and after tests.
    
    This truncates test tables to ensure a clean state.
    """
    async with db_pool.acquire() as conn:
        # Clean before test
        try:
            await conn.execute("""
                TRUNCATE TABLE 
                    users, transactions, wallets
                CASCADE
            """)
        except Exception as e:
            # Tables might not exist yet, that's okay
            pass
    
    yield
    
    # Clean after test
    async with db_pool.acquire() as conn:
        try:
            await conn.execute("""
                TRUNCATE TABLE 
                    users, transactions, wallets
                CASCADE
            """)
        except Exception:
            pass


@pytest.fixture
def mock_db_pool():
    """
    Mock database pool for unit tests that don't need real database.
    
    Use this for isolated unit tests to avoid database dependencies.
    """
    pool = MagicMock()
    conn = AsyncMock()
    
    # Mock common database operations
    conn.fetchrow = AsyncMock(return_value=None)
    conn.fetch = AsyncMock(return_value=[])
    conn.fetchval = AsyncMock(return_value=0)
    conn.execute = AsyncMock(return_value=None)
    
    pool.acquire = AsyncMock(return_value=conn)
    pool.acquire().__aenter__ = AsyncMock(return_value=conn)
    pool.acquire().__aexit__ = AsyncMock(return_value=None)
    
    return pool


# ============================================================================
# Shared fixtures (non-DB)
# ============================================================================

@pytest.fixture
def config_file():
    """
    Shared rate limiter YAML config used by multiple test classes.
    
    Note: Very low refill rates ensure rate limiting works correctly in tests
    without tokens refilling during rapid request execution.
    """
    import tempfile
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        f.write(
            """
version: "1.0"
global:
  default:
    algorithm: "token_bucket"
    capacity: 1000
    refill_rate: 0.2778
skip_paths:
  - "/health"
  - "/docs"
endpoints:
  copilot_chat:
    path: "/api/v1/copilot/chat"
    algorithm: "token_bucket"
    capacity: 5
    refill_rate: 0.0001
    log_violations: true
    security_level: "medium"
security_logging:
  enabled: true
"""
        )
        path = f.name
    try:
        yield path
    finally:
        try:
            os.unlink(path)
        except Exception:
            pass


# ============================================================================
# Sample Data Fixtures
# ============================================================================

@pytest.fixture
def sample_user_data() -> Dict[str, Any]:
    """Sample user data for testing."""
    return {
        "id": "test-user-123",
        "name": "Test User",
        "phone": "+264811234567",
        "email": "test@example.com",
        "smartpay_id": "SP81123456",
        "kyc_status": "standard",
        "kyc_tier": "standard",
        "two_factor_enabled": False,
        "balance": 1000.00
    }


@pytest.fixture
def sample_transaction_data() -> Dict[str, Any]:
    """Sample transaction data for testing."""
    return {
        "id": "txn-test-123",
        "user_id": "test-user-123",
        "type": "debit",
        "category": "Food",
        "merchant": "Shoprite",
        "amount": 150.50,
        "status": "completed",
        "description": "Test transaction"
    }


@pytest.fixture
async def sample_user(db_pool, clean_test_data, sample_user_data):
    """
    Create a sample user in the test database.
    
    This is useful for integration tests that need a real user record.
    """
    from datetime import datetime
    
    async with db_pool.acquire() as conn:
        # Split name into first_name and last_name
        name_parts = sample_user_data["name"].split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        row = await conn.fetchrow("""
            INSERT INTO users (
                first_name, last_name, full_name, phone, email, kyc_tier, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        """, 
            first_name,
            last_name,
            sample_user_data["name"],
            sample_user_data["phone"],
            sample_user_data["email"],
            sample_user_data["kyc_tier"],
            datetime.now()
        )
        return dict(row)


# ============================================================================
# Mock External Services
# ============================================================================

@pytest.fixture
def mock_llm_client():
    """
    Mock LLM client (OpenAI/DeepSeek) for tests.
    
    Use this to avoid making real API calls during tests.
    """
    client = MagicMock()
    
    # Mock chat completion response
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Mock LLM response"
    
    client.chat.completions.create = AsyncMock(return_value=mock_response)
    
    return client


@pytest.fixture
def mock_smartpay_backend():
    """
    Mock Smartpay backend API for tests.
    
    Use this to avoid making real HTTP requests to the Node.js backend.
    """
    mock_api = MagicMock()
    
    # Mock common API responses
    mock_api.get_user_profile = AsyncMock(return_value={
        "id": "test-user-123",
        "name": "Test User",
        "phone": "+264811234567",
        "smartpay_id": "SP81123456",
        "kyc_status": "standard"
    })
    
    mock_api.get_transactions = AsyncMock(return_value=[])
    mock_api.get_balance = AsyncMock(return_value={"balance": 1000.00})
    
    return mock_api


@pytest.fixture
def mock_buffr_api():
    """
    Mock Buffr Connect API for tests.
    
    Use this to avoid making real requests to Buffr Connect.
    """
    mock_api = MagicMock()
    
    mock_api.create_payment = AsyncMock(return_value={
        "id": "pay-test-123",
        "status": "pending",
        "amount": 100.00
    })
    
    return mock_api


# ============================================================================
# Environment Configuration Fixtures
# ============================================================================

@pytest.fixture
def test_env():
    """
    Provide test environment variables.
    
    This fixture sets test-specific environment variables and restores
    the original values after the test.
    """
    original_env = os.environ.copy()
    
    # Set test-specific environment variables
    test_vars = {
        "ENVIRONMENT": "test",
        "LOG_LEVEL": "WARNING",
        "ML_ENABLED": "false"
    }
    
    os.environ.update(test_vars)
    
    yield test_vars
    
    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture
def disable_rate_limiting(monkeypatch):
    """
    Disable rate limiting for tests.
    
    This is useful for tests that need to make many requests quickly.
    """
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "false")


# ============================================================================
# Copilot/Agent Test Fixtures
# ============================================================================

@pytest.fixture
def copilot_deps(sample_user_data):
    """
    Create CopilotDeps for agent tests.
    """
    try:
        from smartpay_ai.agents.copilot.agent import CopilotDeps
        
        return CopilotDeps(
            user_id=sample_user_data["id"],
            auth_token="Bearer test-token",
            user_profile=sample_user_data
        )
    except ImportError:
        pytest.skip("CopilotDeps not available")


# ============================================================================
# Analytics/DuckDB Fixtures
# ============================================================================

@pytest.fixture
def test_duckdb_path(tmp_path):
    """
    Create a temporary DuckDB database for tests.
    
    This ensures tests don't interfere with each other's data.
    """
    db_path = tmp_path / "test_analytics.duckdb"
    return str(db_path)


@pytest.fixture
def mock_duckdb_conn():
    """
    Mock DuckDB connection for unit tests.
    """
    conn = MagicMock()
    conn.execute = MagicMock(return_value=MagicMock())
    conn.fetchall = MagicMock(return_value=[])
    conn.close = MagicMock()
    
    return conn


# ============================================================================
# Test Helpers
# ============================================================================

@pytest.fixture
def assert_valid_response():
    """
    Helper fixture for asserting valid API responses.
    """
    def _assert(response: Dict[str, Any], required_fields: list = None):
        assert response is not None
        assert isinstance(response, dict)
        
        if required_fields:
            for field in required_fields:
                assert field in response, f"Missing required field: {field}"
    
    return _assert


# ============================================================================
# Skip Conditions
# ============================================================================

def pytest_runtest_setup(item):
    """
    Skip tests based on markers and environment configuration.
    """
    # Skip live tests unless explicitly enabled
    if "live" in [mark.name for mark in item.iter_markers()]:
        if not os.getenv("RUN_LIVE_TESTS"):
            pytest.skip("Live tests disabled (set RUN_LIVE_TESTS=1 to enable)")
    
    # Skip database tests if no database URL
    if "database" in [mark.name for mark in item.iter_markers()]:
        if not os.getenv("DATABASE_URL") and not os.getenv("TEST_DATABASE_URL"):
            pytest.skip("No database URL configured")
    
    # Skip agent tests if no API keys
    if "agent" in [mark.name for mark in item.iter_markers()]:
        if not os.getenv("OPENAI_API_KEY") and not os.getenv("DEEPSEEK_API_KEY"):
            pytest.skip("No LLM API key configured")
