"""Generate synthetic Namibian G2P training data for 7 ML models.

Usage:
    cd buffr && python -m buffr_ai.data.generate_g2p_data

Generates 7 CSV files in buffr_ai/data/:
    churn_data.csv           (8,000 user records)
    nps_data.csv             (5,000 user records)
    adoption_data.csv        (6,000 user records)
    beneficiary_segments.csv (4,000 beneficiary records)
    voucher_forecast.csv     (8,000 voucher records)
    agent_demand.csv         (3,000 region-day records)
    expiry_risk.csv          (6,000 voucher records)
"""

import numpy as np
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent

NAMIBIAN_REGIONS = [
    "Khomas", "Erongo", "Oshana", "Omusati", "Ohangwena",
    "Oshikoto", "Kavango East", "Kavango West", "Zambezi",
    "Kunene", "Otjozondjupa", "Omaheke", "Hardap", "Karas",
]

GRANT_TYPES = ["old_age", "disability", "child", "foster_care", "veterans"]
GRANT_AMOUNTS = {
    "old_age": 1400, "disability": 1400, "child": 300,
    "foster_care": 300, "veterans": 1400,
}

REDEMPTION_CHANNELS = ["wallet", "cash_out", "bank_transfer", "merchant_payment", "cash_at_till"]

# Region weights (population-weighted)
REGION_WEIGHTS = [0.18, 0.09, 0.10, 0.10, 0.09, 0.07, 0.06, 0.04, 0.04, 0.04, 0.06, 0.03, 0.05, 0.05]


def _region_sample(rng: np.random.Generator, n: int) -> np.ndarray:
    return rng.choice(NAMIBIAN_REGIONS, size=n, p=REGION_WEIGHTS)


def _grant_type_sample(rng: np.random.Generator, n: int) -> np.ndarray:
    return rng.choice(GRANT_TYPES, size=n, p=[0.35, 0.20, 0.25, 0.10, 0.10])


def generate_churn_data(n: int = 8000, seed: int = 42) -> pd.DataFrame:
    """Generate churn prediction training data (user-level)."""
    rng = np.random.default_rng(seed)

    # Base features
    account_age_days = rng.integers(30, 1200, size=n)
    region = _region_sample(rng, n)

    # Active users have more transactions
    base_activity = rng.beta(2, 3, size=n)  # skewed toward lower activity
    tx_count_30d = (base_activity * 30).astype(int)
    tx_count_60d = tx_count_30d + rng.integers(0, 15, size=n)
    tx_count_trend = np.where(tx_count_60d > 0, tx_count_30d / np.maximum(tx_count_60d, 1), 0.5)

    days_since_last_tx = np.where(
        tx_count_30d > 0,
        rng.integers(0, 30, size=n),
        rng.integers(30, 180, size=n),
    )

    voucher_redemption_count_30d = (base_activity * 4).astype(int)
    days_since_last_redemption = np.where(
        voucher_redemption_count_30d > 0,
        rng.integers(0, 45, size=n),
        rng.integers(30, 200, size=n),
    )

    avg_tx_amount_30d = rng.lognormal(6.5, 0.8, size=n).clip(50, 5000)
    notification_read_rate = rng.beta(3, 2, size=n)
    wallet_balance_trend = rng.normal(0, 0.3, size=n).clip(-1, 1)
    login_frequency_30d = (base_activity * 25).astype(int)
    session_count_30d = login_frequency_30d + rng.integers(0, 5, size=n)
    unique_merchants_30d = (base_activity * 10).astype(int)
    has_savings_goal = rng.choice([0, 1], size=n, p=[0.6, 0.4])
    has_active_autopay = rng.choice([0, 1], size=n, p=[0.7, 0.3])

    # Churn label: correlated with low activity
    churn_score = (
        -0.3 * tx_count_trend
        + 0.4 * (days_since_last_tx / 180)
        - 0.2 * notification_read_rate
        - 0.1 * has_savings_goal
        + rng.normal(0, 0.15, size=n)
    )
    is_churned = (churn_score > 0.2).astype(int)

    # Region encoding
    region_map = {r: i for i, r in enumerate(NAMIBIAN_REGIONS)}
    region_encoded = np.array([region_map[r] for r in region])

    return pd.DataFrame({
        "user_id": [f"USR_{i:05d}" for i in range(n)],
        "tx_count_30d": tx_count_30d,
        "tx_count_trend": np.round(tx_count_trend, 4),
        "days_since_last_tx": days_since_last_tx,
        "voucher_redemption_count_30d": voucher_redemption_count_30d,
        "days_since_last_redemption": days_since_last_redemption,
        "avg_tx_amount_30d": np.round(avg_tx_amount_30d, 2),
        "notification_read_rate": np.round(notification_read_rate, 4),
        "wallet_balance_trend": np.round(wallet_balance_trend, 4),
        "login_frequency_30d": login_frequency_30d,
        "session_count_30d": session_count_30d,
        "unique_merchants_30d": unique_merchants_30d,
        "has_savings_goal": has_savings_goal,
        "has_active_autopay": has_active_autopay,
        "account_age_days": account_age_days,
        "region_encoded": region_encoded,
        "is_churned": is_churned,
    })


def generate_nps_data(n: int = 5000, seed: int = 43) -> pd.DataFrame:
    """Generate NPS / satisfaction scoring data (user-level, regression)."""
    rng = np.random.default_rng(seed)

    tx_success_rate = rng.beta(8, 1.5, size=n)  # most are high
    avg_response_time_ms = rng.lognormal(6.5, 0.5, size=n).clip(100, 10000)
    support_ticket_count_30d = rng.poisson(0.5, size=n)
    complaint_count_90d = rng.poisson(0.3, size=n)
    notification_read_rate = rng.beta(3, 2, size=n)
    feature_adoption_score = rng.beta(2, 2, size=n)
    session_frequency = rng.poisson(8, size=n)
    tx_volume_30d = rng.lognormal(8, 1, size=n).clip(100, 50000)
    failed_tx_count_30d = rng.poisson(0.3, size=n)
    days_since_last_complaint = rng.integers(0, 365, size=n)
    onboarding_complete = rng.choice([0, 1], size=n, p=[0.15, 0.85])
    account_age_days = rng.integers(30, 1000, size=n)

    # NPS score: correlated with quality signals
    nps_base = (
        30 * tx_success_rate
        + 15 * feature_adoption_score
        + 10 * notification_read_rate
        - 5 * support_ticket_count_30d
        - 8 * complaint_count_90d
        - 5 * (avg_response_time_ms / 10000)
        + 5 * onboarding_complete
        + rng.normal(0, 8, size=n)
    )
    nps_score = np.clip(nps_base, 0, 100).astype(int)

    return pd.DataFrame({
        "user_id": [f"USR_{i:05d}" for i in range(n)],
        "tx_success_rate": np.round(tx_success_rate, 4),
        "avg_response_time_ms": np.round(avg_response_time_ms, 1),
        "support_ticket_count_30d": support_ticket_count_30d,
        "complaint_count_90d": complaint_count_90d,
        "notification_read_rate": np.round(notification_read_rate, 4),
        "feature_adoption_score": np.round(feature_adoption_score, 4),
        "session_frequency": session_frequency,
        "tx_volume_30d": np.round(tx_volume_30d, 2),
        "failed_tx_count_30d": failed_tx_count_30d,
        "days_since_last_complaint": days_since_last_complaint,
        "onboarding_complete": onboarding_complete,
        "account_age_days": account_age_days,
        "nps_score": nps_score,
    })


def generate_adoption_data(n: int = 6000, seed: int = 44) -> pd.DataFrame:
    """Generate digital adoption / usage analytics data (user-level)."""
    rng = np.random.default_rng(seed)

    # Feature usage flags — correlated via a latent "digital savvy" factor
    digital_savvy = rng.beta(2, 3, size=n)

    has_used_send_money = (rng.random(n) < (0.3 + 0.6 * digital_savvy)).astype(int)
    has_used_bill_pay = (rng.random(n) < (0.15 + 0.5 * digital_savvy)).astype(int)
    has_used_savings = (rng.random(n) < (0.10 + 0.5 * digital_savvy)).astype(int)
    has_used_groups = (rng.random(n) < (0.08 + 0.4 * digital_savvy)).astype(int)
    has_used_qr_pay = (rng.random(n) < (0.10 + 0.5 * digital_savvy)).astype(int)
    has_used_ussd = (rng.random(n) < (0.20 + 0.3 * digital_savvy)).astype(int)
    has_used_cashback = (rng.random(n) < (0.12 + 0.4 * digital_savvy)).astype(int)

    session_count_30d = (digital_savvy * 30 + rng.poisson(2, size=n)).astype(int)
    avg_session_duration_min = (digital_savvy * 8 + rng.exponential(2, size=n)).clip(0.5, 30)
    features_used_count = (
        has_used_send_money + has_used_bill_pay + has_used_savings +
        has_used_groups + has_used_qr_pay + has_used_ussd + has_used_cashback
    )
    channel_diversity = np.minimum(
        1 + (has_used_ussd > 0).astype(int) + (features_used_count > 2).astype(int), 3
    )
    onboarding_stage = np.where(digital_savvy > 0.5, 4, np.where(digital_savvy > 0.2, 3, 2))
    days_since_first_use = rng.integers(7, 500, size=n)
    tx_count_30d = (digital_savvy * 20 + rng.poisson(2, size=n)).astype(int)

    # Adoption tier labels from clustering logic
    adoption_score = (
        0.15 * features_used_count / 7 +
        0.20 * np.minimum(session_count_30d / 30, 1) +
        0.15 * np.minimum(avg_session_duration_min / 15, 1) +
        0.15 * np.minimum(tx_count_30d / 20, 1) +
        0.10 * channel_diversity / 3 +
        0.10 * (onboarding_stage / 4) +
        0.15 * digital_savvy
    )
    tiers = ["Dormant", "Basic", "Active", "Power", "Champion"]
    tier_bins = np.digitize(adoption_score, bins=[0.15, 0.30, 0.50, 0.70])
    adoption_tier = np.array([tiers[b] for b in tier_bins])

    return pd.DataFrame({
        "user_id": [f"USR_{i:05d}" for i in range(n)],
        "has_used_send_money": has_used_send_money,
        "has_used_bill_pay": has_used_bill_pay,
        "has_used_savings": has_used_savings,
        "has_used_groups": has_used_groups,
        "has_used_qr_pay": has_used_qr_pay,
        "has_used_ussd": has_used_ussd,
        "has_used_cashback": has_used_cashback,
        "session_count_30d": session_count_30d,
        "avg_session_duration_min": np.round(avg_session_duration_min, 2),
        "channel_diversity": channel_diversity,
        "features_used_count": features_used_count,
        "onboarding_stage": onboarding_stage,
        "days_since_first_use": days_since_first_use,
        "tx_count_30d": tx_count_30d,
        "adoption_tier": adoption_tier,
    })


def generate_beneficiary_segments(n: int = 4000, seed: int = 45) -> pd.DataFrame:
    """Generate beneficiary segmentation data (beneficiary-level, clustering)."""
    rng = np.random.default_rng(seed)

    region = _region_sample(rng, n)
    grant_type = _grant_type_sample(rng, n)

    region_map = {r: i for i, r in enumerate(NAMIBIAN_REGIONS)}
    grant_map = {g: i for i, g in enumerate(GRANT_TYPES)}
    region_encoded = np.array([region_map[r] for r in region])
    grant_type_encoded = np.array([grant_map[g] for g in grant_type])

    age_bracket = rng.choice([1, 2, 3, 4, 5], size=n, p=[0.05, 0.15, 0.25, 0.30, 0.25])
    dependant_count = rng.poisson(1.5, size=n).clip(0, 8)
    has_proxy = rng.choice([0, 1], size=n, p=[0.75, 0.25])

    # Redemption preferences vary by region (urban = wallet, rural = cash_out)
    urban_mask = np.isin(region, ["Khomas", "Erongo", "Oshana"])
    channel_prefs = np.where(
        urban_mask,
        rng.choice([0, 1, 2, 3, 4], size=n, p=[0.40, 0.15, 0.20, 0.15, 0.10]),
        rng.choice([0, 1, 2, 3, 4], size=n, p=[0.15, 0.40, 0.10, 0.10, 0.25]),
    )

    amounts = np.array([GRANT_AMOUNTS[g] for g in grant_type], dtype=float)
    avg_redemption_amount = amounts * rng.uniform(0.8, 1.0, size=n)
    redemption_frequency = rng.poisson(1, size=n).clip(0, 4)
    days_since_last_payment = rng.integers(0, 90, size=n)

    # Digital literacy correlates with age bracket (younger = higher) and region
    digital_literacy_score = (
        (5 - age_bracket) * 0.15 +
        urban_mask.astype(float) * 0.2 +
        rng.beta(2, 3, size=n) * 0.5
    ).clip(0, 1)

    household_size_estimate = (1 + dependant_count + rng.poisson(1, size=n)).clip(1, 12)
    enrollment_duration_days = rng.integers(30, 1500, size=n)

    return pd.DataFrame({
        "beneficiary_id": [f"BEN_{i:05d}" for i in range(n)],
        "age_bracket": age_bracket,
        "region_encoded": region_encoded,
        "grant_type_encoded": grant_type_encoded,
        "dependant_count": dependant_count,
        "has_proxy": has_proxy,
        "redemption_channel_pref_encoded": channel_prefs,
        "avg_redemption_amount": np.round(avg_redemption_amount, 2),
        "redemption_frequency": redemption_frequency,
        "days_since_last_payment": days_since_last_payment,
        "digital_literacy_score": np.round(digital_literacy_score, 4),
        "household_size_estimate": household_size_estimate,
        "enrollment_duration_days": enrollment_duration_days,
    })


def generate_voucher_forecast(n: int = 8000, seed: int = 46) -> pd.DataFrame:
    """Generate voucher redemption forecasting data (voucher-level)."""
    rng = np.random.default_rng(seed)

    region = _region_sample(rng, n)
    grant_type = _grant_type_sample(rng, n)
    region_map = {r: i for i, r in enumerate(NAMIBIAN_REGIONS)}
    grant_map = {g: i for i, g in enumerate(GRANT_TYPES)}
    region_encoded = np.array([region_map[r] for r in region])
    grant_type_encoded = np.array([grant_map[g] for g in grant_type])

    amounts = np.array([GRANT_AMOUNTS[g] for g in grant_type], dtype=float)
    amount_normalized = amounts / 1400.0  # normalize by max grant

    days_since_issue = rng.integers(0, 60, size=n)
    day_of_week_issued = rng.integers(0, 7, size=n)
    day_of_month_issued = rng.choice([1, 2, 3, 15, 16, 28, 29, 30], size=n, p=[0.30, 0.15, 0.10, 0.10, 0.05, 0.10, 0.10, 0.10])
    is_payday_week = (day_of_month_issued <= 5).astype(int)

    beneficiary_segment = rng.integers(0, 6, size=n)
    historical_avg_days_to_redeem = rng.lognormal(1.5, 0.6, size=n).clip(1, 45)
    preferred_channel_encoded = rng.choice([0, 1, 2, 3, 4], size=n, p=[0.30, 0.25, 0.15, 0.20, 0.10])
    nearby_agent_count = rng.poisson(3, size=n).clip(0, 15)

    # Target: days to redeem (regression) — faster when payday, urban, wallet user
    urban_mask = np.isin(region, ["Khomas", "Erongo", "Oshana"])
    days_to_redeem = (
        historical_avg_days_to_redeem * 0.6 +
        (~urban_mask).astype(float) * 3 +
        (1 - is_payday_week) * 2 +
        rng.exponential(2, size=n)
    ).clip(0, 60).astype(int)

    # Target: redemption channel
    channel_map = {0: "wallet", 1: "cash_out", 2: "bank_transfer", 3: "merchant_payment", 4: "cash_at_till"}
    redemption_channel = np.array([channel_map[c] for c in preferred_channel_encoded])

    return pd.DataFrame({
        "voucher_id": [f"VCH_{i:05d}" for i in range(n)],
        "days_since_issue": days_since_issue,
        "grant_type_encoded": grant_type_encoded,
        "amount_normalized": np.round(amount_normalized, 4),
        "region_encoded": region_encoded,
        "beneficiary_segment": beneficiary_segment,
        "day_of_week_issued": day_of_week_issued,
        "day_of_month_issued": day_of_month_issued,
        "is_payday_week": is_payday_week,
        "historical_avg_days_to_redeem": np.round(historical_avg_days_to_redeem, 2),
        "preferred_channel_encoded": preferred_channel_encoded,
        "nearby_agent_count": nearby_agent_count,
        "days_to_redeem": days_to_redeem,
        "redemption_channel": redemption_channel,
    })


def generate_agent_demand(n: int = 3000, seed: int = 47) -> pd.DataFrame:
    """Generate agent demand forecasting data (region-day level, regression)."""
    rng = np.random.default_rng(seed)

    region = _region_sample(rng, n)
    region_map = {r: i for i, r in enumerate(NAMIBIAN_REGIONS)}
    region_encoded = np.array([region_map[r] for r in region])

    day_of_week = rng.integers(0, 7, size=n)
    day_of_month = rng.integers(1, 31, size=n)
    is_payday_week = (day_of_month <= 5).astype(int)

    # Region characteristics
    agent_count_in_region = rng.poisson(8, size=n).clip(1, 30)
    active_beneficiaries_in_region = rng.poisson(500, size=n).clip(50, 3000)

    avg_historical_daily_demand = rng.lognormal(9, 0.5, size=n).clip(1000, 100000)
    seasonal_index = 1.0 + 0.1 * np.sin(2 * np.pi * day_of_month / 30) + rng.normal(0, 0.05, size=n)
    recent_7d_avg_demand = avg_historical_daily_demand * rng.uniform(0.8, 1.2, size=n)
    pending_voucher_value_in_region = rng.lognormal(10, 0.8, size=n).clip(5000, 500000)

    # Target: daily demand in NAD
    daily_demand_nad = (
        avg_historical_daily_demand * seasonal_index * 0.5 +
        is_payday_week * avg_historical_daily_demand * 0.8 +
        (active_beneficiaries_in_region / 500) * 2000 +
        rng.normal(0, 3000, size=n)
    ).clip(500, 200000)

    return pd.DataFrame({
        "region_encoded": region_encoded,
        "day_of_week": day_of_week,
        "day_of_month": day_of_month,
        "is_payday_week": is_payday_week,
        "agent_count_in_region": agent_count_in_region,
        "active_beneficiaries_in_region": active_beneficiaries_in_region,
        "avg_historical_daily_demand": np.round(avg_historical_daily_demand, 2),
        "seasonal_index": np.round(seasonal_index, 4),
        "recent_7d_avg_demand": np.round(recent_7d_avg_demand, 2),
        "pending_voucher_value_in_region": np.round(pending_voucher_value_in_region, 2),
        "daily_demand_nad": np.round(daily_demand_nad, 2),
    })


def generate_expiry_risk(n: int = 6000, seed: int = 48) -> pd.DataFrame:
    """Generate voucher expiry risk data (voucher-level, binary classification)."""
    rng = np.random.default_rng(seed)

    region = _region_sample(rng, n)
    grant_type = _grant_type_sample(rng, n)
    region_map = {r: i for i, r in enumerate(NAMIBIAN_REGIONS)}
    grant_map = {g: i for i, g in enumerate(GRANT_TYPES)}
    region_encoded = np.array([region_map[r] for r in region])
    grant_type_encoded = np.array([grant_map[g] for g in grant_type])

    amounts = np.array([GRANT_AMOUNTS[g] for g in grant_type], dtype=float)
    amount_normalized = amounts / 1400.0

    days_since_issue = rng.integers(0, 90, size=n)
    days_until_expiry = np.maximum(90 - days_since_issue + rng.integers(-10, 10, size=n), 0)

    beneficiary_activity_score = rng.beta(3, 2, size=n)
    similar_voucher_redemption_rate = rng.beta(5, 2, size=n)
    channel_availability_score = rng.beta(3, 1.5, size=n)
    has_used_app = rng.choice([0, 1], size=n, p=[0.35, 0.65])
    has_used_ussd = rng.choice([0, 1], size=n, p=[0.55, 0.45])
    nearest_agent_distance_km = rng.exponential(5, size=n).clip(0.5, 50)
    notification_sent_count = rng.poisson(2, size=n).clip(0, 8)

    # Label: expired unredeemed — more likely when low activity, far from agents, no app
    expiry_score = (
        -0.3 * beneficiary_activity_score
        - 0.2 * similar_voucher_redemption_rate
        - 0.1 * channel_availability_score
        - 0.15 * has_used_app
        + 0.1 * (nearest_agent_distance_km / 50)
        - 0.05 * notification_sent_count / 8
        + 0.2 * (days_until_expiry < 7).astype(float)
        + rng.normal(0, 0.15, size=n)
    )
    expired_unredeemed = (expiry_score > -0.15).astype(int)

    return pd.DataFrame({
        "voucher_id": [f"VCH_{i:05d}" for i in range(n)],
        "days_since_issue": days_since_issue,
        "days_until_expiry": days_until_expiry,
        "grant_type_encoded": grant_type_encoded,
        "amount_normalized": np.round(amount_normalized, 4),
        "region_encoded": region_encoded,
        "beneficiary_activity_score": np.round(beneficiary_activity_score, 4),
        "similar_voucher_redemption_rate": np.round(similar_voucher_redemption_rate, 4),
        "channel_availability_score": np.round(channel_availability_score, 4),
        "has_used_app": has_used_app,
        "has_used_ussd": has_used_ussd,
        "nearest_agent_distance_km": np.round(nearest_agent_distance_km, 2),
        "notification_sent_count": notification_sent_count,
        "expired_unredeemed": expired_unredeemed,
    })


def main():
    print("Generating Namibian G2P training data...")

    generators = [
        ("churn_data.csv", generate_churn_data),
        ("nps_data.csv", generate_nps_data),
        ("adoption_data.csv", generate_adoption_data),
        ("beneficiary_segments.csv", generate_beneficiary_segments),
        ("voucher_forecast.csv", generate_voucher_forecast),
        ("agent_demand.csv", generate_agent_demand),
        ("expiry_risk.csv", generate_expiry_risk),
    ]

    for filename, gen_fn in generators:
        df = gen_fn()
        path = DATA_DIR / filename
        df.to_csv(path, index=False)
        print(f"  {filename}: {len(df)} rows, {len(df.columns)} columns -> {path}")

    print("Done. All 7 CSV files generated.")


if __name__ == "__main__":
    main()
