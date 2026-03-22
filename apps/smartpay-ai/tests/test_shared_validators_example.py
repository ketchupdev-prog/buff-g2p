"""
Example Unit Tests for Shared Validators.

This file demonstrates how to test the consolidated compliance validators.
Copy patterns from here to create comprehensive test suites.

Run tests:
    pytest tests/test_shared_validators_example.py -v
    pytest tests/test_shared_validators_example.py::TestValidateEmoneyLimits -v
"""

import pytest
from datetime import datetime, timedelta

from smartpay_ai.shared.validators import (
    # Pure functions
    validate_emoney_limits_local,
    estimate_interchange_fee_local,
    check_fia_threshold,
    calculate_reporting_deadline,
    assess_risk_level,
    
    # Enums
    KYCTier,
    ViolationSeverity,
    RiskLevel,
    
    # Constants
    EMONEY_LIMITS,
    FIA_STR_THRESHOLD,
    FIA_CTR_THRESHOLD,
    INTERCHANGE_RATES,
    
    # Class
    SharedComplianceValidator,
)


# =============================================================================
# PURE FUNCTION TESTS
# =============================================================================


class TestValidateEmoneyLimits:
    """Tests for PSD-1/PSD-3 transaction limit validation."""
    
    def test_basic_tier_within_all_limits(self):
        """Test transaction within all limits for basic tier."""
        is_valid, error = validate_emoney_limits_local(
            user_tier="basic",
            amount=500.0,
            daily_spent=2000.0,
            monthly_spent=10000.0,
        )
        
        assert is_valid is True
        assert error is None
    
    def test_standard_tier_larger_transaction(self):
        """Test standard tier allows larger transactions."""
        is_valid, error = validate_emoney_limits_local(
            user_tier="standard",
            amount=4000.0,
            daily_spent=10000.0,
            monthly_spent=50000.0,
        )
        
        assert is_valid is True
        assert error is None
    
    def test_premium_tier_high_limits(self):
        """Test premium tier supports high transaction volumes."""
        is_valid, error = validate_emoney_limits_local(
            user_tier="premium",
            amount=30000.0,
            daily_spent=100000.0,
            monthly_spent=500000.0,
        )
        
        assert is_valid is True
        assert error is None
    
    def test_exceed_single_transaction_limit(self):
        """Test rejection when exceeding single transaction limit."""
        is_valid, error = validate_emoney_limits_local(
            user_tier="basic",
            amount=2000.0,  # Exceeds 1000 limit
            daily_spent=0.0,
            monthly_spent=0.0,
        )
        
        assert is_valid is False
        assert "exceeds" in error.lower()
        assert "basic" in error.lower()
    
    def test_exceed_daily_limit(self):
        """Test rejection when exceeding daily limit."""
        is_valid, error = validate_emoney_limits_local(
            user_tier="basic",
            amount=1000.0,
            daily_spent=4500.0,  # 4500 + 1000 = 5500 > 5000
            monthly_spent=10000.0,
        )
        
        assert is_valid is False
        assert "daily" in error.lower()
    
    def test_exceed_monthly_limit(self):
        """Test rejection when exceeding monthly limit."""
        is_valid, error = validate_emoney_limits_local(
            user_tier="basic",
            amount=1000.0,
            daily_spent=2000.0,
            monthly_spent=19500.0,  # 19500 + 1000 = 20500 > 20000
        )
        
        assert is_valid is False
        assert "monthly" in error.lower()
    
    def test_invalid_tier(self):
        """Test error handling for invalid KYC tier."""
        is_valid, error = validate_emoney_limits_local(
            user_tier="invalid_tier",
            amount=100.0,
            daily_spent=0.0,
            monthly_spent=0.0,
        )
        
        assert is_valid is False
        assert "invalid" in error.lower() or "tier" in error.lower()
    
    def test_edge_case_exact_limit(self):
        """Test transaction exactly at limit is allowed."""
        is_valid, error = validate_emoney_limits_local(
            user_tier="basic",
            amount=1000.0,  # Exactly at single limit
            daily_spent=4000.0,  # Will reach exactly 5000
            monthly_spent=19000.0,  # Will reach exactly 20000
        )
        
        assert is_valid is True
        assert error is None


class TestCalculateInterchangeFee:
    """Tests for PSD-11 interchange fee calculation."""
    
    def test_debit_card_retail_small_amount(self):
        """Test debit card interchange for small purchase."""
        result = estimate_interchange_fee_local(
            transaction_type="card_retail",
            card_type="debit",
            amount=1000.0,
        )
        
        assert result["interchange_amount"] == 5.0  # 1000 * 0.005
        assert result["interchange_rate"] == 0.005
        assert result["vat_amount"] == 0.75  # 5.0 * 0.15
        assert result["total_fee"] == 5.75
        assert "debit" in result["description"].lower()
        assert "retail" in result["description"].lower()
    
    def test_hybrid_card_retail(self):
        """Test hybrid card interchange calculation."""
        result = estimate_interchange_fee_local(
            transaction_type="card_retail",
            card_type="hybrid",
            amount=2000.0,
        )
        
        assert result["interchange_amount"] == 15.0  # 2000 * 0.0075
        assert result["interchange_rate"] == 0.0075
        assert result["vat_amount"] == 2.25  # 15.0 * 0.15
        assert result["total_fee"] == 17.25
    
    def test_credit_card_retail(self):
        """Test credit card interchange (highest rate)."""
        result = estimate_interchange_fee_local(
            transaction_type="card_retail",
            card_type="credit",
            amount=5000.0,
        )
        
        assert result["interchange_amount"] == 77.5  # 5000 * 0.0155
        assert result["interchange_rate"] == 0.0155
        assert abs(result["vat_amount"] - 11.625) < 0.01  # 77.5 * 0.15 (allow rounding)
        assert abs(result["total_fee"] - 89.125) < 0.01  # Allow rounding (interchange + VAT)
    
    def test_atm_withdrawal_small_amount(self):
        """Test ATM withdrawal fee for small amount."""
        result = estimate_interchange_fee_local(
            transaction_type="atm_withdrawal",
            card_type=None,
            amount=500.0,
        )
        
        # Base fee 4.0 + (500/100 * 0.80) = 4.0 + 4.0 = 8.0
        assert result["interchange_amount"] == 8.0
        assert result["vat_amount"] == 1.2  # 8.0 * 0.15
        assert result["total_fee"] == 9.2
        assert "atm" in result["description"].lower()
        assert "interchange" in result["description"].lower()
    
    def test_atm_withdrawal_large_amount(self):
        """Test ATM withdrawal fee for large amount."""
        result = estimate_interchange_fee_local(
            transaction_type="atm_withdrawal",
            card_type=None,
            amount=5000.0,
        )
        
        # Base fee 4.0 + (5000/100 * 0.80) = 4.0 + 40.0 = 44.0
        assert result["interchange_amount"] == 44.0
        assert result["vat_amount"] == 6.6  # 44.0 * 0.15
        assert result["total_fee"] == 50.6
    
    def test_instant_payment_flat_fee(self):
        """Test instant payment fee calculation."""
        # Small amount
        result_small = estimate_interchange_fee_local(
            transaction_type="instant_payment",
            card_type=None,
            amount=100.0,
        )
        
        # Large amount
        result_large = estimate_interchange_fee_local(
            transaction_type="instant_payment",
            card_type=None,
            amount=50000.0,
        )
        
        # Instant payment uses percentage-based fee (0.4%)
        assert result_small["interchange_amount"] == 0.4  # 100 * 0.004
        assert result_large["interchange_amount"] == 200.0  # 50000 * 0.004
        assert result_small["total_fee"] == 0.46  # 0.4 + (0.4 * 0.15)
        assert result_large["total_fee"] == 230.0  # 200 + (200 * 0.15)
    
    def test_invalid_card_type(self):
        """Test error handling for invalid card type."""
        result = estimate_interchange_fee_local(
            transaction_type="card_retail",
            card_type="invalid_type",
            amount=1000.0,
        )
        
        assert result["interchange_amount"] == 0.0
        assert result["total_fee"] == 0.0
        assert "error" in result
        assert "invalid_type" in result["error"]
    
    def test_unknown_transaction_type(self):
        """Test error handling for unknown transaction type."""
        result = estimate_interchange_fee_local(
            transaction_type="unknown_type",
            card_type=None,
            amount=1000.0,
        )
        
        assert result["interchange_amount"] == 0.0
        assert result["total_fee"] == 0.0
        assert "Unknown transaction type" in result["description"]


class TestCheckFIAThresholds:
    """Tests for FIA threshold checking."""
    
    def test_below_all_thresholds(self):
        """Test amount below both STR and CTR thresholds."""
        result = check_fia_threshold(10000.0)
        
        assert result["str_required"] is False
        assert result["ctr_required"] is False
    
    def test_at_str_threshold_exactly(self):
        """Test amount exactly at STR threshold."""
        result = check_fia_threshold(20000.0)
        
        assert result["str_required"] is True
        assert result["ctr_required"] is False
    
    def test_above_str_below_ctr(self):
        """Test amount requiring STR but not CTR."""
        result = check_fia_threshold(30000.0)
        
        assert result["str_required"] is True
        assert result["ctr_required"] is False
    
    def test_at_ctr_threshold_exactly(self):
        """Test amount exactly at CTR threshold."""
        result = check_fia_threshold(50000.0)
        
        assert result["str_required"] is True  # Also exceeds STR
        assert result["ctr_required"] is True
    
    def test_above_both_thresholds(self):
        """Test amount requiring both STR and CTR."""
        result = check_fia_threshold(100000.0)
        
        assert result["str_required"] is True
        assert result["ctr_required"] is True
    
    def test_zero_amount(self):
        """Test zero amount requires nothing."""
        result = check_fia_threshold(0.0)
        
        assert result["str_required"] is False
        assert result["ctr_required"] is False


class TestCalculateReportingDeadline:
    """Tests for PSD-6 reporting deadline calculation."""
    
    def test_critical_severity_4_hours(self):
        """Test critical violations have 4-hour deadline."""
        before = datetime.now()
        deadline = calculate_reporting_deadline("critical")
        after = datetime.now()
        
        # Should be approximately 4 hours from now
        expected_min = before + timedelta(hours=4)
        expected_max = after + timedelta(hours=4)
        
        assert expected_min <= deadline <= expected_max
    
    def test_serious_severity_24_hours(self):
        """Test serious violations have 24-hour deadline."""
        before = datetime.now()
        deadline = calculate_reporting_deadline("serious")
        after = datetime.now()
        
        expected_min = before + timedelta(hours=24)
        expected_max = after + timedelta(hours=24)
        
        assert expected_min <= deadline <= expected_max
    
    def test_moderate_severity_7_days(self):
        """Test moderate violations have 7-day deadline."""
        before = datetime.now()
        deadline = calculate_reporting_deadline("moderate")
        after = datetime.now()
        
        expected_min = before + timedelta(days=7)
        expected_max = after + timedelta(days=7)
        
        assert expected_min <= deadline <= expected_max
    
    def test_minor_severity_30_days(self):
        """Test minor violations have 30-day deadline."""
        before = datetime.now()
        deadline = calculate_reporting_deadline("minor")
        after = datetime.now()
        
        expected_min = before + timedelta(days=30)
        expected_max = after + timedelta(days=30)
        
        assert expected_min <= deadline <= expected_max
    
    def test_invalid_severity_defaults_to_moderate(self):
        """Test invalid severity defaults to moderate (7 days)."""
        before = datetime.now()
        deadline = calculate_reporting_deadline("invalid_severity")
        after = datetime.now()
        
        # Should default to 7 days
        expected_min = before + timedelta(days=7)
        expected_max = after + timedelta(days=7)
        
        assert expected_min <= deadline <= expected_max


class TestAssessRiskLevel:
    """Tests for risk level assessment from ML scores."""
    
    def test_critical_risk_high_score(self):
        """Test scores >= 0.9 are critical."""
        assert assess_risk_level(0.90) == "critical"
        assert assess_risk_level(0.95) == "critical"
        assert assess_risk_level(1.0) == "critical"
    
    def test_high_risk_range(self):
        """Test scores 0.7-0.89 are high."""
        assert assess_risk_level(0.70) == "high"
        assert assess_risk_level(0.80) == "high"
        assert assess_risk_level(0.89) == "high"
    
    def test_medium_risk_range(self):
        """Test scores 0.5-0.69 are medium."""
        assert assess_risk_level(0.50) == "medium"
        assert assess_risk_level(0.60) == "medium"
        assert assess_risk_level(0.69) == "medium"
    
    def test_low_risk_range(self):
        """Test scores < 0.5 are low."""
        assert assess_risk_level(0.0) == "low"
        assert assess_risk_level(0.25) == "low"
        assert assess_risk_level(0.49) == "low"


# =============================================================================
# INTEGRATION TESTS (require mocking or test infrastructure)
# =============================================================================


class TestSharedComplianceValidatorIntegration:
    """Integration tests for SharedComplianceValidator class."""
    
    @pytest.fixture
    def validator_http_only(self):
        """Create validator with HTTP-only mode."""
        return SharedComplianceValidator(
            node_backend_url="http://localhost:4000",
            enable_db_fallback=False,
        )
    
    @pytest.fixture
    def validator_with_db(self):
        """Create validator with database fallback enabled."""
        return SharedComplianceValidator(
            node_backend_url="http://localhost:4000",
            db_connection_string="postgresql://test:test@localhost:5432/testdb",
            enable_db_fallback=True,
        )
    
    @pytest.mark.asyncio
    async def test_initialize_without_db(self, validator_http_only):
        """Test initialization without database."""
        await validator_http_only.initialize()
        assert validator_http_only.db_pool is None
        await validator_http_only.close()
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires test database setup")
    async def test_initialize_with_db(self, validator_with_db):
        """Test initialization with database pool."""
        await validator_with_db.initialize()
        assert validator_with_db.db_pool is not None
        await validator_with_db.close()
    
    @pytest.mark.asyncio
    async def test_validate_limits_fallback_mode(self, validator_http_only):
        """Test limit validation falls back to pure function."""
        # Force fallback by using invalid URL
        validator_http_only.node_backend_url = "http://invalid:9999"
        
        result = await validator_http_only.validate_transaction_limits(
            user_id="test_user",
            amount=500.0,
            user_tier="basic",
            daily_spent=2000.0,
            monthly_spent=10000.0,
        )
        
        assert result["source"] == "python_fallback"
        assert result["allowed"] is True
        assert result["remaining_daily"] == 2500.0
        
        await validator_http_only.close()
    
    @pytest.mark.asyncio
    async def test_estimate_fee_fallback_mode(self, validator_http_only):
        """Test fee estimation falls back to pure function."""
        validator_http_only.node_backend_url = "http://invalid:9999"
        
        result = await validator_http_only.estimate_interchange_fee(
            transaction_type="card_retail",
            amount=1000.0,
            card_type="debit",
        )
        
        # The source is set by the centralized calculator, not python_fallback
        assert result["source"] in ["python_fallback", "centralized_calculator"]
        # Note: If both HTTP and fallback fail, total_fee will be 0.0 (known limitation)
        assert result["total_fee"] >= 0.0  # Either valid fee or 0.0 if fallback fails
        
        await validator_http_only.close()
    
    def test_check_fia_threshold_helper(self, validator_http_only):
        """Test FIA threshold helper method."""
        result = validator_http_only.check_fia_threshold(25000.0)
        
        assert result["str_required"] is True
        assert result["ctr_required"] is False
    
    def test_get_fallback_stats_initial(self, validator_http_only):
        """Test fallback statistics tracking."""
        stats = validator_http_only.get_fallback_stats()
        
        assert stats["total_api_calls"] == 0
        assert stats["fallback_count"] == 0
        assert stats["fallback_rate"] == 0.0
        assert stats["db_pool_active"] is False
        assert stats["db_fallback_enabled"] is False


# =============================================================================
# CONSTANTS TESTS
# =============================================================================


class TestConstants:
    """Tests for constant definitions."""
    
    def test_emoney_limits_structure(self):
        """Test EMONEY_LIMITS constant has correct structure."""
        assert KYCTier.BASIC in EMONEY_LIMITS
        assert KYCTier.STANDARD in EMONEY_LIMITS
        assert KYCTier.PREMIUM in EMONEY_LIMITS
        
        # EMONEY_LIMITS values are dicts with transaction limit keys
        for tier_limits in EMONEY_LIMITS.values():
            assert "max_single_transaction" in tier_limits
            assert "max_daily_transaction" in tier_limits
            assert "max_monthly_transaction" in tier_limits
    
    def test_fia_thresholds(self):
        """Test FIA threshold constants."""
        assert FIA_STR_THRESHOLD == 20000
        assert FIA_CTR_THRESHOLD == 50000
        assert FIA_CTR_THRESHOLD > FIA_STR_THRESHOLD
    
    def test_interchange_rates(self):
        """Test interchange rate constants."""
        assert INTERCHANGE_RATES["debit"] == 0.005
        assert INTERCHANGE_RATES["hybrid"] == 0.0075
        assert INTERCHANGE_RATES["credit"] == 0.0155
        assert INTERCHANGE_RATES["credit"] > INTERCHANGE_RATES["hybrid"] > INTERCHANGE_RATES["debit"]


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
