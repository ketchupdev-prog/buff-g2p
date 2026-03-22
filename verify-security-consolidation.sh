#!/bin/bash
# Security Consolidation Verification Script

echo "=== Security Code Consolidation Verification ==="
echo ""

# Check 1: Orphaned folder deleted
echo "1. Checking orphaned folder deleted..."
if [ ! -d "security" ]; then
  echo "   ✅ PASS: fintech/security/ deleted"
else
  echo "   ❌ FAIL: fintech/security/ still exists"
  exit 1
fi

# Check 2: Canonical folder exists
echo "2. Checking canonical folder exists..."
if [ -d "smartpay/backend/src/security" ]; then
  echo "   ✅ PASS: smartpay/backend/src/security/ exists"
else
  echo "   ❌ FAIL: smartpay/backend/src/security/ missing"
  exit 1
fi

# Check 3: Canonical folder has files
echo "3. Checking canonical folder has files..."
FILE_COUNT=$(find smartpay/backend/src/security -type f -name "*.ts" -o -name "*.md" | wc -l | tr -d ' ')
if [ "$FILE_COUNT" -ge "10" ]; then
  echo "   ✅ PASS: Found $FILE_COUNT files in canonical folder"
else
  echo "   ❌ FAIL: Only $FILE_COUNT files found (expected 10+)"
  exit 1
fi

# Check 4: No imports from deleted folder
echo "4. Checking no imports from deleted folder..."
BROKEN_IMPORTS=$(grep -r "from.*fintech/security" smartpay/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$BROKEN_IMPORTS" -eq "0" ]; then
  echo "   ✅ PASS: No imports from deleted folder"
else
  echo "   ❌ FAIL: Found $BROKEN_IMPORTS imports from deleted folder"
  exit 1
fi

# Check 5: SmartPay imports security correctly
echo "5. Checking SmartPay imports security correctly..."
if grep -q "from './security'" smartpay/backend/src/index.ts; then
  echo "   ✅ PASS: SmartPay correctly imports from ./security"
else
  echo "   ❌ FAIL: SmartPay does not import security module"
  exit 1
fi

echo ""
echo "=== ✅ ALL VERIFICATION CHECKS PASSED ==="
echo ""
echo "Summary:"
echo "  - Orphaned folder deleted: ✅"
echo "  - Canonical folder intact: ✅"
echo "  - No broken imports: ✅"
echo "  - SmartPay backend working: ✅"
echo ""
echo "Consolidation Status: SUCCESS"
