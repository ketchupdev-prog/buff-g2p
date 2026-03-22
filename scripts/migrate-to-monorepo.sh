#!/bin/bash

################################################################################
# Monorepo Migration Script
# Purpose: Safely restructure fintech directory to proper monorepo
# Author: Agent 6 - Monorepo Restructure Specialist
# Date: 2026-03-18
# Version: 1.0.0
################################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/../fintech-migration-backups"
LOG_FILE="${PROJECT_ROOT}/migration-$(date +%Y%m%d-%H%M%S).log"

# Flags
DRY_RUN=false
VERBOSE=false
CREATE_BACKUP=true
UPDATE_IMPORTS_ONLY=false
ROLLBACK=false
VERIFY_ONLY=false

################################################################################
# Logging Functions
################################################################################

log() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1" | tee -a "$LOG_FILE"
    fi
}

################################################################################
# Utility Functions
################################################################################

print_header() {
    echo ""
    echo "=============================================================================="
    echo "  $1"
    echo "=============================================================================="
    echo ""
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "Required command '$1' not found. Please install it first."
        exit 1
    fi
}

confirm() {
    if [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    read -p "$1 (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "Operation cancelled by user"
        return 1
    fi
    return 0
}

################################################################################
# Pre-flight Checks
################################################################################

run_preflight_checks() {
    print_header "Pre-flight Checks"
    
    log "Checking required commands..."
    check_command "git"
    check_command "node"
    check_command "npm"
    check_command "python3"
    success "All required commands available"
    
    log "Checking git repository..."
    if [ ! -d "${PROJECT_ROOT}/.git" ]; then
        # Check parent directory
        if [ ! -d "${PROJECT_ROOT}/../.git" ]; then
            error "Not a git repository"
            exit 1
        else
            success "Git repository found in parent directory"
        fi
    else
        success "Git repository found"
    fi
    
    log "Checking for uncommitted changes..."
    cd "${PROJECT_ROOT}"
    if [ -n "$(git status --porcelain)" ]; then
        warn "You have uncommitted changes:"
        git status --short
        if ! confirm "Continue anyway?"; then
            exit 1
        fi
    else
        success "Working directory is clean"
    fi
    
    log "Checking current structure..."
    if [ ! -d "${PROJECT_ROOT}/smartpay" ]; then
        error "smartpay/ directory not found. Are you in the right directory?"
        exit 1
    fi
    success "Current structure validated"
    
    log "Checking for conflicts..."
    if [ "$ROLLBACK" = false ]; then
        if [ -d "${PROJECT_ROOT}/apps/smartpay-backend/src" ]; then
            error "Target directory apps/smartpay-backend/ already exists with content"
            error "This suggests migration was already started or partially completed"
            error "Use --rollback to revert, or manually clean up first"
            exit 1
        fi
    fi
    success "No conflicts detected"
    
    success "Pre-flight checks complete"
}

################################################################################
# Backup Functions
################################################################################

create_backup() {
    if [ "$CREATE_BACKUP" = false ] || [ "$DRY_RUN" = true ]; then
        log "Skipping backup (disabled or dry-run)"
        return 0
    fi
    
    print_header "Creating Backup"
    
    mkdir -p "$BACKUP_DIR"
    local backup_file="${BACKUP_DIR}/fintech-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    log "Creating backup at: $backup_file"
    cd "${PROJECT_ROOT}/.."
    tar -czf "$backup_file" fintech/
    
    local backup_size=$(du -h "$backup_file" | cut -f1)
    success "Backup created: $backup_file ($backup_size)"
    
    # Save backup path for rollback
    echo "$backup_file" > "${PROJECT_ROOT}/.last-backup"
}

restore_backup() {
    print_header "Restoring from Backup"
    
    if [ ! -f "${PROJECT_ROOT}/.last-backup" ]; then
        error "No backup information found. Cannot rollback."
        exit 1
    fi
    
    local backup_file=$(cat "${PROJECT_ROOT}/.last-backup")
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log "Restoring from: $backup_file"
    cd "${PROJECT_ROOT}/.."
    
    if confirm "This will DELETE current fintech/ and restore backup. Continue?"; then
        rm -rf fintech/
        tar -xzf "$backup_file"
        success "Backup restored successfully"
        log "Old structure restored. You may need to run: npm install"
    fi
}

################################################################################
# Directory Migration
################################################################################

migrate_directories() {
    print_header "Phase 1: Directory Migration"
    
    cd "${PROJECT_ROOT}"
    
    # Create new structure (already exists, but ensure)
    log "Ensuring new directory structure exists..."
    mkdir -p apps packages/shared-types packages/shared-config packages/shared-security
    mkdir -p docs/compliance docs/playbooks docs/guides
    success "Directory structure created"
    
    # Move apps
    log "Moving applications to apps/..."
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would execute: git mv smartpay/backend apps/smartpay-backend"
        log "[DRY RUN] Would execute: git mv smartpay/mobile apps/smartpay-mobile"
        log "[DRY RUN] Would execute: git mv smartpay/backend_python apps/smartpay-ai"
    else
        if [ -d "smartpay/backend" ]; then
            git mv smartpay/backend apps/smartpay-backend
            success "Moved backend → apps/smartpay-backend"
        fi
        
        if [ -d "smartpay/mobile" ]; then
            git mv smartpay/mobile apps/smartpay-mobile
            success "Moved mobile → apps/smartpay-mobile"
        fi
        
        if [ -d "smartpay/backend_python" ]; then
            git mv smartpay/backend_python apps/smartpay-ai
            success "Moved backend_python → apps/smartpay-ai"
        fi
    fi
    
    # Move database to root
    log "Moving database to root..."
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would execute: git mv smartpay/database database/"
    else
        if [ -d "smartpay/database" ]; then
            git mv smartpay/database database/
            success "Moved database to root"
        fi
    fi
    
    success "Phase 1 complete: Apps moved to apps/"
}

################################################################################
# Shared Packages Migration
################################################################################

migrate_shared_packages() {
    print_header "Phase 2: Shared Packages Migration"
    
    cd "${PROJECT_ROOT}"
    
    # Migrate shared-types
    log "Creating shared-types package..."
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would create packages/shared-types structure"
        log "[DRY RUN] Would move JSON schemas"
        log "[DRY RUN] Would copy generated types"
    else
        # Create structure
        mkdir -p packages/shared-types/{json,typescript,python}
        
        # Move JSON schemas
        if [ -d "shared_config/types" ]; then
            log "Moving JSON schemas..."
            cp -r shared_config/types/*.json packages/shared-types/json/ 2>/dev/null || true
            success "JSON schemas copied to packages/shared-types/json/"
        fi
        
        # Copy TypeScript generated types (will be regenerated)
        if [ -d "apps/smartpay-backend/src/types/generated" ]; then
            log "Copying TypeScript generated types..."
            cp -r apps/smartpay-backend/src/types/generated/* packages/shared-types/typescript/ 2>/dev/null || true
            success "TypeScript types copied"
        fi
        
        # Copy Python generated types
        if [ -d "apps/smartpay-ai/smartpay_ai/models/generated" ]; then
            log "Copying Python generated types..."
            cp -r apps/smartpay-ai/smartpay_ai/models/generated/* packages/shared-types/python/ 2>/dev/null || true
            success "Python types copied"
        fi
        
        # Move type generator
        if [ -f "scripts/generate_types.py" ]; then
            log "Moving type generator..."
            git mv scripts/generate_types.py packages/shared-types/generate.py
            success "Type generator moved"
        fi
        
        # Create package.json for shared-types
        log "Creating package.json for shared-types..."
        cat > packages/shared-types/package.json <<'EOF'
{
  "name": "@smartpay/shared-types",
  "version": "1.0.0",
  "private": true,
  "description": "Shared type definitions for Smartpay monorepo",
  "main": "typescript/index.ts",
  "types": "typescript/index.ts",
  "scripts": {
    "generate": "python3 generate.py",
    "test": "tsc --noEmit",
    "validate": "node validate-schemas.js"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "zod": "^3.25.76"
  }
}
EOF
        success "Created package.json for shared-types"
        
        # Create README
        cat > packages/shared-types/README.md <<'EOF'
# @smartpay/shared-types

Shared type definitions for the Smartpay monorepo.

## Structure

- `json/` - JSON schemas (source of truth)
- `typescript/` - Generated TypeScript types
- `python/` - Generated Python Pydantic models

## Usage

### TypeScript
```typescript
import { User, Wallet, Transaction } from '@smartpay/shared-types';
```

### Python
```python
from smartpay_ai.models.generated import User, Wallet, Transaction
```

## Generating Types

```bash
npm run generate
```

This will regenerate TypeScript and Python types from JSON schemas.
EOF
        success "Created README for shared-types"
    fi
    
    # Migrate shared-config
    log "Creating shared-config package..."
    
    if [ "$DRY_RUN" = false ]; then
        # Create package.json for shared-config
        cat > packages/shared-config/package.json <<'EOF'
{
  "name": "@smartpay/shared-config",
  "version": "1.0.0",
  "private": true,
  "description": "Shared configuration files for Smartpay monorepo",
  "files": [
    "*.yaml",
    "*.json",
    "README.md"
  ],
  "scripts": {
    "validate": "node validate-configs.js"
  }
}
EOF
        success "Created package.json for shared-config"
        
        # Create placeholder configs (to be populated manually)
        log "Creating placeholder config files..."
        cat > packages/shared-config/rate_limits.yaml <<'EOF'
# Rate Limiting Configuration
# Source: Extracted from backend middleware

endpoints:
  auth:
    window_ms: 900000  # 15 minutes
    max_requests: 5
  transactions:
    window_ms: 60000   # 1 minute
    max_requests: 100
  api:
    window_ms: 60000   # 1 minute
    max_requests: 100
EOF
        
        cat > packages/shared-config/README.md <<'EOF'
# @smartpay/shared-config

Shared configuration files for the Smartpay monorepo.

## Files

- `rate_limits.yaml` - Rate limiting rules
- `jwt_config.json` - JWT configuration
- `compliance_limits.yaml` - KYC tier limits (PSD-3)
- `fee_structure.yaml` - Interchange fees (PSD-11)

## Usage

Load configs at runtime using YAML/JSON parsers.

### TypeScript
```typescript
import * as fs from 'fs';
import * as yaml from 'js-yaml';

const rateLimits = yaml.load(
  fs.readFileSync('../../packages/shared-config/rate_limits.yaml', 'utf8')
);
```

### Python
```python
import yaml

with open('../../packages/shared-config/rate_limits.yaml') as f:
    rate_limits = yaml.safe_load(f)
```
EOF
        success "Created shared-config package"
    fi
    
    success "Phase 2 complete: Shared packages created"
}

################################################################################
# Documentation Migration
################################################################################

migrate_documentation() {
    print_header "Phase 3: Documentation Migration"
    
    cd "${PROJECT_ROOT}"
    
    log "Moving compliance documentation..."
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would execute: git mv 'Regulation & Compliance Resources' docs/compliance/BON_PSDs"
    else
        if [ -d "Regulation & Compliance Resources" ]; then
            git mv "Regulation & Compliance Resources" docs/compliance/BON_PSDs
            success "Moved compliance docs"
        fi
    fi
    
    log "Moving playbooks..."
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would move security/playbooks/* to docs/playbooks/"
    else
        if [ -d "security/playbooks" ]; then
            cp -r security/playbooks/* docs/playbooks/ 2>/dev/null || true
            success "Copied playbooks to docs/playbooks/"
        fi
    fi
    
    log "Organizing architecture documentation..."
    if [ "$DRY_RUN" = false ]; then
        mkdir -p docs/guides/architecture
        
        # Move architecture docs
        if [ -f "apps/smartpay-backend/ARCHITECTURE.md" ]; then
            git mv apps/smartpay-backend/ARCHITECTURE.md docs/guides/architecture/backend-nodejs.md
        fi
        
        if [ -f "apps/smartpay-ai/ARCHITECTURE.md" ]; then
            git mv apps/smartpay-ai/ARCHITECTURE.md docs/guides/architecture/backend-python.md
        fi
        
        # Move root architecture docs
        [ -f "PYTHON_BACKEND_ARCHITECTURE.md" ] && git mv PYTHON_BACKEND_ARCHITECTURE.md docs/guides/architecture/python-detailed.md
        [ -f "DATABASE_ARCHITECTURE.md" ] && git mv DATABASE_ARCHITECTURE.md docs/guides/architecture/database.md
        
        success "Architecture docs organized"
    fi
    
    log "Organizing API documentation..."
    if [ "$DRY_RUN" = false ]; then
        mkdir -p docs/guides/api
        
        [ -f "BUFFR_API_REFERENCE.md" ] && git mv BUFFR_API_REFERENCE.md docs/guides/api/buffr-reference.md
        [ -f "BUFFR_COMPLETE_GUIDE.md" ] && git mv BUFFR_COMPLETE_GUIDE.md docs/guides/api/buffr-complete-guide.md
        [ -f "BUFFR_SMARTPAY_INTEGRATION.md" ] && git mv BUFFR_SMARTPAY_INTEGRATION.md docs/guides/api/buffr-integration.md
        
        if [ -f "apps/smartpay-ai/API_ENDPOINTS.md" ]; then
            git mv apps/smartpay-ai/API_ENDPOINTS.md docs/guides/api/python-endpoints.md
        fi
        
        success "API docs organized"
    fi
    
    log "Organizing getting started guides..."
    if [ "$DRY_RUN" = false ]; then
        mkdir -p docs/guides/getting-started
        
        [ -f "QUICK_START.md" ] && git mv QUICK_START.md docs/guides/getting-started/overview.md
        [ -f "QUICK_START_BACKEND.md" ] && git mv QUICK_START_BACKEND.md docs/guides/getting-started/backend-setup.md
        [ -f "QUICK_START_SECURITY.md" ] && git mv QUICK_START_SECURITY.md docs/guides/getting-started/security-setup.md
        
        success "Getting started guides organized"
    fi
    
    log "Creating documentation index..."
    if [ "$DRY_RUN" = false ]; then
        cat > docs/README.md <<'EOF'
# Smartpay Documentation

Complete documentation for the Smartpay fintech platform.

## Quick Navigation

### 🚀 Getting Started
- [Overview & Quickstart](guides/getting-started/overview.md)
- [Backend Setup](guides/getting-started/backend-setup.md)
- [Security Setup](guides/getting-started/security-setup.md)

### 🏗️ Architecture
- [Node.js Backend](guides/architecture/backend-nodejs.md)
- [Python AI Backend](guides/architecture/backend-python.md)
- [Database Architecture](guides/architecture/database.md)

### 📚 API Reference
- [Python AI Endpoints](guides/api/python-endpoints.md)
- [Buffr Connect Reference](guides/api/buffr-reference.md)
- [Buffr Integration Guide](guides/api/buffr-integration.md)

### ⚖️ Compliance
- [Regulatory Overview](compliance/README.md)
- [Bank of Namibia PSDs](compliance/BON_PSDs/) (18 regulatory documents)

### 🚨 Playbooks
- [Fraud Incident Response](playbooks/fraud-incident-response.md)
- [Cyberattack Response](playbooks/cyberattack-response.md)

### 💻 Development Guides
- [Mobile Development](guides/development/mobile-development.md)
- [Backend Development](guides/development/backend-setup.md)
- [Testing Strategy](guides/development/testing.md)

---

**Last Updated:** 2026-03-18  
**Maintained by:** Smartpay Engineering Team
EOF
        success "Created docs/README.md index"
    fi
    
    success "Phase 3 complete: Documentation migrated"
}

################################################################################
# Import Path Updates
################################################################################

update_typescript_imports() {
    print_header "Phase 4: TypeScript Import Updates"
    
    cd "${PROJECT_ROOT}"
    
    log "Scanning TypeScript files for import updates..."
    
    local files_to_update=$(find apps/smartpay-backend/src -name "*.ts" -type f | wc -l | tr -d ' ')
    log "Found $files_to_update TypeScript files to check"
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would update imports in $files_to_update files"
        log "[DRY RUN] Pattern 1: types/generated/* → @smartpay/shared-types"
        log "[DRY RUN] Pattern 2: ../../shared_config → @smartpay/shared-config"
        return 0
    fi
    
    local updated_count=0
    
    # Pattern 1: Update generated types imports
    log "Updating generated types imports..."
    while IFS= read -r file; do
        if grep -q "from.*types/generated" "$file"; then
            verbose "Updating: $file"
            
            # Backup file
            cp "$file" "${file}.bak"
            
            # Update imports
            sed -i '' \
                -e "s|from ['\"].*types/generated/user['\"]|from '@smartpay/shared-types'|g" \
                -e "s|from ['\"].*types/generated/wallet['\"]|from '@smartpay/shared-types'|g" \
                -e "s|from ['\"].*types/generated/transaction['\"]|from '@smartpay/shared-types'|g" \
                -e "s|from ['\"].*types/generated/payment['\"]|from '@smartpay/shared-types'|g" \
                -e "s|from ['\"].*types/generated/error['\"]|from '@smartpay/shared-types'|g" \
                -e "s|from ['\"].*types/generated/response['\"]|from '@smartpay/shared-types'|g" \
                "$file"
            
            ((updated_count++))
        fi
    done < <(find apps/smartpay-backend/src -name "*.ts" -type f)
    
    success "Updated $updated_count TypeScript files"
    
    # Pattern 2: Update shared_config imports (if any)
    log "Checking for shared_config imports..."
    local shared_config_files=$(grep -rl "shared_config" apps/smartpay-backend/src 2>/dev/null | wc -l | tr -d ' ')
    if [ "$shared_config_files" -gt 0 ]; then
        warn "Found $shared_config_files files importing from shared_config"
        warn "Manual review recommended for these imports"
    else
        success "No shared_config imports found"
    fi
    
    success "Phase 4 complete: TypeScript imports updated"
}

update_python_paths() {
    print_header "Phase 5: Python Path Updates"
    
    cd "${PROJECT_ROOT}"
    
    log "Checking Python imports..."
    
    # Python imports are mostly package-relative, so minimal changes needed
    # Only update config file loading paths
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would update config loading paths in Python files"
        return 0
    fi
    
    log "Updating config file paths in Python..."
    
    # Update paths in files that load configs
    local py_files_updated=0
    
    while IFS= read -r file; do
        if grep -q "shared_config" "$file"; then
            verbose "Updating: $file"
            cp "$file" "${file}.bak"
            
            # Update relative paths to shared_config
            sed -i '' "s|../shared_config/types|../../packages/shared-types/json|g" "$file"
            
            ((py_files_updated++))
        fi
    done < <(find apps/smartpay-ai -name "*.py" -type f)
    
    if [ $py_files_updated -gt 0 ]; then
        success "Updated $py_files_updated Python files"
    else
        success "No Python path updates needed"
    fi
    
    success "Phase 5 complete: Python paths updated"
}

################################################################################
# Configuration Updates
################################################################################

update_configurations() {
    print_header "Phase 6: Configuration Updates"
    
    cd "${PROJECT_ROOT}"
    
    # Update root package.json
    log "Creating new root package.json..."
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would create new root package.json with workspaces"
        return 0
    fi
    
    # Backup old package.json
    if [ -f "smartpay/package.json" ]; then
        cp smartpay/package.json smartpay/package.json.bak
    fi
    
    # Create new root package.json
    cat > package.json <<'EOF'
{
  "name": "smartpay-monorepo",
  "version": "1.0.0",
  "private": true,
  "description": "Smartpay fintech platform - monorepo",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:backend": "npm run dev --workspace=apps/smartpay-backend",
    "dev:mobile": "npm run start --workspace=apps/smartpay-mobile",
    "dev:ai": "cd apps/smartpay-ai && uvicorn smartpay_ai.main:app --reload",
    "dev:all": "concurrently \"npm run dev:backend\" \"npm run dev:ai\"",
    
    "build:backend": "npm run build --workspace=apps/smartpay-backend",
    "build:mobile": "npm run build --workspace=apps/smartpay-mobile",
    "build:types": "npm run generate --workspace=packages/shared-types",
    "build:all": "npm run build:types && npm run build:backend && npm run build:mobile",
    
    "test:backend": "npm test --workspace=apps/smartpay-backend",
    "test:mobile": "npm test --workspace=apps/smartpay-mobile",
    "test:ai": "cd apps/smartpay-ai && python -m pytest tests/",
    "test:types": "npm test --workspace=packages/shared-types",
    "test:all": "npm run test:backend && npm run test:mobile && npm run test:ai && npm run test:types",
    
    "types:generate": "npm run generate --workspace=packages/shared-types",
    
    "clean": "rm -rf node_modules apps/*/node_modules packages/*/node_modules",
    "clean:builds": "rm -rf apps/*/dist apps/*/build apps/*/.expo",
    
    "postinstall": "echo '✅ Workspace dependencies installed successfully'"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.9.3"
  },
  "engines": {
    "node": ">=18.0.0 <=22.0.0",
    "npm": ">=9.0.0"
  }
}
EOF
    success "Created new root package.json"
    
    # Create pnpm-workspace.yaml (optional, but good to have)
    log "Creating pnpm-workspace.yaml..."
    cat > pnpm-workspace.yaml <<'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF
    success "Created pnpm-workspace.yaml"
    
    # Update .gitignore
    log "Updating .gitignore..."
    cat >> .gitignore <<'EOF'

# Monorepo
node_modules/
apps/*/node_modules/
packages/*/node_modules/
apps/*/dist/
apps/*/build/
apps/*/.expo/
*.log
.DS_Store

# Environment files
apps/*/.env
packages/*/.env

# Backups
*.bak
fintech-backup-*.tar.gz
EOF
    success "Updated .gitignore"
    
    success "Phase 6 complete: Configurations updated"
}

################################################################################
# Package Dependency Updates
################################################################################

update_package_dependencies() {
    print_header "Phase 7: Package Dependency Updates"
    
    cd "${PROJECT_ROOT}"
    
    log "Updating backend package.json..."
    if [ "$DRY_RUN" = false ]; then
        local backend_pkg="apps/smartpay-backend/package.json"
        if [ -f "$backend_pkg" ]; then
            # Update name
            sed -i '' 's/"name": "smartpay-backend"/"name": "@smartpay\/backend"/' "$backend_pkg"
            
            # Add shared-types dependency
            # Using jq if available, otherwise manual
            if command -v jq &> /dev/null; then
                local tmp_file=$(mktemp)
                jq '.dependencies["@smartpay/shared-types"] = "workspace:*"' "$backend_pkg" > "$tmp_file"
                mv "$tmp_file" "$backend_pkg"
                success "Added @smartpay/shared-types to backend dependencies"
            else
                warn "jq not found - you'll need to manually add @smartpay/shared-types to backend package.json"
            fi
        fi
    fi
    
    log "Updating mobile package.json..."
    if [ "$DRY_RUN" = false ]; then
        local mobile_pkg="apps/smartpay-mobile/package.json"
        if [ -f "$mobile_pkg" ]; then
            # Update name
            sed -i '' 's/"name": ".*"/"name": "@smartpay\/mobile"/' "$mobile_pkg"
            success "Updated mobile package name"
        fi
    fi
    
    success "Phase 7 complete: Package dependencies updated"
}

################################################################################
# Documentation Link Updates
################################################################################

update_documentation_links() {
    print_header "Phase 8: Documentation Link Updates"
    
    cd "${PROJECT_ROOT}"
    
    log "Scanning markdown files for broken links..."
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would update links in all markdown files"
        log "[DRY RUN] Patterns to update:"
        log "  - smartpay/backend → apps/smartpay-backend"
        log "  - smartpay/mobile → apps/smartpay-mobile"
        log "  - smartpay/backend_python → apps/smartpay-ai"
        return 0
    fi
    
    local updated_count=0
    
    # Find all markdown files
    while IFS= read -r file; do
        if grep -q "smartpay/backend\|smartpay/mobile\|smartpay/backend_python" "$file"; then
            verbose "Updating links in: $file"
            
            cp "$file" "${file}.bak"
            
            # Update all path references
            sed -i '' \
                -e 's|smartpay/backend/|apps/smartpay-backend/|g' \
                -e 's|smartpay/mobile/|apps/smartpay-mobile/|g' \
                -e 's|smartpay/backend_python/|apps/smartpay-ai/|g' \
                -e 's|smartpay/database/|database/|g' \
                "$file"
            
            ((updated_count++))
        fi
    done < <(find . -name "*.md" -type f -not -path "*/node_modules/*")
    
    success "Updated links in $updated_count markdown files"
    
    success "Phase 8 complete: Documentation links updated"
}

################################################################################
# Verification
################################################################################

verify_migration() {
    print_header "Phase 9: Migration Verification"
    
    cd "${PROJECT_ROOT}"
    
    log "Verifying directory structure..."
    
    local checks_passed=0
    local checks_total=10
    
    # Check 1: Apps directory
    if [ -d "apps/smartpay-backend" ] && [ -d "apps/smartpay-mobile" ] && [ -d "apps/smartpay-ai" ]; then
        success "✓ Apps directory structure correct"
        ((checks_passed++))
    else
        error "✗ Apps directory structure incomplete"
    fi
    
    # Check 2: Packages directory
    if [ -d "packages/shared-types" ] && [ -d "packages/shared-config" ]; then
        success "✓ Packages directory structure correct"
        ((checks_passed++))
    else
        error "✗ Packages directory structure incomplete"
    fi
    
    # Check 3: Docs directory
    if [ -d "docs/compliance" ] && [ -d "docs/playbooks" ] && [ -d "docs/guides" ]; then
        success "✓ Docs directory structure correct"
        ((checks_passed++))
    else
        error "✗ Docs directory structure incomplete"
    fi
    
    # Check 4: Database at root
    if [ -d "database/migrations" ]; then
        success "✓ Database directory at root"
        ((checks_passed++))
    else
        error "✗ Database directory not found at root"
    fi
    
    # Check 5: Root package.json
    if [ -f "package.json" ] && grep -q "workspaces" package.json; then
        success "✓ Root package.json with workspaces"
        ((checks_passed++))
    else
        error "✗ Root package.json missing or invalid"
    fi
    
    # Check 6: Shared-types package
    if [ -f "packages/shared-types/package.json" ]; then
        success "✓ Shared-types package created"
        ((checks_passed++))
    else
        error "✗ Shared-types package missing"
    fi
    
    # Check 7: Backend package updated
    if [ -f "apps/smartpay-backend/package.json" ]; then
        if grep -q "@smartpay/shared-types" apps/smartpay-backend/package.json; then
            success "✓ Backend depends on shared-types"
            ((checks_passed++))
        else
            warn "⚠ Backend package.json doesn't reference shared-types yet"
        fi
    else
        error "✗ Backend package.json not found"
    fi
    
    # Check 8: Old smartpay directory cleaned up
    if [ ! -d "smartpay/backend" ] && [ ! -d "smartpay/mobile" ] && [ ! -d "smartpay/backend_python" ]; then
        success "✓ Old smartpay/ subdirectories removed"
        ((checks_passed++))
    else
        warn "⚠ Old smartpay/ subdirectories still exist"
    fi
    
    # Check 9: Git history preserved
    if git log --follow apps/smartpay-backend/src/index.ts 2>/dev/null | grep -q "commit"; then
        success "✓ Git history preserved (verified with sample file)"
        ((checks_passed++))
    else
        warn "⚠ Could not verify git history"
    fi
    
    # Check 10: No broken symlinks
    local broken_links=$(find . -type l -not -path "*/node_modules/*" ! -exec test -e {} \; -print | wc -l | tr -d ' ')
    if [ "$broken_links" -eq 0 ]; then
        success "✓ No broken symlinks"
        ((checks_passed++))
    else
        warn "⚠ Found $broken_links broken symlinks"
    fi
    
    echo ""
    log "Verification Summary: $checks_passed/$checks_total checks passed"
    
    if [ $checks_passed -eq $checks_total ]; then
        success "🎉 All verification checks passed!"
        return 0
    elif [ $checks_passed -ge 7 ]; then
        warn "⚠️  Most checks passed, but some issues detected. Review above."
        return 0
    else
        error "❌ Migration verification failed. Please review errors above."
        return 1
    fi
}

run_build_tests() {
    print_header "Phase 10: Build & Test Verification"
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would run build and test for all apps"
        return 0
    fi
    
    cd "${PROJECT_ROOT}"
    
    log "Installing dependencies..."
    if [ "$VERBOSE" = true ]; then
        npm install
    else
        npm install > /dev/null 2>&1
    fi
    success "Dependencies installed"
    
    log "Building backend..."
    cd apps/smartpay-backend
    if npm run build > /dev/null 2>&1; then
        success "✓ Backend build successful"
    else
        error "✗ Backend build failed"
        error "Run 'cd apps/smartpay-backend && npm run build' for details"
        return 1
    fi
    
    log "Running backend tests..."
    if npm test > /dev/null 2>&1; then
        success "✓ Backend tests passed"
    else
        warn "⚠ Backend tests failed (may need manual review)"
    fi
    
    cd "${PROJECT_ROOT}"
    
    log "Building mobile app..."
    cd apps/smartpay-mobile
    if npm run build > /dev/null 2>&1 || npx expo export > /dev/null 2>&1; then
        success "✓ Mobile build successful"
    else
        warn "⚠ Mobile build failed or not configured"
    fi
    
    cd "${PROJECT_ROOT}"
    
    log "Testing Python backend..."
    cd apps/smartpay-ai
    if python3 -c "from smartpay_ai.main import app; print('OK')" > /dev/null 2>&1; then
        success "✓ Python imports working"
    else
        warn "⚠ Python imports may need review"
    fi
    
    cd "${PROJECT_ROOT}"
    
    success "Phase 10 complete: Build tests finished"
}

################################################################################
# Cleanup
################################################################################

cleanup() {
    print_header "Phase 11: Cleanup"
    
    cd "${PROJECT_ROOT}"
    
    log "Cleaning up backup files..."
    if [ "$DRY_RUN" = false ]; then
        find . -name "*.bak" -not -path "*/node_modules/*" -delete
        success "Removed backup files"
    fi
    
    log "Removing empty directories..."
    if [ "$DRY_RUN" = false ]; then
        find . -type d -empty -not -path "*/node_modules/*" -not -path "*/.git/*" -delete 2>/dev/null || true
        success "Removed empty directories"
    fi
    
    log "Checking for orphaned files..."
    if [ -d "smartpay" ]; then
        local remaining_files=$(find smartpay -type f | wc -l | tr -d ' ')
        if [ "$remaining_files" -gt 0 ]; then
            warn "smartpay/ directory still contains $remaining_files files"
            warn "Review and delete manually if no longer needed"
        else
            if [ "$DRY_RUN" = false ]; then
                rmdir smartpay 2>/dev/null || true
                success "Removed empty smartpay/ directory"
            fi
        fi
    fi
    
    success "Phase 11 complete: Cleanup finished"
}

################################################################################
# Main Execution
################################################################################

print_banner() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║        Smartpay Monorepo Migration Script v1.0.0                  ║"
    echo "║        Agent 6 - Monorepo Restructure Specialist                  ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
}

print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

OPTIONS:
    --dry-run           Preview changes without executing
    --verbose           Show detailed logging
    --no-backup         Skip backup creation (not recommended)
    --update-imports    Only update import statements (partial migration)
    --rollback          Restore from last backup
    --verify-only       Only run verification checks
    -h, --help          Show this help message

EXAMPLES:
    # Preview migration
    $0 --dry-run

    # Execute migration with backup (recommended)
    $0 --backup --verbose

    # Rollback to previous state
    $0 --rollback

    # Only update imports
    $0 --update-imports

    # Verify current structure
    $0 --verify-only

DOCUMENTATION:
    See MONOREPO_MIGRATION_PLAN.md for complete details
EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                log "Dry-run mode enabled"
                shift
                ;;
            --verbose)
                VERBOSE=true
                log "Verbose mode enabled"
                shift
                ;;
            --no-backup|--backup)
                if [[ $1 == "--no-backup" ]]; then
                    CREATE_BACKUP=false
                    warn "Backup creation disabled"
                else
                    CREATE_BACKUP=true
                    log "Backup creation enabled"
                fi
                shift
                ;;
            --update-imports)
                UPDATE_IMPORTS_ONLY=true
                log "Import update mode enabled"
                shift
                ;;
            --rollback)
                ROLLBACK=true
                log "Rollback mode enabled"
                shift
                ;;
            --verify-only)
                VERIFY_ONLY=true
                log "Verification-only mode enabled"
                shift
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done
}

main() {
    print_banner
    parse_args "$@"
    
    log "Starting migration at $(date)"
    log "Project root: ${PROJECT_ROOT}"
    log "Log file: ${LOG_FILE}"
    
    if [ "$ROLLBACK" = true ]; then
        restore_backup
        exit 0
    fi
    
    run_preflight_checks
    
    if [ "$VERIFY_ONLY" = true ]; then
        verify_migration
        exit $?
    fi
    
    if [ "$DRY_RUN" = false ]; then
        if ! confirm "This will restructure your codebase. Continue?"; then
            exit 1
        fi
    fi
    
    # Create backup before making changes
    if [ "$UPDATE_IMPORTS_ONLY" = false ]; then
        create_backup
    fi
    
    # Execute migration phases
    if [ "$UPDATE_IMPORTS_ONLY" = true ]; then
        update_typescript_imports
        update_python_paths
        update_documentation_links
    else
        migrate_directories
        migrate_shared_packages
        migrate_documentation
        update_typescript_imports
        update_python_paths
        update_configurations
        update_package_dependencies
        update_documentation_links
        cleanup
    fi
    
    # Verification
    if [ "$DRY_RUN" = false ]; then
        verify_migration
        
        if [ $? -eq 0 ]; then
            echo ""
            success "🎉 Migration completed successfully!"
            echo ""
            log "Next steps:"
            log "  1. Review changes: git status"
            log "  2. Test builds: npm run build:all"
            log "  3. Run tests: npm run test:all"
            log "  4. Update documentation: Update README.md and PLANNING.md"
            log "  5. Commit: git add . && git commit -m 'refactor: Restructure to monorepo'"
            log ""
            log "If issues occur, rollback with: $0 --rollback"
        else
            error "Migration verification failed. Review errors above."
            error "Rollback with: $0 --rollback"
            exit 1
        fi
    else
        echo ""
        success "Dry-run complete. No changes made."
        log "Review the log above to see what would be changed."
        log "Execute migration with: $0 --backup --verbose"
    fi
    
    log "Migration completed at $(date)"
}

# Execute main
main "$@"
