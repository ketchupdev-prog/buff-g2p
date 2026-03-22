#!/bin/bash
# Test script for OTP and JWT token fixes
# Run after starting backend with: npm run dev

echo "🧪 Testing OTP & JWT Token Fixes"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test phone number
PHONE="81234567"
EMAIL="pendanek@gmail.com"

echo "📱 Step 1: Request OTP"
echo "----------------------"
RESPONSE1=$(curl -s -X POST http://localhost:3001/api/v1/mobile/auth/request-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$PHONE\", \"channel\": \"email\", \"email\": \"$EMAIL\"}")

echo "Response: $RESPONSE1"
echo ""

# Check if successful
if echo "$RESPONSE1" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ OTP request successful${NC}"
  
  # Extract devCode if present (development mode)
  DEV_CODE=$(echo "$RESPONSE1" | grep -o '"devCode":"[^"]*"' | cut -d'"' -f4)
  if [ ! -z "$DEV_CODE" ]; then
    echo -e "${YELLOW}🔧 Dev code detected: $DEV_CODE${NC}"
    echo ""
    echo "📧 Check your email ($EMAIL) for the OTP code"
    echo "   OR use dev code: $DEV_CODE"
    echo ""
    echo -n "Enter the OTP code you received: "
    read USER_CODE
    
    # Use user input or fall back to dev code
    CODE=${USER_CODE:-$DEV_CODE}
  else
    echo ""
    echo "📧 Check your email ($EMAIL) for the OTP code"
    echo -n "Enter the OTP code: "
    read CODE
  fi
  
  echo ""
  echo "📋 Step 2: Verify OTP (code: $CODE)"
  echo "------------------------------------"
  RESPONSE2=$(curl -s -X POST http://localhost:3001/api/v1/mobile/auth/verify-otp \
    -H "Content-Type: application/json" \
    -d "{\"phone\": \"$PHONE\", \"code\": \"$CODE\"}")
  
  echo "Response: $RESPONSE2"
  echo ""
  
  # Check if verification successful
  if echo "$RESPONSE2" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ OTP verification successful${NC}"
    
    # Extract token
    TOKEN=$(echo "$RESPONSE2" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    # Check if token is a proper JWT (3 parts separated by dots)
    if echo "$TOKEN" | grep -q '^[^.]*\.[^.]*\.[^.]*$'; then
      echo -e "${GREEN}✅ JWT token format correct (3 parts)${NC}"
      echo "   Token preview: ${TOKEN:0:50}..."
      
      # Test if token contains '0' digit (for OTP bug test)
      if echo "$CODE" | grep -q '0'; then
        echo -e "${GREEN}✅ OTP '0' digit bug fix confirmed - code with '0' accepted!${NC}"
      fi
      
      echo ""
      echo "🔐 Step 3: Test authenticated endpoint"
      echo "--------------------------------------"
      RESPONSE3=$(curl -s -X GET http://localhost:3001/api/v1/mobile/wallets \
        -H "Authorization: Bearer $TOKEN")
      
      echo "Response: $RESPONSE3"
      echo ""
      
      # Check if endpoint works (not 500 error)
      if echo "$RESPONSE3" | grep -q '"error"'; then
        echo -e "${RED}❌ Authenticated endpoint failed${NC}"
      else
        echo -e "${GREEN}✅ Authenticated endpoint working - JWT token fix confirmed!${NC}"
      fi
    else
      echo -e "${RED}❌ Token format invalid (not a JWT)${NC}"
      echo "   Token: $TOKEN"
    fi
  else
    echo -e "${RED}❌ OTP verification failed${NC}"
    ERROR=$(echo "$RESPONSE2" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    echo "   Error: $ERROR"
  fi
else
  echo -e "${RED}❌ OTP request failed${NC}"
  ERROR=$(echo "$RESPONSE1" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
  echo "   Error: $ERROR"
fi

echo ""
echo "=================================="
echo "Test complete!"
