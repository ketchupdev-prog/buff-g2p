#!/usr/bin/env python3
"""
Rate Limiting Usage Examples

Location: shared_config/examples/rate_limiting_usage.py
Purpose: Demonstrate how to use the unified rate limiting system

This file provides practical examples for:
- Loading configuration
- Creating middleware
- Testing rate limits
- Monitoring violations
- Custom configurations
"""

import asyncio
import time
from pathlib import Path
from typing import Optional

# Example 1: Basic Setup with FastAPI
def example_basic_setup():
    """
    Example 1: Basic FastAPI setup with rate limiting.
    
    This is the simplest way to add rate limiting to your app.
    """
    print("=" * 70)
    print("Example 1: Basic FastAPI Setup")
    print("=" * 70)
    
    from fastapi import FastAPI
    from smartpay_ai.shared.rate_limiter import create_rate_limit_middleware
    
    # Create app
    app = FastAPI(title="SmartPay API")
    
    # Add rate limiting middleware (automatically loads config)
    app.add_middleware(create_rate_limit_middleware(app))
    
    print("✓ Rate limiting middleware added")
    print("✓ Config automatically loaded from shared_config/rate_limits.yaml")
    print()


# Example 2: Custom Configuration Path
def example_custom_config_path():
    """
    Example 2: Using a custom configuration file path.
    
    Useful for testing or multiple environments.
    """
    print("=" * 70)
    print("Example 2: Custom Configuration Path")
    print("=" * 70)
    
    from fastapi import FastAPI
    from smartpay_ai.shared.rate_limiter import ConfigurableRateLimitMiddleware
    
    app = FastAPI()
    
    # Use custom config path
    custom_config = "/path/to/custom/rate_limits.yaml"
    
    middleware = ConfigurableRateLimitMiddleware(
        app,
        config_path=custom_config
    )
    
    app.add_middleware(middleware)
    
    print(f"✓ Using custom config: {custom_config}")
    print()


# Example 3: Reading Configuration
def example_reading_config():
    """
    Example 3: Reading and inspecting configuration.
    
    Useful for debugging or building admin UIs.
    """
    print("=" * 70)
    print("Example 3: Reading Configuration")
    print("=" * 70)
    
    from smartpay_ai.shared.rate_limiter import RateLimitConfig
    
    # Load config
    config = RateLimitConfig()
    
    print(f"✓ Config loaded from: {config.config_path}")
    print(f"✓ Environment: {config.environment}")
    print()
    
    # Get global config
    global_config = config.get_global_config()
    print("Global Rate Limit:")
    print(f"  - Algorithm: {global_config['algorithm']}")
    print(f"  - Capacity: {global_config['capacity']}")
    print(f"  - Refill rate: {global_config['refill_rate']} tokens/sec")
    print()
    
    # List all endpoints
    endpoints = config.config.get('endpoints', {})
    print(f"Configured Endpoints ({len(endpoints)}):")
    for name, endpoint_config in list(endpoints.items())[:5]:
        print(f"  - {name}: {endpoint_config['capacity']} requests/{endpoint_config.get('window_ms', 0)//1000}s")
    if len(endpoints) > 5:
        print(f"  ... and {len(endpoints) - 5} more")
    print()
    
    # Check skip paths
    skip_paths = config.config.get('skip_paths', [])
    print(f"Paths that skip rate limiting ({len(skip_paths)}):")
    for path in skip_paths[:5]:
        print(f"  - {path}")
    print()


# Example 4: Testing Rate Limits Programmatically
async def example_testing_rate_limits():
    """
    Example 4: Testing rate limits programmatically.
    
    Useful for integration tests and validation.
    """
    print("=" * 70)
    print("Example 4: Testing Rate Limits")
    print("=" * 70)
    
    from smartpay_ai.shared.rate_limiter import (
        RateLimitConfig,
        InMemoryRateLimiter
    )
    
    # Load config
    config = RateLimitConfig()
    limiter = InMemoryRateLimiter(config)
    
    # Get endpoint config
    endpoint_config = config.get_endpoint_config("/api/smartpay-copilot/chat")
    
    if endpoint_config:
        print(f"Testing endpoint: {endpoint_config['path']}")
        print(f"  Capacity: {endpoint_config['capacity']}")
        print(f"  Algorithm: {endpoint_config['algorithm']}")
        print()
        
        # Simulate requests
        user_key = "user:test-123:/api/smartpay-copilot/chat"
        
        print("Simulating requests:")
        success_count = 0
        failed_count = 0
        
        for i in range(endpoint_config['capacity'] + 5):
            allowed, retry_after, remaining = limiter.check_rate_limit(
                user_key,
                endpoint_config
            )
            
            if allowed:
                success_count += 1
                if i < 3 or i == endpoint_config['capacity'] - 1:
                    print(f"  Request {i+1}: ✓ Allowed (remaining: {remaining})")
            else:
                failed_count += 1
                if failed_count <= 2:
                    print(f"  Request {i+1}: ✗ Blocked (retry after: {retry_after}s)")
        
        print()
        print(f"Results: {success_count} allowed, {failed_count} blocked")
        print(f"Expected: {endpoint_config['capacity']} allowed, 5 blocked")
    
    print()


# Example 5: Monitoring Violations
def example_monitoring_violations():
    """
    Example 5: Monitoring rate limit violations.
    
    Shows SQL queries for monitoring dashboard.
    """
    print("=" * 70)
    print("Example 5: Monitoring Violations")
    print("=" * 70)
    
    queries = {
        "Last Hour Violations": """
SELECT 
  details->>'path' as endpoint,
  severity,
  COUNT(*) as violations
FROM copilot_security_events
WHERE event_type = 'rate_limit_exceeded'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY endpoint, severity
ORDER BY violations DESC
LIMIT 10;
        """,
        
        "Suspicious IPs": """
SELECT 
  details->>'ip' as ip_address,
  COUNT(*) as violation_count,
  MAX(created_at) as last_violation,
  array_agg(DISTINCT details->>'path') as endpoints_hit
FROM copilot_security_events
WHERE event_type = 'rate_limit_exceeded'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY details->>'ip'
HAVING COUNT(*) > 10
ORDER BY violation_count DESC;
        """,
        
        "Critical Endpoint Violations": """
SELECT 
  details->>'path' as endpoint,
  COUNT(*) as violations,
  COUNT(DISTINCT COALESCE(user_id::text, details->>'ip')) as unique_users
FROM copilot_security_events
WHERE event_type = 'rate_limit_exceeded'
  AND severity = 'critical'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY endpoint
ORDER BY violations DESC;
        """
    }
    
    for title, query in queries.items():
        print(f"\n{title}:")
        print(query)
    
    print()


# Example 6: Custom Endpoint Configuration
def example_custom_endpoint():
    """
    Example 6: Adding a custom endpoint configuration.
    
    Shows YAML syntax for new endpoints.
    """
    print("=" * 70)
    print("Example 6: Adding Custom Endpoint")
    print("=" * 70)
    
    yaml_example = """
# Add to shared_config/rate_limits.yaml

endpoints:
  # Your new endpoint
  my_new_feature:
    path: "/api/my/feature"
    algorithm: "token_bucket"
    capacity: 50
    refill_rate: 0.0556  # 50 per 15 minutes
    window_ms: 900000
    max_requests: 50
    description: "My new feature endpoint"
    per_user: true
    security_level: "medium"
    log_violations: false

  # Another example: Strict endpoint
  my_critical_operation:
    path: "/api/critical/operation"
    algorithm: "fixed_window"
    max_requests: 5
    window_ms: 3600000  # 1 hour
    description: "Critical operation (strict)"
    per_user: true
    security_level: "critical"
    log_violations: true
    block_on_exceed: true
"""
    
    print(yaml_example)
    print()
    print("After adding configuration:")
    print("  1. Save rate_limits.yaml")
    print("  2. Restart services")
    print("  3. No code changes needed!")
    print()


# Example 7: Environment-Specific Configuration
def example_environment_config():
    """
    Example 7: Environment-specific overrides.
    
    Shows how to use different limits per environment.
    """
    print("=" * 70)
    print("Example 7: Environment Overrides")
    print("=" * 70)
    
    yaml_example = """
# Add to rate_limits.yaml

environments:
  # Development: Very lenient (for testing)
  development:
    global:
      default:
        capacity: 10000
        refill_rate: 2.778
    endpoints:
      copilot_chat:
        capacity: 1000  # Much higher for dev

  # Staging: Moderate limits
  staging:
    global:
      default:
        capacity: 5000
        refill_rate: 1.389

  # Production: Strict limits (as defined)
  production:
    redis:
      enabled: true
    security_logging:
      enabled: true
      log_violations: true
"""
    
    print(yaml_example)
    print()
    print("Set environment:")
    print("  export ENVIRONMENT=development   # Python")
    print("  export NODE_ENV=development      # TypeScript")
    print()


# Example 8: Token Bucket Math
def example_token_bucket_math():
    """
    Example 8: Calculating token bucket parameters.
    
    Shows how to calculate refill_rate from desired limits.
    """
    print("=" * 70)
    print("Example 8: Token Bucket Math")
    print("=" * 70)
    
    examples = [
        ("100 requests per 15 minutes", 100, 15 * 60),
        ("60 requests per 1 minute", 60, 60),
        ("10 requests per 1 hour", 10, 60 * 60),
        ("1000 requests per 1 hour", 1000, 60 * 60),
    ]
    
    print("Calculating refill_rate:\n")
    print("Formula: refill_rate = max_requests / window_seconds\n")
    
    for description, max_requests, window_seconds in examples:
        refill_rate = max_requests / window_seconds
        window_ms = window_seconds * 1000
        
        print(f"{description}:")
        print(f"  max_requests = {max_requests}")
        print(f"  window_seconds = {window_seconds}")
        print(f"  window_ms = {window_ms}")
        print(f"  refill_rate = {max_requests} / {window_seconds} = {refill_rate:.4f} tokens/sec")
        print()
        
        print(f"  YAML Configuration:")
        print(f"    capacity: {max_requests}")
        print(f"    refill_rate: {refill_rate:.4f}")
        print(f"    window_ms: {window_ms}")
        print()


# Example 9: Testing with cURL
def example_curl_testing():
    """
    Example 9: Testing rate limits with cURL.
    
    Practical shell commands for testing.
    """
    print("=" * 70)
    print("Example 9: Testing with cURL")
    print("=" * 70)
    
    print("""
# Test single request with headers
curl -i http://localhost:8000/api/smartpay-copilot/chat \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "test"}'

# Expected response headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 2026-03-18T13:15:00.000Z

# Load test (100 requests, should see 429 after limit)
for i in {1..105}; do
  echo "Request $i:"
  curl -s -o /dev/null -w "Status: %{http_code}\\n" \\
    -X POST http://localhost:8000/api/smartpay-copilot/chat \\
    -H "Authorization: Bearer $TOKEN" \\
    -d '{"message": "test"}'
done

# Test payment endpoint (strict limit: 10/hour)
for i in {1..12}; do
  echo "Payment request $i:"
  curl -s -o /dev/null -w "Status: %{http_code}\\n" \\
    -X POST http://localhost:8000/api/payments/initiate \\
    -H "Authorization: Bearer $TOKEN" \\
    -d '{"amount": 100, "recipient": "user-456"}'
done

# Test auth endpoint (brute force protection: 5/15min)
for i in {1..7}; do
  echo "Login attempt $i:"
  curl -s -o /dev/null -w "Status: %{http_code}\\n" \\
    -X POST http://localhost:8000/api/auth/login \\
    -d '{"username": "test", "password": "wrong"}'
done
""")
    
    print()


# Example 10: Programmatic Configuration Access
def example_programmatic_access():
    """
    Example 10: Accessing configuration programmatically.
    
    Useful for admin UIs or monitoring tools.
    """
    print("=" * 70)
    print("Example 10: Programmatic Configuration Access")
    print("=" * 70)
    
    from smartpay_ai.shared.rate_limiter import RateLimitConfig
    
    config = RateLimitConfig()
    
    # Get all endpoints
    endpoints = config.config.get('endpoints', {})
    
    print("Rate Limit Configuration Summary:\n")
    
    # Group by security level
    by_security = {
        'critical': [],
        'high': [],
        'medium': [],
        'low': []
    }
    
    for name, endpoint in endpoints.items():
        level = endpoint.get('security_level', 'low')
        by_security[level].append({
            'name': name,
            'path': endpoint['path'],
            'capacity': endpoint.get('capacity', endpoint.get('max_requests')),
            'algorithm': endpoint['algorithm']
        })
    
    # Display grouped by security
    for level in ['critical', 'high', 'medium', 'low']:
        if by_security[level]:
            print(f"{level.upper()} Security Level ({len(by_security[level])} endpoints):")
            for ep in by_security[level]:
                print(f"  - {ep['name']:30} | {ep['path']:40} | {ep['capacity']:3} req | {ep['algorithm']}")
            print()


# Example 11: Creating a Rate Limit Status Endpoint
def example_status_endpoint():
    """
    Example 11: Create an endpoint to check rate limit status.
    
    Useful for frontend apps to show users their limit status.
    """
    print("=" * 70)
    print("Example 11: Rate Limit Status Endpoint")
    print("=" * 70)
    
    example_code = '''
from fastapi import APIRouter, Depends, Request
from smartpay_ai.shared.rate_limiter import RateLimitConfig

router = APIRouter()
config = RateLimitConfig()

@router.get("/api/rate-limits/status")
async def get_rate_limit_status(request: Request):
    """
    Get current rate limit status for authenticated user.
    
    Returns remaining capacity for each endpoint.
    """
    user = request.state.user
    user_id = user.get("user_id") if user else "anonymous"
    
    endpoints_status = []
    
    # Check all configured endpoints
    for name, endpoint_config in config.config.get('endpoints', {}).items():
        # Get current bucket for this user+endpoint
        key = f"user:{user_id}:path:{endpoint_config['path']}"
        
        # This would need access to the limiter instance
        # For now, return config values
        endpoints_status.append({
            "endpoint": name,
            "path": endpoint_config['path'],
            "limit": endpoint_config.get('capacity', endpoint_config.get('max_requests')),
            "algorithm": endpoint_config['algorithm'],
            "security_level": endpoint_config.get('security_level', 'low'),
            "description": endpoint_config.get('description', '')
        })
    
    return {
        "user_id": user_id,
        "endpoints": endpoints_status,
        "global_limit": config.get_global_config()['capacity']
    }
'''
    
    print(example_code)
    print()


# Example 12: Testing Individual Components
def example_component_testing():
    """
    Example 12: Testing individual components.
    
    Unit tests for token bucket and fixed window.
    """
    print("=" * 70)
    print("Example 12: Component Testing")
    print("=" * 70)
    
    from smartpay_ai.shared.rate_limiter import TokenBucket, FixedWindow
    
    # Test token bucket
    print("Testing TokenBucket:")
    bucket = TokenBucket(capacity=5, refill_rate=1.0)  # 5 tokens, 1 per second
    
    print(f"  Initial tokens: {bucket.tokens}")
    
    # Consume 3 tokens
    bucket.consume(3)
    print(f"  After consuming 3: {bucket.tokens}")
    
    # Wait and refill
    time.sleep(2)
    bucket._refill()
    print(f"  After 2 seconds (refill): {bucket.tokens:.2f}")
    
    print()
    
    # Test fixed window
    print("Testing FixedWindow:")
    window = FixedWindow(max_requests=5, window_ms=5000)  # 5 requests per 5 seconds
    
    print(f"  Initial count: {window.count}")
    
    # Make 5 requests
    for i in range(5):
        result = window.consume()
        print(f"  Request {i+1}: {'✓ Allowed' if result else '✗ Blocked'}")
    
    # 6th request should fail
    result = window.consume()
    print(f"  Request 6: {'✓ Allowed' if result else '✗ Blocked'}")
    
    retry = window.get_retry_after()
    print(f"  Retry after: {retry} seconds")
    
    print()


# Example 13: Custom Error Messages
def example_custom_error_messages():
    """
    Example 13: Customizing error messages per endpoint type.
    
    Shows how to configure user-friendly error messages.
    """
    print("=" * 70)
    print("Example 13: Custom Error Messages")
    print("=" * 70)
    
    yaml_example = """
# In rate_limits.yaml

responses:
  error_messages:
    default: "Rate limit exceeded. Please try again later."
    
    auth: |
      Too many authentication attempts. 
      For security, please wait 15 minutes before trying again.
      If you've forgotten your password, use the reset option.
    
    payment: |
      You've reached the payment limit for security reasons.
      This limit resets in 1 hour.
      If you need immediate assistance, please contact support.
    
    copilot: "You're chatting too fast! Take a break and come back soon."
"""
    
    print(yaml_example)
    print()


# Main function to run all examples
def main():
    """Run all examples."""
    print("\n" + "=" * 70)
    print("UNIFIED RATE LIMITING - USAGE EXAMPLES")
    print("=" * 70 + "\n")
    
    print("This script demonstrates how to use the unified rate limiting system.")
    print("Each example is self-contained and can be run independently.\n")
    
    # Run examples
    try:
        example_basic_setup()
        input("Press Enter to continue to next example...")
        
        example_custom_config_path()
        input("Press Enter to continue...")
        
        example_reading_config()
        input("Press Enter to continue...")
        
        print("Running async example...")
        asyncio.run(example_testing_rate_limits())
        input("Press Enter to continue...")
        
        example_monitoring_violations()
        input("Press Enter to continue...")
        
        example_custom_endpoint()
        input("Press Enter to continue...")
        
        example_environment_config()
        input("Press Enter to continue...")
        
        example_token_bucket_math()
        input("Press Enter to continue...")
        
        example_curl_testing()
        input("Press Enter to continue...")
        
        example_component_testing()
        input("Press Enter to continue...")
        
        example_custom_error_messages()
        
        print("\n" + "=" * 70)
        print("ALL EXAMPLES COMPLETED")
        print("=" * 70)
        print()
        print("Next steps:")
        print("  1. Review shared_config/RATE_LIMITING_GUIDE.md for full documentation")
        print("  2. Run tests: pytest tests/test_rate_limiter.py -v")
        print("  3. Start using in your application!")
        print()
        
    except KeyboardInterrupt:
        print("\n\nExamples interrupted. Run again to see all examples.")
    except Exception as e:
        print(f"\nError running examples: {e}")
        print("Make sure you're in the correct directory and dependencies are installed.")


if __name__ == "__main__":
    main()
