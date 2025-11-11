#!/usr/bin/env python3
"""
Enhanced Pattern Detection for Tool Planning Hook (Phase 1.5)

Provides production-grade optimization patterns for:
- API operations (rate limiting, batching, caching)
- Database operations (N+1 queries, transactions, bulk operations)
- Security (auth, input validation, credential management)
- State mutations (transactions, rollback, consistency)
- Error handling (resilience, retries, fallbacks)

Target: < 5s execution time for complex/risky tasks
"""
import re
from typing import List, Dict, Any


def detect_api_patterns(prompt: str) -> List[Dict[str, Any]]:
    """
    Detect API-related optimization opportunities

    Patterns:
    1. Rate limiting - Multiple API calls without mention of limits
    2. Batch requests - Loop + API call = batching opportunity
    3. Caching - Repeated API calls for same data
    4. Retry logic - External API without error handling
    """
    opportunities = []
    prompt_lower = prompt.lower()

    # Pattern 1: Rate limiting detection
    # Keywords: api, request, call + multiple, loop, all, each
    api_keywords = r'\b(api|request|call|fetch|http|endpoint)\b'
    multiple_keywords = r'\b(multiple|loop|all|each|every|batch)\b'

    if re.search(api_keywords, prompt_lower) and re.search(multiple_keywords, prompt_lower):
        # Check if rate limiting already mentioned
        if not re.search(r'\b(rate limit|throttle|backoff|delay)\b', prompt_lower):
            opportunities.append({
                "category": "api_optimization",
                "description": "Multiple API calls detected - consider rate limiting, exponential backoff, and request throttling",
                "boost": 0.08,
                "savings": 0  # Prevents failures, not time savings
            })

    # Pattern 2: Batch request opportunities
    # Loop + API call pattern
    loop_pattern = r'\b(for each|loop through|iterate|map over)\b'
    if re.search(loop_pattern, prompt_lower) and re.search(api_keywords, prompt_lower):
        if not re.search(r'\bbatch\b', prompt_lower):
            opportunities.append({
                "category": "api_optimization",
                "description": "Loop + API call detected - use batch endpoints or Promise.all() for parallel requests",
                "boost": 0.10,
                "savings": 120  # Significant time savings
            })

    # Pattern 3: Caching opportunities
    # Repeated/same + API/data
    cache_triggers = r'\b(repeated|same|duplicate|multiple times)\b'
    if re.search(cache_triggers, prompt_lower) and re.search(api_keywords, prompt_lower):
        if not re.search(r'\b(cache|memoize|store)\b', prompt_lower):
            opportunities.append({
                "category": "api_optimization",
                "description": "Repeated API calls - implement caching layer (Redis, in-memory, or HTTP cache headers)",
                "boost": 0.09,
                "savings": 90
            })

    # Pattern 4: External API resilience
    # API/external without error/retry
    external_pattern = r'\b(external|third[- ]party|integration)\b'
    if re.search(external_pattern, prompt_lower) and re.search(api_keywords, prompt_lower):
        if not re.search(r'\b(retry|fallback|timeout|circuit breaker)\b', prompt_lower):
            opportunities.append({
                "category": "api_optimization",
                "description": "External API integration - add retry logic, timeouts, and circuit breaker pattern for resilience",
                "boost": 0.07,
                "savings": 0  # Reliability, not speed
            })

    return opportunities


def detect_database_patterns(prompt: str) -> List[Dict[str, Any]]:
    """
    Detect database optimization opportunities

    Patterns:
    1. N+1 queries - Loop + query pattern
    2. Transaction safety - Mutations without transactions
    3. Bulk operations - Individual inserts/updates in loop
    4. Index usage - Large queries without index mention
    """
    opportunities = []
    prompt_lower = prompt.lower()

    # Pattern 1: N+1 query detection
    # Loop + database query keywords
    loop_keywords = r'\b(loop|for each|iterate|map)\b'
    query_keywords = r'\b(query|select|find|get|fetch|load)\b'
    db_keywords = r'\b(database|db|sql|query|table|collection)\b'

    if re.search(loop_keywords, prompt_lower) and re.search(query_keywords, prompt_lower):
        if not re.search(r'\b(bulk|batch|join|include|eager)\b', prompt_lower):
            opportunities.append({
                "category": "database_optimization",
                "description": "N+1 query pattern detected - use JOIN, eager loading, or bulk fetch to reduce database round-trips",
                "boost": 0.12,
                "savings": 150  # Major performance impact
            })

    # Pattern 2: Transaction safety
    # Mutation keywords without transaction mention
    mutation_keywords = r'\b(insert|update|delete|modify|create|remove|drop)\b'
    if re.search(mutation_keywords, prompt_lower) and re.search(db_keywords, prompt_lower):
        if not re.search(r'\b(transaction|commit|rollback|atomic)\b', prompt_lower):
            opportunities.append({
                "category": "database_optimization",
                "description": "Database mutations detected - wrap in transaction for atomicity and consistency (ACID compliance)",
                "boost": 0.10,
                "savings": 0  # Data integrity, not speed
            })

    # Pattern 3: Bulk operations
    # Loop + insert/update
    if re.search(loop_keywords, prompt_lower) and re.search(mutation_keywords, prompt_lower):
        if not re.search(r'\b(bulk|batch|many|executeMany)\b', prompt_lower):
            opportunities.append({
                "category": "database_optimization",
                "description": "Individual operations in loop - use bulk insert/update (insertMany, bulkWrite) for better performance",
                "boost": 0.11,
                "savings": 120
            })

    # Pattern 4: Index awareness for large queries
    large_data_keywords = r'\b(all|entire|whole|large|thousands|millions)\b'
    if re.search(large_data_keywords, prompt_lower) and re.search(query_keywords, prompt_lower):
        if not re.search(r'\b(index|indexed|pagination|limit|offset)\b', prompt_lower):
            opportunities.append({
                "category": "database_optimization",
                "description": "Large dataset query - ensure proper indexing and consider pagination/cursor-based iteration",
                "boost": 0.08,
                "savings": 100
            })

    return opportunities


def detect_security_patterns(prompt: str) -> List[Dict[str, Any]]:
    """
    Detect security-sensitive operations requiring extra scrutiny

    Patterns:
    1. Authentication/authorization - zen:codereview for security audit
    2. Input validation - User input without sanitization
    3. Credential management - API keys, passwords, secrets
    4. SQL injection risks - Dynamic query construction
    5. XSS risks - Rendering user content
    """
    opportunities = []
    prompt_lower = prompt.lower()

    # Pattern 1: Auth operations → zen:codereview
    auth_keywords = r'\b(auth|login|password|session|token|jwt|oauth|credential)\b'
    if re.search(auth_keywords, prompt_lower):
        opportunities.append({
            "category": "security",
            "description": "Authentication/authorization code - strongly recommend zen:codereview for security audit (OWASP compliance)",
            "boost": 0.15,
            "savings": 0  # Critical for security
        })

    # Pattern 2: Input validation
    input_keywords = r'\b(user input|form|request|parameter|query param|post data)\b'
    if re.search(input_keywords, prompt_lower):
        if not re.search(r'\b(validate|sanitize|escape|whitelist)\b', prompt_lower):
            opportunities.append({
                "category": "security",
                "description": "User input handling - implement validation, sanitization, and input whitelisting (prevent injection attacks)",
                "boost": 0.12,
                "savings": 0
            })

    # Pattern 3: Credential management
    secret_keywords = r'\b(api[_ ]key|secret|password|token|credentials?|private[_ ]key)\b'
    if re.search(secret_keywords, prompt_lower):
        if not re.search(r'\b(env|environment|vault|keychain|encrypt)\b', prompt_lower):
            opportunities.append({
                "category": "security",
                "description": "Credentials detected - use environment variables, secret management (vault), and never commit secrets to git",
                "boost": 0.10,
                "savings": 0
            })

    # Pattern 4: SQL injection risks
    sql_keywords = r'\b(sql|query|where|select.*from)\b'
    dynamic_keywords = r'\b(string|concat|template|interpolat|\$\{)\b'
    if re.search(sql_keywords, prompt_lower) and re.search(dynamic_keywords, prompt_lower):
        if not re.search(r'\b(prepared|parameterized|placeholder)\b', prompt_lower):
            opportunities.append({
                "category": "security",
                "description": "Dynamic SQL construction - use parameterized queries/prepared statements to prevent SQL injection",
                "boost": 0.13,
                "savings": 0
            })

    # Pattern 5: XSS risks
    render_keywords = r'\b(render|display|html|innerHTML|dangerouslySetInnerHTML)\b'
    if re.search(render_keywords, prompt_lower) and re.search(input_keywords, prompt_lower):
        if not re.search(r'\b(escape|sanitize|DOMPurify|xss)\b', prompt_lower):
            opportunities.append({
                "category": "security",
                "description": "Rendering user content - escape HTML entities or use DOMPurify to prevent XSS attacks",
                "boost": 0.11,
                "savings": 0
            })

    return opportunities


def detect_state_mutation_patterns(prompt: str) -> List[Dict[str, Any]]:
    """
    Detect state mutation operations requiring careful handling

    Patterns:
    1. State mutations without transactions
    2. Concurrent modifications without locking
    3. Side effects in pure functions
    4. Missing rollback strategy
    """
    opportunities = []
    prompt_lower = prompt.lower()

    # Pattern 1: State mutations without atomicity
    state_keywords = r'\b(state|redux|store|context|global)\b'
    mutation_keywords = r'\b(update|modify|change|set|mutate)\b'

    if re.search(state_keywords, prompt_lower) and re.search(mutation_keywords, prompt_lower):
        if not re.search(r'\b(transaction|atomic|immutable)\b', prompt_lower):
            opportunities.append({
                "category": "state_management",
                "description": "State mutations detected - ensure atomic updates and consider immutable data structures for consistency",
                "boost": 0.09,
                "savings": 0
            })

    # Pattern 2: Concurrent modifications
    concurrent_keywords = r'\b(concurrent|parallel|race|async|multi[- ]?thread)\b'
    concurrent_mutation_keywords = r'\b(update|modify|change|set|mutate|shared|access)\b'
    if re.search(concurrent_keywords, prompt_lower) and re.search(concurrent_mutation_keywords, prompt_lower):
        if not re.search(r'\b(lock|mutex|semaphore|optimistic)\b', prompt_lower):
            opportunities.append({
                "category": "state_management",
                "description": "Concurrent state modifications - implement locking mechanism or optimistic concurrency control",
                "boost": 0.10,
                "savings": 0
            })

    # Pattern 3: Rollback strategy for risky operations
    risky_keywords = r'\b(production|deploy|migration|irreversible)\b'
    if re.search(risky_keywords, prompt_lower) and re.search(mutation_keywords, prompt_lower):
        if not re.search(r'\b(rollback|backup|snapshot|restore)\b', prompt_lower):
            opportunities.append({
                "category": "state_management",
                "description": "Risky state changes - create backup/snapshot and define rollback strategy before proceeding",
                "boost": 0.14,
                "savings": 0  # Critical for safety
            })

    return opportunities


def detect_error_handling_patterns(prompt: str) -> List[Dict[str, Any]]:
    """
    Detect error handling and resilience opportunities

    Patterns:
    1. External operations without error handling
    2. Missing retry logic for transient failures
    3. No fallback for critical paths
    4. Silent failures
    """
    opportunities = []
    prompt_lower = prompt.lower()

    # Pattern 1: External operations without error handling
    external_keywords = r'\b(api|network|file|database|external|remote)\b'
    operation_keywords = r'\b(read|write|fetch|call|request|query)\b'

    if re.search(external_keywords, prompt_lower) and re.search(operation_keywords, prompt_lower):
        if not re.search(r'\b(try|catch|error|exception|handle)\b', prompt_lower):
            opportunities.append({
                "category": "error_handling",
                "description": "External operations detected - add try/catch blocks and error handling for network failures, timeouts",
                "boost": 0.08,
                "savings": 0
            })

    # Pattern 2: Retry logic for transient failures
    if re.search(external_keywords, prompt_lower):
        if not re.search(r'\b(retry|exponential backoff|jitter)\b', prompt_lower):
            opportunities.append({
                "category": "error_handling",
                "description": "External dependencies - implement retry logic with exponential backoff for transient failures",
                "boost": 0.07,
                "savings": 0
            })

    # Pattern 3: Fallback for critical paths
    critical_keywords = r'\b(critical|essential|required|must|production)\b'
    critical_operation_keywords = r'\b(implement|build|create|process|handle|operation|system|service)\b'
    if re.search(critical_keywords, prompt_lower) and re.search(critical_operation_keywords, prompt_lower):
        if not re.search(r'\b(fallback|default|degraded|graceful)\b', prompt_lower):
            opportunities.append({
                "category": "error_handling",
                "description": "Critical path detected - define fallback behavior and graceful degradation strategy",
                "boost": 0.09,
                "savings": 0
            })

    return opportunities


def get_all_enhanced_patterns(prompt: str) -> List[Dict[str, Any]]:
    """
    Aggregate all enhanced pattern detections

    Returns top patterns sorted by confidence boost (most impactful first)
    """
    all_patterns = []

    all_patterns.extend(detect_api_patterns(prompt))
    all_patterns.extend(detect_database_patterns(prompt))
    all_patterns.extend(detect_security_patterns(prompt))
    all_patterns.extend(detect_state_mutation_patterns(prompt))
    all_patterns.extend(detect_error_handling_patterns(prompt))

    # Sort by confidence boost (descending) - prioritize most impactful
    all_patterns.sort(key=lambda x: x["boost"], reverse=True)

    return all_patterns


if __name__ == "__main__":
    # Test patterns with sample prompts
    test_prompts = [
        "Loop through all users and fetch their posts from the API",
        "Add authentication with password validation",
        "Update user records in the database based on form input",
        "Make API calls to external service for data sync",
        "Modify the global state when user clicks button"
    ]

    for prompt in test_prompts:
        print(f"\n{'='*60}")
        print(f"Prompt: {prompt}")
        print(f"{'='*60}")
        patterns = get_all_enhanced_patterns(prompt)
        for i, pattern in enumerate(patterns, 1):
            print(f"{i}. [{pattern['category']}] {pattern['description']}")
            print(f"   Boost: +{pattern['boost']:.2f} | Savings: {pattern['savings']}s")
