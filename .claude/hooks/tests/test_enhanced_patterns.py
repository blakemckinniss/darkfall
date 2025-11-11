#!/usr/bin/env python3
"""
Unit tests for enhanced_patterns.py (Phase 1.5)

Tests all pattern detection functions:
- API patterns (rate limiting, batching, caching, retry)
- Database patterns (N+1, transactions, bulk ops, indexes)
- Security patterns (auth, validation, credentials, injection, XSS)
- State mutation patterns (atomicity, concurrency, rollback)
- Error handling patterns (external ops, retries, fallbacks)
"""
import sys
import os

# Add lib directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lib'))

from enhanced_patterns import (
    detect_api_patterns,
    detect_database_patterns,
    detect_security_patterns,
    detect_state_mutation_patterns,
    detect_error_handling_patterns,
    get_all_enhanced_patterns
)


class TestAPIPatterns:
    """Test API optimization pattern detection"""

    def test_rate_limiting_detection(self):
        """Should detect multiple API calls needing rate limiting"""
        prompt = "Make API calls for each user to fetch their profile data"
        patterns = detect_api_patterns(prompt)

        assert len(patterns) > 0, "Should detect rate limiting opportunity"
        assert any("rate limit" in p["description"].lower() for p in patterns)
        print("✓ Rate limiting detection works")

    def test_batch_request_detection(self):
        """Should detect loop + API call = batching opportunity"""
        prompt = "Loop through all customers and call the API to get order history"
        patterns = detect_api_patterns(prompt)

        assert any("batch" in p["description"].lower() for p in patterns)
        print("✓ Batch request detection works")

    def test_caching_detection(self):
        """Should detect repeated API calls for caching"""
        prompt = "Make repeated API requests for the same user data multiple times"
        patterns = detect_api_patterns(prompt)

        assert any("cach" in p["description"].lower() for p in patterns)
        print("✓ Caching detection works")

    def test_retry_logic_detection(self):
        """Should detect external API without retry logic"""
        prompt = "Integrate with third-party payment API for processing transactions"
        patterns = detect_api_patterns(prompt)

        assert any("retry" in p["description"].lower() for p in patterns)
        print("✓ Retry logic detection works")

    def test_no_false_positives(self):
        """Should not trigger on non-API prompts"""
        prompt = "Update the user interface colors and fonts"
        patterns = detect_api_patterns(prompt)

        assert len(patterns) == 0, "Should not detect API patterns in UI work"
        print("✓ No false positives for non-API work")


class TestDatabasePatterns:
    """Test database optimization pattern detection"""

    def test_n_plus_one_detection(self):
        """Should detect N+1 query pattern"""
        prompt = "Loop through users and query their posts from database"
        patterns = detect_database_patterns(prompt)

        assert len(patterns) > 0, "Should detect N+1 pattern"
        assert any("n+1" in p["description"].lower() or "join" in p["description"].lower() for p in patterns)
        print("✓ N+1 query detection works")

    def test_transaction_safety(self):
        """Should detect mutations without transactions"""
        prompt = "Update user records and delete old entries from database"
        patterns = detect_database_patterns(prompt)

        assert any("transaction" in p["description"].lower() for p in patterns)
        print("✓ Transaction safety detection works")

    def test_bulk_operations(self):
        """Should detect individual ops in loop"""
        prompt = "Loop through records and insert each one into the database"
        patterns = detect_database_patterns(prompt)

        assert any("bulk" in p["description"].lower() for p in patterns)
        print("✓ Bulk operation detection works")

    def test_index_awareness(self):
        """Should detect large queries without indexes"""
        prompt = "Query all millions of records from the database"
        patterns = detect_database_patterns(prompt)

        assert any("index" in p["description"].lower() or "pagination" in p["description"].lower() for p in patterns)
        print("✓ Index awareness detection works")


class TestSecurityPatterns:
    """Test security pattern detection"""

    def test_auth_security_audit(self):
        """Should recommend zen:codereview for auth"""
        prompt = "Implement login with password authentication"
        patterns = detect_security_patterns(prompt)

        assert len(patterns) > 0, "Should detect auth security concern"
        assert any("auth" in p["description"].lower() for p in patterns)
        print("✓ Auth security audit detection works")

    def test_input_validation(self):
        """Should detect user input without validation"""
        prompt = "Process user input from the form and store in database"
        patterns = detect_security_patterns(prompt)

        assert any("validat" in p["description"].lower() or "sanitiz" in p["description"].lower() for p in patterns)
        print("✓ Input validation detection works")

    def test_credential_management(self):
        """Should warn about API keys and secrets"""
        prompt = "Add API key configuration for the external service"
        patterns = detect_security_patterns(prompt)

        assert any("credential" in p["description"].lower() or "secret" in p["description"].lower() for p in patterns)
        print("✓ Credential management detection works")

    def test_sql_injection_prevention(self):
        """Should detect dynamic SQL construction"""
        prompt = "Build SQL query with string concatenation from user input"
        patterns = detect_security_patterns(prompt)

        assert any("sql injection" in p["description"].lower() or "parameter" in p["description"].lower() for p in patterns)
        print("✓ SQL injection prevention detection works")

    def test_xss_prevention(self):
        """Should detect rendering user content"""
        prompt = "Render user input as HTML using innerHTML"
        patterns = detect_security_patterns(prompt)

        assert any("xss" in p["description"].lower() or "escape" in p["description"].lower() for p in patterns)
        print("✓ XSS prevention detection works")


class TestStateMutationPatterns:
    """Test state mutation pattern detection"""

    def test_atomic_state_updates(self):
        """Should detect state mutations without atomicity"""
        prompt = "Update global state when user clicks the button"
        patterns = detect_state_mutation_patterns(prompt)

        assert len(patterns) > 0, "Should detect state mutation concern"
        assert any("atomic" in p["description"].lower() or "immutable" in p["description"].lower() for p in patterns)
        print("✓ Atomic state update detection works")

    def test_concurrent_modifications(self):
        """Should detect concurrent state changes"""
        prompt = "Handle concurrent updates to shared state in multi-threaded environment"
        patterns = detect_state_mutation_patterns(prompt)

        assert any("lock" in p["description"].lower() or "concurren" in p["description"].lower() for p in patterns)
        print("✓ Concurrent modification detection works")

    def test_rollback_strategy(self):
        """Should detect risky changes without rollback"""
        prompt = "Deploy production changes to modify the database state"
        patterns = detect_state_mutation_patterns(prompt)

        assert any("rollback" in p["description"].lower() or "backup" in p["description"].lower() for p in patterns)
        print("✓ Rollback strategy detection works")


class TestErrorHandlingPatterns:
    """Test error handling pattern detection"""

    def test_external_error_handling(self):
        """Should detect external ops without error handling"""
        prompt = "Read file from disk and fetch data from API"
        patterns = detect_error_handling_patterns(prompt)

        assert len(patterns) > 0, "Should detect error handling need"
        assert any("error" in p["description"].lower() or "try" in p["description"].lower() for p in patterns)
        print("✓ External error handling detection works")

    def test_retry_logic(self):
        """Should suggest retry for external deps"""
        prompt = "Call external API endpoint for data synchronization"
        patterns = detect_error_handling_patterns(prompt)

        assert any("retry" in p["description"].lower() for p in patterns)
        print("✓ Retry logic suggestion works")

    def test_fallback_for_critical(self):
        """Should suggest fallback for critical paths"""
        prompt = "Implement critical production payment processing"
        patterns = detect_error_handling_patterns(prompt)

        assert any("fallback" in p["description"].lower() or "degraded" in p["description"].lower() for p in patterns)
        print("✓ Fallback suggestion works")


class TestIntegration:
    """Test integration and sorting"""

    def test_get_all_patterns_sorting(self):
        """Should aggregate and sort by boost"""
        prompt = "Loop through users and call API, then update database with password authentication"
        patterns = get_all_enhanced_patterns(prompt)

        assert len(patterns) > 0, "Should detect multiple patterns"

        # Verify sorting (highest boost first)
        boosts = [p["boost"] for p in patterns]
        assert boosts == sorted(boosts, reverse=True), "Should be sorted by boost descending"
        print(f"✓ Pattern aggregation and sorting works ({len(patterns)} patterns detected)")

    def test_complex_scenario(self):
        """Test comprehensive scenario with multiple patterns"""
        prompt = """
        Implement user authentication system:
        - Loop through all users and fetch their profiles from API
        - Store credentials in database with SQL queries
        - Handle user input from login form
        - Update global session state
        - Integrate with third-party OAuth provider
        """
        patterns = get_all_enhanced_patterns(prompt)

        # Should detect multiple categories
        categories = {p["category"] for p in patterns}
        assert "security" in categories, "Should detect security concerns"
        assert "api_optimization" in categories or "database_optimization" in categories, "Should detect API or DB patterns"

        print(f"✓ Complex scenario detection works ({len(patterns)} patterns, {len(categories)} categories)")

    def test_no_patterns_on_simple_task(self):
        """Should not detect patterns on simple tasks"""
        prompt = "Fix typo in variable name"
        patterns = get_all_enhanced_patterns(prompt)

        assert len(patterns) == 0, "Should not detect patterns for simple tasks"
        print("✓ No false positives on simple tasks")


def run_all_tests():
    """Run all test classes"""
    test_classes = [
        TestAPIPatterns,
        TestDatabasePatterns,
        TestSecurityPatterns,
        TestStateMutationPatterns,
        TestErrorHandlingPatterns,
        TestIntegration
    ]

    total_tests = 0
    passed_tests = 0

    for test_class in test_classes:
        print(f"\n{'='*60}")
        print(f"Running {test_class.__name__}")
        print(f"{'='*60}")

        # Get all test methods
        test_methods = [
            getattr(test_class, method)
            for method in dir(test_class)
            if method.startswith("test_")
        ]

        instance = test_class()
        for test_method in test_methods:
            total_tests += 1
            try:
                test_method(instance)
                passed_tests += 1
            except AssertionError as e:
                print(f"✗ {test_method.__name__} FAILED: {e}")
            except Exception as e:
                print(f"✗ {test_method.__name__} ERROR: {e}")

    print(f"\n{'='*60}")
    print(f"Test Results: {passed_tests}/{total_tests} passed")
    print(f"{'='*60}")

    return passed_tests == total_tests


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
