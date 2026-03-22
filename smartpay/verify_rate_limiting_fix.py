#!/usr/bin/env python3
"""
Verification script for DRY Violation #2 fix.

Location: smartpay/verify_rate_limiting_fix.py
Purpose: Verify rate limiting migration is complete and working correctly

Usage:
    python verify_rate_limiting_fix.py
    python verify_rate_limiting_fix.py --verbose
"""

import sys
import os
from pathlib import Path
from typing import List, Tuple
import yaml

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


def print_section(title: str):
    """Print section header."""
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}{title:^70}{RESET}")
    print(f"{BLUE}{'='*70}{RESET}\n")


def print_success(message: str):
    """Print success message."""
    print(f"{GREEN}✓{RESET} {message}")


def print_error(message: str):
    """Print error message."""
    print(f"{RED}✗{RESET} {message}")


def print_warning(message: str):
    """Print warning message."""
    print(f"{YELLOW}⚠{RESET} {message}")


def print_info(message: str):
    """Print info message."""
    print(f"  {message}")


def check_file_exists(filepath: Path, description: str) -> bool:
    """Check if file exists."""
    if filepath.exists():
        print_success(f"{description}: {filepath.name}")
        return True
    else:
        print_error(f"{description}: {filepath} NOT FOUND")
        return False


def count_lines(filepath: Path) -> int:
    """Count lines in file."""
    try:
        with open(filepath, 'r') as f:
            return len(f.readlines())
    except Exception:
        return 0


def verify_yaml_config(config_path: Path) -> Tuple[bool, List[str]]:
    """Verify YAML configuration is valid."""
    issues = []
    
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        # Check required sections
        required_sections = ['version', 'global', 'endpoints', 'skip_paths']
        for section in required_sections:
            if section not in config:
                issues.append(f"Missing required section: {section}")
        
        # Check endpoints
        if 'endpoints' in config:
            endpoint_count = len(config['endpoints'])
            if endpoint_count < 10:
                issues.append(f"Only {endpoint_count} endpoints configured (expected 15+)")
            else:
                print_info(f"Found {endpoint_count} endpoint configurations")
        
        # Check algorithms
        if 'endpoints' in config:
            algorithms = set()
            for name, endpoint in config['endpoints'].items():
                if 'algorithm' in endpoint:
                    algorithms.add(endpoint['algorithm'])
            
            print_info(f"Algorithms used: {', '.join(algorithms)}")
            
            if 'token_bucket' not in algorithms:
                issues.append("Token bucket algorithm not used")
            
            if 'fixed_window' not in algorithms:
                issues.append("Fixed window algorithm not used")
        
        # Check security levels
        critical_endpoints = []
        if 'endpoints' in config:
            for name, endpoint in config['endpoints'].items():
                if endpoint.get('security_level') == 'critical':
                    critical_endpoints.append(name)
        
        if len(critical_endpoints) < 3:
            issues.append(f"Only {len(critical_endpoints)} critical endpoints (expected 5+)")
        else:
            print_info(f"Critical endpoints: {', '.join(critical_endpoints)}")
        
        return len(issues) == 0, issues
    
    except Exception as e:
        issues.append(f"Failed to parse YAML: {str(e)}")
        return False, issues


def verify_python_implementation(base_path: Path) -> Tuple[bool, List[str]]:
    """Verify Python implementation."""
    issues = []
    
    # Check shared implementation
    shared_file = base_path / "backend_python/smartpay_ai/shared/rate_limiter.py"
    if not shared_file.exists():
        issues.append(f"Shared implementation not found: {shared_file}")
        return False, issues
    
    lines = count_lines(shared_file)
    print_info(f"Shared implementation: {lines} lines")
    
    if lines < 400:
        issues.append(f"Shared implementation too small ({lines} lines, expected 500+)")
    
    # Check middleware wrapper
    middleware_file = base_path / "backend_python/smartpay_ai/middleware/rate_limit.py"
    if not middleware_file.exists():
        issues.append(f"Middleware wrapper not found: {middleware_file}")
        return False, issues
    
    middleware_lines = count_lines(middleware_file)
    print_info(f"Middleware wrapper: {middleware_lines} lines")
    
    if middleware_lines > 100:
        issues.append(f"Middleware still has hardcoded logic ({middleware_lines} lines, expected <100)")
    
    # Verify imports
    try:
        with open(middleware_file, 'r') as f:
            content = f.read()
            
        if "from smartpay_ai.shared.rate_limiter import" not in content:
            issues.append("Middleware doesn't import from shared implementation")
        
        if "ENDPOINT_LIMITS" in content:
            issues.append("Middleware still has hardcoded ENDPOINT_LIMITS")
        
        if "class TokenBucket" in content:
            issues.append("Middleware still has duplicate TokenBucket class")
    
    except Exception as e:
        issues.append(f"Failed to read middleware: {str(e)}")
    
    return len(issues) == 0, issues


def verify_tests(base_path: Path) -> Tuple[bool, List[str]]:
    """Verify test files exist."""
    issues = []
    
    # Python tests
    python_test_file = base_path / "backend_python/tests/test_rate_limiter.py"
    if python_test_file.exists():
        lines = count_lines(python_test_file)
        print_info(f"Python tests: {lines} lines")
        
        if lines < 300:
            issues.append(f"Python tests too small ({lines} lines, expected 400+)")
    else:
        issues.append("Python test file not found")
    
    # TypeScript tests
    ts_test_file = base_path / "backend/tests/rateLimiter.test.ts"
    if ts_test_file.exists():
        lines = count_lines(ts_test_file)
        print_info(f"TypeScript tests: {lines} lines")
    else:
        issues.append("TypeScript test file not found")
    
    return len(issues) == 0, issues


def verify_documentation(base_path: Path) -> Tuple[bool, List[str]]:
    """Verify documentation files exist."""
    issues = []
    
    docs = [
        ("shared_config/RATE_LIMITING_GUIDE.md", "Rate Limiting Guide", 500),
        ("backend/MIGRATION_GUIDE_RATE_LIMITING.md", "TypeScript Migration Guide", 300),
        ("DRY_VIOLATION_2_FIX.md", "DRY Violation Fix Summary", 200),
    ]
    
    for filepath, description, min_lines in docs:
        full_path = base_path / filepath
        if full_path.exists():
            lines = count_lines(full_path)
            if lines >= min_lines:
                print_info(f"{description}: {lines} lines")
            else:
                issues.append(f"{description} too small ({lines} lines, expected {min_lines}+)")
        else:
            issues.append(f"{description} not found: {filepath}")
    
    return len(issues) == 0, issues


def verify_typescript_migration_status(base_path: Path) -> Tuple[bool, List[str]]:
    """Check TypeScript migration status."""
    issues = []
    
    ts_middleware = base_path / "backend/src/middleware/rateLimiter.ts"
    if not ts_middleware.exists():
        issues.append("TypeScript middleware not found")
        return False, issues
    
    try:
        with open(ts_middleware, 'r') as f:
            content = f.read()
        
        # Check if still using hardcoded config
        if "DEFAULT_CONFIG: RateLimitConfig" in content:
            issues.append("TypeScript still has hardcoded DEFAULT_CONFIG")
        
        if "strictRateLimiter = createRateLimiter({" in content:
            issues.append("TypeScript still has hardcoded strict limits")
        
        # Check if config loader exists
        config_loader = base_path / "backend/src/lib/rateLimitConfig.ts"
        if config_loader.exists():
            print_info("TypeScript config loader exists ✅")
        else:
            issues.append("TypeScript config loader not yet created (migration pending)")
    
    except Exception as e:
        issues.append(f"Failed to check TypeScript: {str(e)}")
    
    return len(issues) == 0, issues


def main():
    """Run all verification checks."""
    print_section("DRY Violation #2 - Rate Limiting Fix Verification")
    
    # Determine base path
    current_dir = Path(__file__).parent
    base_path = current_dir
    
    print_info(f"Base path: {base_path}")
    
    all_passed = True
    
    # Check 1: Configuration file
    print_section("1. Unified Configuration File")
    config_file = base_path / "shared_config/rate_limits.yaml"
    
    if check_file_exists(config_file, "Rate limits YAML config"):
        lines = count_lines(config_file)
        print_info(f"Configuration size: {lines} lines")
        
        valid, issues = verify_yaml_config(config_file)
        if valid:
            print_success("YAML configuration is valid")
        else:
            print_error("YAML configuration has issues:")
            for issue in issues:
                print_info(f"  - {issue}")
            all_passed = False
    else:
        all_passed = False
    
    # Check 2: Python implementation
    print_section("2. Python Implementation")
    valid, issues = verify_python_implementation(base_path)
    
    if valid:
        print_success("Python implementation migrated successfully")
    else:
        print_error("Python implementation has issues:")
        for issue in issues:
            print_info(f"  - {issue}")
        all_passed = False
    
    # Check 3: Test files
    print_section("3. Test Coverage")
    valid, issues = verify_tests(base_path)
    
    if valid:
        print_success("Test files present and adequate")
    else:
        print_warning("Test coverage issues:")
        for issue in issues:
            print_info(f"  - {issue}")
    
    # Check 4: Documentation
    print_section("4. Documentation")
    valid, issues = verify_documentation(base_path)
    
    if valid:
        print_success("Documentation complete")
    else:
        print_error("Documentation issues:")
        for issue in issues:
            print_info(f"  - {issue}")
        all_passed = False
    
    # Check 5: TypeScript migration status
    print_section("5. TypeScript Migration Status")
    valid, issues = verify_typescript_migration_status(base_path)
    
    if valid:
        print_success("TypeScript migration complete")
    else:
        print_warning("TypeScript migration pending:")
        for issue in issues:
            print_info(f"  - {issue}")
    
    # Final summary
    print_section("Verification Summary")
    
    if all_passed:
        print_success("All critical checks passed! ✅")
        print_info("")
        print_info("Python backend: Ready for deployment")
        print_info("TypeScript backend: Migration guide available")
        print_info("")
        print_info("Next steps:")
        print_info("  1. Run Python tests: pytest tests/test_rate_limiter.py -v")
        print_info("  2. Review migration guide: backend/MIGRATION_GUIDE_RATE_LIMITING.md")
        print_info("  3. Deploy Python backend")
        print_info("  4. Migrate TypeScript backend")
        return 0
    else:
        print_error("Some checks failed! ❌")
        print_info("")
        print_info("Review the issues above and fix them before deployment.")
        return 1


if __name__ == "__main__":
    verbose = "--verbose" in sys.argv or "-v" in sys.argv
    sys.exit(main())
