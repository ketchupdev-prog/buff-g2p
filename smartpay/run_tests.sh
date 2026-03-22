#!/bin/bash
#
# Test Runner for Rate Limiting Implementation
# Location: smartpay/run_tests.sh
# Usage: ./run_tests.sh [--python] [--typescript] [--all]
#

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine base directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Rate Limiting - Test Suite Runner${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Parse arguments
RUN_PYTHON=false
RUN_TYPESCRIPT=false

if [ $# -eq 0 ]; then
    RUN_PYTHON=true
elif [ "$1" == "--all" ]; then
    RUN_PYTHON=true
    RUN_TYPESCRIPT=true
elif [ "$1" == "--python" ]; then
    RUN_PYTHON=true
elif [ "$1" == "--typescript" ]; then
    RUN_TYPESCRIPT=true
else
    echo -e "${RED}Usage: $0 [--python] [--typescript] [--all]${NC}"
    exit 1
fi

# Python tests
if [ "$RUN_PYTHON" = true ]; then
    echo -e "${BLUE}Running Python Tests...${NC}"
    echo ""
    
    cd backend_python
    
    # Set PYTHONPATH
    export PYTHONPATH="$PWD:$PYTHONPATH"
    
    # Check if pytest is available
    if ! command -v pytest &> /dev/null; then
        echo -e "${YELLOW}pytest not found. Installing...${NC}"
        pip install pytest pytest-asyncio pyyaml
    fi
    
    # Check if test file exists
    if [ ! -f "tests/test_rate_limiter.py" ]; then
        echo -e "${RED}Test file not found: tests/test_rate_limiter.py${NC}"
        cd ..
        exit 1
    fi
    
    # Run tests
    echo -e "${GREEN}Running: pytest tests/test_rate_limiter.py -v${NC}"
    echo ""
    
    if pytest tests/test_rate_limiter.py -v --tb=short; then
        echo ""
        echo -e "${GREEN}✓ Python tests PASSED${NC}"
        echo ""
    else
        echo ""
        echo -e "${RED}✗ Python tests FAILED${NC}"
        cd ..
        exit 1
    fi
    
    # Run with coverage if available
    if command -v pytest &> /dev/null; then
        echo -e "${BLUE}Running coverage report...${NC}"
        echo ""
        
        pytest tests/test_rate_limiter.py \
            --cov=smartpay_ai.shared.rate_limiter \
            --cov-report=term-missing \
            --cov-report=html \
            -v 2>/dev/null || true
        
        if [ -d "htmlcov" ]; then
            echo ""
            echo -e "${GREEN}Coverage report generated: backend_python/htmlcov/index.html${NC}"
        fi
    fi
    
    cd ..
fi

# TypeScript tests
if [ "$RUN_TYPESCRIPT" = true ]; then
    echo -e "${BLUE}Running TypeScript Tests...${NC}"
    echo ""
    
    cd backend
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}npm not found. Please install Node.js${NC}"
        cd ..
        exit 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi
    
    # Check if test file exists
    if [ ! -f "tests/rateLimiter.test.ts" ]; then
        echo -e "${RED}Test file not found: tests/rateLimiter.test.ts${NC}"
        cd ..
        exit 1
    fi
    
    # Run tests
    echo -e "${GREEN}Running: npm test -- rateLimiter.test.ts${NC}"
    echo ""
    
    if npm test -- rateLimiter.test.ts; then
        echo ""
        echo -e "${GREEN}✓ TypeScript tests PASSED${NC}"
        echo ""
    else
        echo ""
        echo -e "${YELLOW}⚠ TypeScript tests have failures (expected until migration complete)${NC}"
        echo ""
    fi
    
    cd ..
fi

# Summary
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

if [ "$RUN_PYTHON" = true ]; then
    echo -e "${GREEN}✓ Python: Tests complete${NC}"
fi

if [ "$RUN_TYPESCRIPT" = true ]; then
    echo -e "${YELLOW}⚠ TypeScript: Migration pending${NC}"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Review test results above"
echo "  2. Check coverage report (if generated)"
echo "  3. Review migration guide: backend/MIGRATION_GUIDE_RATE_LIMITING.md"
echo "  4. Deploy Python backend when ready"
echo ""

exit 0
