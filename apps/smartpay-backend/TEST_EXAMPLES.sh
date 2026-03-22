#!/bin/bash
# Test Examples for Smartpay Backend API
# These are example curl commands to test each endpoint
# Replace YOUR_TOKEN with a valid JWT token

BASE_URL="http://localhost:4000"
TOKEN="YOUR_TOKEN"

echo "🚀 Smartpay Backend API Test Examples"
echo "====================================="
echo ""

# Health Checks
echo "1️⃣ HEALTH CHECKS"
echo "----------------"
echo "Server Health:"
curl -X GET "$BASE_URL/health"
echo ""
echo ""

echo "Database Health:"
curl -X GET "$BASE_URL/health/db"
echo ""
echo ""

echo "Mobile API Health:"
curl -X GET "$BASE_URL/api/v1/health"
echo ""
echo ""

# Send Money
echo "2️⃣ SEND MONEY"
echo "-------------"
curl -X POST "$BASE_URL/api/v1/send-money" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "sourceWalletId": "wallet-uuid-123",
    "beneficiaryPhone": "+26481234567",
    "note": "Test payment"
  }'
echo ""
echo ""

# Cash Out - Till
echo "3️⃣ CASH OUT TO TILL"
echo "-------------------"
curl -X POST "$BASE_URL/api/v1/cash-out/till" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 200.00,
    "walletId": "wallet-uuid-123"
  }'
echo ""
echo ""

# Cash Out - Bank
echo "4️⃣ CASH OUT TO BANK"
echo "-------------------"
curl -X POST "$BASE_URL/api/v1/cash-out/bank" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "walletId": "wallet-uuid-123",
    "bankAccount": "1234567890",
    "bankCode": "FIRNNANX"
  }'
echo ""
echo ""

# Cash Out - Agent
echo "5️⃣ CASH OUT TO AGENT"
echo "--------------------"
curl -X POST "$BASE_URL/api/v1/cash-out/agent" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 300.00,
    "walletId": "wallet-uuid-123",
    "agentCode": "AGT123"
  }'
echo ""
echo ""

# Cash Out - ATM
echo "6️⃣ CASH OUT TO ATM"
echo "------------------"
curl -X POST "$BASE_URL/api/v1/cash-out/atm" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000.00,
    "walletId": "wallet-uuid-123"
  }'
echo ""
echo ""

# Vouchers List
echo "7️⃣ GET VOUCHERS"
echo "---------------"
curl -X GET "$BASE_URL/api/v1/vouchers" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Redeem Voucher to Wallet
echo "8️⃣ REDEEM VOUCHER TO WALLET"
echo "---------------------------"
curl -X POST "$BASE_URL/api/v1/vouchers/voucher-uuid-123/redeem" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Redeem Voucher at NamPost
echo "9️⃣ REDEEM VOUCHER AT NAMPOST"
echo "----------------------------"
curl -X POST "$BASE_URL/api/v1/vouchers/voucher-uuid-123/redeem-nampost" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Windhoek Central"
  }'
echo ""
echo ""

# Check Loan Eligibility
echo "🔟 CHECK LOAN ELIGIBILITY"
echo "-------------------------"
curl -X GET "$BASE_URL/api/v1/loans/eligibility" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Apply for Loan
echo "1️⃣1️⃣ APPLY FOR LOAN"
echo "-------------------"
curl -X POST "$BASE_URL/api/v1/loans/apply" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150.00,
    "walletId": "wallet-uuid-123",
    "purpose": "Emergency medical expense"
  }'
echo ""
echo ""

# Get Loan History
echo "1️⃣2️⃣ GET LOAN HISTORY"
echo "---------------------"
curl -X GET "$BASE_URL/api/v1/loans" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Group Wallet
echo "1️⃣3️⃣ GET GROUP WALLET"
echo "---------------------"
curl -X GET "$BASE_URL/api/v1/groups/group-uuid-123/wallet" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Group Contributions
echo "1️⃣4️⃣ GET GROUP CONTRIBUTIONS"
echo "----------------------------"
curl -X GET "$BASE_URL/api/v1/groups/group-uuid-123/contributions" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Contribute to Group
echo "1️⃣5️⃣ CONTRIBUTE TO GROUP"
echo "-------------------------"
curl -X POST "$BASE_URL/api/v1/groups/group-uuid-123/contribute" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "sourceWalletId": "wallet-uuid-123",
    "note": "March contribution"
  }'
echo ""
echo ""

# User Profile with Proof of Life
echo "1️⃣6️⃣ GET USER PROFILE"
echo "---------------------"
curl -X GET "$BASE_URL/api/v1/user/profile" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Start Proof of Life - SMS
echo "1️⃣7️⃣ START PROOF OF LIFE (SMS)"
echo "------------------------------"
curl -X POST "$BASE_URL/api/v1/user/proof-of-life" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "sms",
    "location": "Windhoek"
  }'
echo ""
echo ""

# Start Proof of Life - Auto
echo "1️⃣8️⃣ START PROOF OF LIFE (AUTO)"
echo "-------------------------------"
curl -X POST "$BASE_URL/api/v1/user/proof-of-life" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "auto"
  }'
echo ""
echo ""

# Complete Proof of Life Verification
echo "1️⃣9️⃣ COMPLETE PROOF OF LIFE"
echo "---------------------------"
curl -X POST "$BASE_URL/api/v1/user/proof-of-life/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-uuid-123",
    "code": "123456"
  }'
echo ""
echo ""

# Create Incident
echo "2️⃣0️⃣ CREATE INCIDENT"
echo "--------------------"
curl -X POST "$BASE_URL/api/v1/incidents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "transaction_dispute",
    "severity": "high",
    "title": "Unauthorized transaction detected",
    "description": "I did not authorize a transaction of N$500 that was debited from my account on 2026-03-14.",
    "transactionId": "txn-uuid-123"
  }'
echo ""
echo ""

# Get Incidents
echo "2️⃣1️⃣ GET INCIDENTS"
echo "------------------"
curl -X GET "$BASE_URL/api/v1/incidents" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Get Specific Incident
echo "2️⃣2️⃣ GET SPECIFIC INCIDENT"
echo "--------------------------"
curl -X GET "$BASE_URL/api/v1/incidents/incident-uuid-123" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

# Find Nearest Agents
echo "2️⃣3️⃣ FIND NEAREST AGENTS"
echo "------------------------"
curl -X GET "$BASE_URL/api/v1/agents/nearest?lat=-22.5700&lng=17.0700&service=cashout&limit=5" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo ""

echo "✅ Test examples completed!"
echo ""
echo "📝 Notes:"
echo "- Replace YOUR_TOKEN with a valid JWT token"
echo "- Replace UUID placeholders with actual IDs from your database"
echo "- Ensure the backend server is running on port 4000"
echo "- Check API_ENDPOINTS.md for detailed documentation"
