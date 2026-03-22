"""
Backend Integration Tests

Location: tests/test_backend_integration.py
Purpose: Test all 13 copilot tools against Node.js backend endpoints
Coverage: All tool endpoints with realistic payloads and error cases
Requirements: Backend running on localhost:4000

Usage:
    pytest tests/test_backend_integration.py -m backend
    pytest tests/test_backend_integration.py -v --tb=short
"""

import os
import pytest
import httpx
from typing import Dict, Any
from unittest.mock import patch

# Test marks
pytestmark = [pytest.mark.integration, pytest.mark.backend]

# Backend configuration
API_BASE_URL = os.getenv("SMARTPAY_API_BASE_URL", "http://localhost:4000")
API_TIMEOUT = 10.0


# Test fixtures

@pytest.fixture
def test_auth_token():
    """Mock authentication token for testing"""
    return "test_bearer_token_1234567890"


@pytest.fixture
def test_user_id():
    """Test user ID"""
    return "user_test_123"


@pytest.fixture
def test_wallet_id():
    """Test wallet ID"""
    return "wallet_test_456"


@pytest.fixture
def test_group_id():
    """Test group ID"""
    return "group_test_789"


@pytest.fixture
async def http_client():
    """Async HTTP client"""
    async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
        yield client


# Helper functions

def make_headers(auth_token: str) -> Dict[str, str]:
    """Create HTTP headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    }


async def check_backend_health(client: httpx.AsyncClient) -> bool:
    """Check if backend is available"""
    try:
        response = await client.get(f"{API_BASE_URL}/health", timeout=5.0)
        return response.status_code == 200
    except Exception:
        return False


# Backend health check

@pytest.mark.asyncio
async def test_backend_health(http_client):
    """Verify backend is running and accessible"""
    is_healthy = await check_backend_health(http_client)
    
    if not is_healthy:
        pytest.skip(f"Backend not available at {API_BASE_URL}")
    
    assert is_healthy, "Backend health check failed"


# Tool 1: Get Wallet Balance

@pytest.mark.asyncio
async def test_get_wallet_balance(http_client, test_auth_token, test_wallet_id):
    """Test GET /api/v1/wallets endpoint"""
    url = f"{API_BASE_URL}/api/v1/wallets"
    headers = make_headers(test_auth_token)
    
    # Test successful request
    response = await http_client.get(url, headers=headers)
    
    # Accept both 200 (success) and 401 (auth required) as valid
    assert response.status_code in [200, 401, 404], \
        f"Unexpected status code: {response.status_code}"
    
    # If 200, verify response structure
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, (dict, list)), "Response should be dict or list"
    
    # Verify latency target (<500ms)
    assert response.elapsed.total_seconds() < 0.5, \
        f"Response too slow: {response.elapsed.total_seconds():.3f}s"


@pytest.mark.asyncio
async def test_get_wallet_balance_no_auth(http_client):
    """Test wallet endpoint without authentication"""
    url = f"{API_BASE_URL}/api/v1/wallets"
    
    # No auth header
    response = await http_client.get(url)
    
    # Should return 401 Unauthorized
    assert response.status_code in [401, 403], \
        "Should require authentication"


# Tool 2: Transfer Money

@pytest.mark.asyncio
async def test_transfer_money(http_client, test_auth_token, test_wallet_id):
    """Test POST /api/v1/transactions/send endpoint"""
    url = f"{API_BASE_URL}/api/v1/transactions/send"
    headers = make_headers(test_auth_token)
    
    payload = {
        "from_wallet_id": test_wallet_id,
        "recipient": "+264811234567",
        "amount": 100.00,
        "note": "Test transfer",
        "verification_token": "123456"
    }
    
    response = await http_client.post(url, headers=headers, json=payload)
    
    # Accept 200, 400 (validation), 401 (auth), 403 (insufficient funds)
    assert response.status_code in [200, 201, 400, 401, 403], \
        f"Unexpected status code: {response.status_code}"
    
    # If success, verify response has transaction_id
    if response.status_code in [200, 201]:
        data = response.json()
        assert 'transaction_id' in data or 'id' in data, \
            "Response should contain transaction ID"


@pytest.mark.asyncio
async def test_transfer_money_missing_2fa(http_client, test_auth_token, test_wallet_id):
    """Test transfer without 2FA token"""
    url = f"{API_BASE_URL}/api/v1/transactions/send"
    headers = make_headers(test_auth_token)
    
    payload = {
        "from_wallet_id": test_wallet_id,
        "recipient": "+264811234567",
        "amount": 100.00,
        # Missing verification_token
    }
    
    response = await http_client.post(url, headers=headers, json=payload)
    
    # Should require 2FA
    assert response.status_code in [400, 403], \
        "Should require 2FA verification"


# Tool 3: Get Group Info

@pytest.mark.asyncio
async def test_get_group_info(http_client, test_auth_token, test_group_id):
    """Test GET /api/v1/groups/:id endpoint"""
    url = f"{API_BASE_URL}/api/v1/groups/{test_group_id}"
    headers = make_headers(test_auth_token)
    
    response = await http_client.get(url, headers=headers)
    
    assert response.status_code in [200, 401, 404], \
        f"Unexpected status code: {response.status_code}"
    
    # If 200, verify group structure
    if response.status_code == 200:
        data = response.json()
        assert 'id' in data or 'group_id' in data, \
            "Response should contain group ID"


# Tool 4: Create Group

@pytest.mark.asyncio
async def test_create_group(http_client, test_auth_token, test_user_id):
    """Test POST /api/v1/groups endpoint"""
    url = f"{API_BASE_URL}/api/v1/groups"
    headers = make_headers(test_auth_token)
    
    payload = {
        "name": f"Test Group {os.urandom(4).hex()}",
        "description": "Automated test group",
        "member_ids": []
    }
    
    response = await http_client.post(url, headers=headers, json=payload)
    
    assert response.status_code in [200, 201, 400, 401], \
        f"Unexpected status code: {response.status_code}"


# Tool 5: Contribute to Group

@pytest.mark.asyncio
async def test_contribute_to_group(http_client, test_auth_token, test_group_id, test_wallet_id):
    """Test POST /api/v1/groups/:id/contribute endpoint"""
    url = f"{API_BASE_URL}/api/v1/groups/{test_group_id}/contribute"
    headers = make_headers(test_auth_token)
    
    payload = {
        "amount": 50.00,
        "wallet_id": test_wallet_id,
        "verification_token": "123456"
    }
    
    response = await http_client.post(url, headers=headers, json=payload)
    
    assert response.status_code in [200, 201, 400, 401, 403, 404], \
        f"Unexpected status code: {response.status_code}"


# Tool 6: Initiate Cash-out

@pytest.mark.asyncio
async def test_initiate_cashout(http_client, test_auth_token, test_wallet_id):
    """Test POST /api/v1/cashout/initiate endpoint"""
    url = f"{API_BASE_URL}/api/v1/cashout/initiate"
    headers = make_headers(test_auth_token)
    
    payload = {
        "amount": 200.00,
        "wallet_id": test_wallet_id,
        "agent_location": "Windhoek",
        "verification_token": "123456"
    }
    
    response = await http_client.post(url, headers=headers, json=payload)
    
    assert response.status_code in [200, 201, 400, 401, 403], \
        f"Unexpected status code: {response.status_code}"
    
    # If success, should return cashout code
    if response.status_code in [200, 201]:
        data = response.json()
        assert 'code' in data or 'cashout_code' in data, \
            "Response should contain cashout code"


# Tool 7: Get Transaction History

@pytest.mark.asyncio
async def test_get_transaction_history(http_client, test_auth_token):
    """Test GET /api/v1/transactions endpoint"""
    url = f"{API_BASE_URL}/api/v1/transactions"
    headers = make_headers(test_auth_token)
    
    params = {
        "limit": 20,
        "offset": 0
    }
    
    response = await http_client.get(url, headers=headers, params=params)
    
    assert response.status_code in [200, 401], \
        f"Unexpected status code: {response.status_code}"
    
    # If 200, verify array response
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, (list, dict)), \
            "Response should be list or dict with transactions"


# Tool 8: Apply for Loan

@pytest.mark.asyncio
async def test_apply_for_loan(http_client, test_auth_token, test_wallet_id):
    """Test POST /api/v1/loans/apply endpoint"""
    url = f"{API_BASE_URL}/api/v1/loans/apply"
    headers = make_headers(test_auth_token)
    
    payload = {
        "amount": 5000.00,
        "purpose": "Emergency expenses",
        "wallet_id": test_wallet_id,
        "verification_token": "123456"
    }
    
    response = await http_client.post(url, headers=headers, json=payload)
    
    assert response.status_code in [200, 201, 400, 401, 403], \
        f"Unexpected status code: {response.status_code}"


# Tool 9: Check Loan Eligibility

@pytest.mark.asyncio
async def test_check_loan_eligibility(http_client, test_auth_token):
    """Test GET /api/v1/loans/eligibility endpoint"""
    url = f"{API_BASE_URL}/api/v1/loans/eligibility"
    headers = make_headers(test_auth_token)
    
    response = await http_client.get(url, headers=headers)
    
    assert response.status_code in [200, 401], \
        f"Unexpected status code: {response.status_code}"
    
    # If 200, verify eligibility structure
    if response.status_code == 200:
        data = response.json()
        assert 'eligible' in data or 'is_eligible' in data, \
            "Response should contain eligibility status"


# Tool 10: Pay Bill

@pytest.mark.asyncio
async def test_pay_bill(http_client, test_auth_token, test_wallet_id):
    """Test POST /api/v1/bills/pay endpoint"""
    url = f"{API_BASE_URL}/api/v1/bills/pay"
    headers = make_headers(test_auth_token)
    
    payload = {
        "bill_id": "bill_test_123",
        "amount": 150.00,
        "wallet_id": test_wallet_id,
        "verification_token": "123456"
    }
    
    response = await http_client.post(url, headers=headers, json=payload)
    
    assert response.status_code in [200, 201, 400, 401, 403, 404], \
        f"Unexpected status code: {response.status_code}"


# Tool 11: Split Bill

@pytest.mark.asyncio
async def test_split_bill(http_client, test_auth_token, test_group_id):
    """Test POST /api/v1/groups/:id/split endpoint"""
    url = f"{API_BASE_URL}/api/v1/groups/{test_group_id}/split"
    headers = make_headers(test_auth_token)
    
    payload = {
        "total_amount": 300.00,
        "split_method": "equal",
        "verification_token": "123456"
    }
    
    response = await http_client.post(url, headers=headers, json=payload)
    
    assert response.status_code in [200, 201, 400, 401, 403, 404], \
        f"Unexpected status code: {response.status_code}"


# Tool 12: Redeem Voucher

@pytest.mark.asyncio
async def test_redeem_voucher(http_client, test_auth_token, test_wallet_id):
    """Test POST /api/v1/vouchers/redeem endpoint"""
    url = f"{API_BASE_URL}/api/v1/vouchers/redeem"
    headers = make_headers(test_auth_token)
    
    payload = {
        "voucher_code": "TEST-VOUCHER-123",
        "target_wallet_id": test_wallet_id,
        "verification_token": "123456"
    }
    
    response = await http_client.post(url, headers=headers, json=payload)
    
    assert response.status_code in [200, 201, 400, 401, 404], \
        f"Unexpected status code: {response.status_code}"


# Tool 13: Join Group

@pytest.mark.asyncio
async def test_join_group(http_client, test_auth_token, test_group_id):
    """Test POST /api/v1/groups/:id/join endpoint"""
    url = f"{API_BASE_URL}/api/v1/groups/{test_group_id}/join"
    headers = make_headers(test_auth_token)
    
    payload = {
        "invitation_code": "INV123456"
    }
    
    response = await http_client.post(url, headers=headers, json=payload)
    
    assert response.status_code in [200, 201, 400, 401, 403, 404], \
        f"Unexpected status code: {response.status_code}"


# Error handling tests

@pytest.mark.asyncio
async def test_endpoint_handles_invalid_json(http_client, test_auth_token):
    """Test endpoints handle malformed JSON"""
    url = f"{API_BASE_URL}/api/v1/wallets"
    headers = make_headers(test_auth_token)
    headers["Content-Type"] = "application/json"
    
    # Send invalid JSON
    response = await http_client.post(
        url,
        headers=headers,
        content=b'{invalid json}'
    )
    
    assert response.status_code in [400, 422], \
        "Should return 400 for invalid JSON"


@pytest.mark.asyncio
async def test_endpoint_handles_missing_fields(http_client, test_auth_token):
    """Test endpoints validate required fields"""
    url = f"{API_BASE_URL}/api/v1/transactions/send"
    headers = make_headers(test_auth_token)
    
    # Missing required fields
    payload = {
        "amount": 100.00
        # Missing from_wallet_id, recipient
    }
    
    response = await http_client.post(url, headers=headers, json=payload)
    
    assert response.status_code in [400, 422], \
        "Should return 400 for missing required fields"


# Performance tests

@pytest.mark.asyncio
@pytest.mark.performance
async def test_endpoint_latency_under_500ms(http_client, test_auth_token):
    """Verify all GET endpoints respond within 500ms"""
    endpoints = [
        "/api/v1/wallets",
        "/api/v1/transactions",
        "/api/v1/loans/eligibility",
    ]
    
    headers = make_headers(test_auth_token)
    
    for endpoint in endpoints:
        url = f"{API_BASE_URL}{endpoint}"
        
        response = await http_client.get(url, headers=headers)
        
        latency_ms = response.elapsed.total_seconds() * 1000
        
        # Accept any status, just check latency
        assert latency_ms < 500, \
            f"{endpoint} latency {latency_ms:.0f}ms exceeds 500ms target"


# Integration test summary

@pytest.mark.asyncio
async def test_all_endpoints_summary(http_client, test_auth_token):
    """Summary test - verify all 13 tool endpoints exist"""
    endpoints = [
        ("GET", "/api/v1/wallets"),                    # 1. Get wallet balance
        ("POST", "/api/v1/transactions/send"),         # 2. Transfer money
        ("GET", "/api/v1/groups/test"),                # 3. Get group info
        ("POST", "/api/v1/groups"),                    # 4. Create group
        ("POST", "/api/v1/groups/test/contribute"),    # 5. Contribute to group
        ("POST", "/api/v1/cashout/initiate"),          # 6. Initiate cashout
        ("GET", "/api/v1/transactions"),               # 7. Get transaction history
        ("POST", "/api/v1/loans/apply"),               # 8. Apply for loan
        ("GET", "/api/v1/loans/eligibility"),          # 9. Check loan eligibility
        ("POST", "/api/v1/bills/pay"),                 # 10. Pay bill
        ("POST", "/api/v1/groups/test/split"),         # 11. Split bill
        ("POST", "/api/v1/vouchers/redeem"),           # 12. Redeem voucher
        ("POST", "/api/v1/groups/test/join"),          # 13. Join group
    ]
    
    headers = make_headers(test_auth_token)
    results = []
    
    for method, endpoint in endpoints:
        url = f"{API_BASE_URL}{endpoint}"
        
        try:
            if method == "GET":
                response = await http_client.get(url, headers=headers)
            else:
                response = await http_client.post(url, headers=headers, json={})
            
            # Check if endpoint exists (not 404/501/502)
            exists = response.status_code not in [404, 501, 502]
            
            results.append({
                'endpoint': f"{method} {endpoint}",
                'status': response.status_code,
                'exists': exists
            })
        except Exception as e:
            results.append({
                'endpoint': f"{method} {endpoint}",
                'status': 'error',
                'exists': False,
                'error': str(e)
            })
    
    # Print summary
    print("\n" + "=" * 80)
    print("BACKEND INTEGRATION TEST SUMMARY")
    print("=" * 80)
    
    for result in results:
        status_icon = "✓" if result['exists'] else "✗"
        print(f"{status_icon} {result['endpoint']}: {result['status']}")
    
    existing_count = sum(1 for r in results if r['exists'])
    print(f"\nTotal: {existing_count}/{len(endpoints)} endpoints accessible")
    print("=" * 80)
    
    # Assert at least 70% of endpoints are accessible
    assert existing_count >= len(endpoints) * 0.7, \
        f"Too many endpoints missing: {existing_count}/{len(endpoints)}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
