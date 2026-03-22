#!/bin/bash

# SmartPay Structure Migration Script
# Reorganizes project to match buffr-g2p structure with mobile/ and backend/ folders

set -e  # Exit on error

PROJECT_ROOT="/Users/georgenekwaya/Downloads/ai-agent-mastery-main/fintech/smartpay"
cd "$PROJECT_ROOT"

echo "=================================="
echo "SmartPay Structure Migration"
echo "=================================="
echo ""
echo "This script will reorganize the project structure to match buffr-g2p"
echo "Current directory: $(pwd)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the correct directory?"
    exit 1
fi

if [ ! -d "backend" ]; then
    print_error "backend/ folder not found. This script expects the backend folder to exist."
    exit 1
fi

echo "Step 1: Creating mobile folder structure..."
echo ""

# Create mobile directory structure
mkdir -p mobile/{app,components,contexts,hooks,services,store,constants,lib,utils,assets,android,ios,__tests__,e2e,e2e-screenshots,patches}

print_status "Created mobile/ subdirectories"

echo ""
echo "Step 2: Moving application code to mobile/..."
echo ""

# Move application code folders (only if they exist)
for dir in app components contexts hooks services store lib utils; do
    if [ -d "$dir" ] && [ "$dir" != "backend" ] && [ "$dir" != "mobile" ]; then
        echo "Moving /$dir/ to /mobile/$dir/"
        # If target already exists and has content, merge
        if [ -d "mobile/$dir" ] && [ "$(ls -A mobile/$dir)" ]; then
            print_warning "mobile/$dir already exists with content, merging..."
            cp -R "$dir"/* "mobile/$dir/" 2>/dev/null || true
            rm -rf "$dir"
        else
            mv "$dir" "mobile/" 2>/dev/null || print_warning "Could not move $dir (may not exist)"
        fi
        print_status "Moved $dir/"
    else
        print_warning "$dir/ not found or skipping"
    fi
done

# Handle constants specially (already exists in mobile)
if [ -d "constants" ]; then
    echo "Merging /constants/ with /mobile/constants/"
    cp -R constants/* mobile/constants/ 2>/dev/null || true
    rm -rf constants
    print_status "Merged constants/"
fi

echo ""
echo "Step 3: Moving platform-specific folders..."
echo ""

# Move platform folders
for dir in android ios assets; do
    if [ -d "$dir" ]; then
        echo "Moving /$dir/ to /mobile/$dir/"
        mv "$dir" "mobile/" 2>/dev/null || print_warning "Could not move $dir"
        print_status "Moved $dir/"
    else
        print_warning "$dir/ not found"
    fi
done

echo ""
echo "Step 4: Moving test folders..."
echo ""

# Move test folders
if [ -d "__tests__" ]; then
    mv "__tests__" "mobile/" 2>/dev/null || print_warning "Could not move __tests__"
    print_status "Moved __tests__/"
fi

if [ -d "e2e" ]; then
    mv "e2e" "mobile/" 2>/dev/null || print_warning "Could not move e2e"
    print_status "Moved e2e/"
fi

if [ -d "e2e-screenshots" ]; then
    mv "e2e-screenshots" "mobile/" 2>/dev/null || print_warning "Could not move e2e-screenshots"
    print_status "Moved e2e-screenshots/"
fi

echo ""
echo "Step 5: Moving configuration files..."
echo ""

# Move configuration files
for file in app.json expo-env.d.ts tsconfig.json jest.setup.js .detoxrc.js vercel.json; do
    if [ -f "$file" ]; then
        echo "Moving $file to mobile/$file"
        mv "$file" "mobile/" 2>/dev/null || print_warning "Could not move $file"
        print_status "Moved $file"
    else
        print_warning "$file not found"
    fi
done

# Move patches if it exists
if [ -d "patches" ]; then
    mv "patches" "mobile/" 2>/dev/null || print_warning "Could not move patches"
    print_status "Moved patches/"
fi

echo ""
echo "Step 6: Moving package files..."
echo ""

# Move package.json and package-lock.json
if [ -f "package.json" ]; then
    echo "Moving package.json to mobile/package.json"
    mv "package.json" "mobile/" 2>/dev/null || print_warning "Could not move package.json"
    print_status "Moved package.json"
fi

if [ -f "package-lock.json" ]; then
    echo "Moving package-lock.json to mobile/package-lock.json"
    mv "package-lock.json" "mobile/" 2>/dev/null || print_warning "Could not move package-lock.json"
    print_status "Moved package-lock.json"
fi

# Move node_modules to mobile (this might be large)
if [ -d "node_modules" ]; then
    echo "Moving node_modules to mobile/node_modules (this may take a moment)..."
    mv "node_modules" "mobile/" 2>/dev/null || print_warning "Could not move node_modules"
    print_status "Moved node_modules/"
fi

echo ""
echo "Step 7: Listing remaining files at root..."
echo ""

# List what's left at root (excluding known good folders)
echo "Files/folders remaining at root:"
ls -la | grep -v "^d.*\.$" | grep -v "backend" | grep -v "mobile" | grep -v "docs" | grep -v "\.git" | grep -v "scripts" || echo "None"

echo ""
echo "=================================="
echo "Migration Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Create new root package.json (workspace coordinator)"
echo "2. Update mobile/tsconfig.json with correct paths"
echo "3. Update mobile/app.json if needed"
echo "4. Test mobile independently: cd mobile && npm install && npm start"
echo "5. Test backend independently: cd backend && npm install && npm run dev"
echo ""
print_status "File migration completed successfully"
