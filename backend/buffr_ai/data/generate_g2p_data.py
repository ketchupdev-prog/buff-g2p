"""
G2P Training Data Generator

Generates synthetic training data for all 12 ML models:
- Fraud Detection
- Credit Scoring  
- Churn Prediction
- NPS Scoring
- Digital Adoption
- Beneficiary Segmentation
- Spending Analysis
- Voucher Forecast
- Agent Demand
- Expiry Risk
- Transaction Classification
- Agent Network Features

Usage:
    cd backend/buffr_ai
    python data/generate_g2p_data.py
    
Output:
    data/training/*.csv (10,000 records per model)
"""

import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
import random

# Output directory
OUTPUT_DIR = Path(__file__).parent / "training"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

print("🚀 Buffr G2P Training Data Generator")
print("=" * 60)


def generate_fraud_detection_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate fraud detection training data"""
    print(f"\n📊 Generating fraud detection data ({n_samples} samples)...")
    
    np.random.seed(42)
    fraud_ratio = 0.05  # 5% fraud
    n_fraud = int(n_samples * fraud_ratio)
    n_normal = n_samples - n_fraud
    
    # Normal transactions
    normal_data = {
        'amount': np.random.lognormal(mean=5.5, sigma=1.2, size=n_normal),
        'hour_of_day': np.random.choice(range(6, 22), size=n_normal),  # Business hours
        'day_of_week': np.random.choice(range(7), size=n_normal),
        'transaction_frequency': np.random.poisson(lam=5, size=n_normal),
        'avg_transaction_amount': np.random.lognormal(mean=5.2, sigma=1.0, size=n_normal),
        'distance_from_home': np.random.gamma(shape=2, scale=3, size=n_normal),
        'device_score': np.random.beta(a=8, b=2, size=n_normal),
        'account_age_days': np.random.randint(30, 1825, size=n_normal),
        'num_failed_attempts': np.random.choice([0, 0, 0, 1], size=n_normal),
        'velocity_1h': np.random.poisson(lam=2, size=n_normal),
        'velocity_24h': np.random.poisson(lam=8, size=n_normal),
        'merchant_category': np.random.choice([5411, 5812, 5499, 5722, 4111], size=n_normal),
        'country_risk_score': np.random.beta(a=2, b=8, size=n_normal),
        'is_fraud': 0
    }
    
    # Fraudulent transactions
    fraud_data = {
        'amount': np.random.lognormal(mean=7.5, sigma=1.5, size=n_fraud),  # Larger amounts
        'hour_of_day': np.random.choice([0, 1, 2, 3, 4, 5, 23], size=n_fraud),  # Unusual hours
        'day_of_week': np.random.choice(range(7), size=n_fraud),
        'transaction_frequency': np.random.poisson(lam=15, size=n_fraud),  # High frequency
        'avg_transaction_amount': np.random.lognormal(mean=5.0, sigma=0.8, size=n_fraud),
        'distance_from_home': np.random.gamma(shape=5, scale=10, size=n_fraud),  # Far from home
        'device_score': np.random.beta(a=2, b=8, size=n_fraud),  # Low device trust
        'account_age_days': np.random.randint(1, 90, size=n_fraud),  # New accounts
        'num_failed_attempts': np.random.choice([2, 3, 4, 5], size=n_fraud),
        'velocity_1h': np.random.poisson(lam=8, size=n_fraud),  # High velocity
        'velocity_24h': np.random.poisson(lam=25, size=n_fraud),
        'merchant_category': np.random.choice([5999, 6211, 7995], size=n_fraud),  # Risky categories
        'country_risk_score': np.random.beta(a=6, b=4, size=n_fraud),  # Higher risk
        'is_fraud': 1
    }
    
    # Combine and shuffle
    df_normal = pd.DataFrame(normal_data)
    df_fraud = pd.DataFrame(fraud_data)
    df = pd.concat([df_normal, df_fraud], ignore_index=True).sample(frac=1, random_state=42)
    
    print(f"  ✅ Generated {len(df)} samples ({n_fraud} fraud, {n_normal} normal)")
    return df


def generate_credit_scoring_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate credit scoring training data"""
    print(f"\n💳 Generating credit scoring data ({n_samples} samples)...")
    
    np.random.seed(43)
    
    data = {
        'monthly_income': np.random.lognormal(mean=8.2, sigma=0.5, size=n_samples),
        'transaction_count': np.random.poisson(lam=20, size=n_samples),
        'avg_balance': np.random.lognormal(mean=7.5, sigma=0.8, size=n_samples),
        'credit_utilization': np.random.beta(a=2, b=5, size=n_samples),
        'payment_history': np.random.beta(a=9, b=1, size=n_samples),
        'debt_to_income': np.random.beta(a=2, b=8, size=n_samples),
        'employment_length': np.random.randint(0, 240, size=n_samples),
        'num_credit_lines': np.random.poisson(lam=2, size=n_samples),
        'num_inquiries': np.random.poisson(lam=1, size=n_samples),
        'loan_amount': np.random.lognormal(mean=8.0, sigma=0.7, size=n_samples),
        'loan_term': np.random.choice([6, 12, 18, 24, 36], size=n_samples),
        'interest_rate': np.random.uniform(0.10, 0.25, size=n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Generate credit score (300-850) based on features
    score = (
        df['payment_history'] * 350 +
        (1 - df['credit_utilization']) * 200 +
        (df['employment_length'] / 240) * 100 +
        (1 - df['debt_to_income']) * 100 +
        np.random.normal(0, 20, n_samples)  # Noise
    )
    df['credit_score'] = np.clip(score + 300, 300, 850).astype(int)
    df['risk_category'] = pd.cut(
        df['credit_score'],
        bins=[0, 580, 670, 740, 850],
        labels=['poor', 'fair', 'good', 'excellent']
    )
    
    print(f"  ✅ Generated {len(df)} samples (score range: {df['credit_score'].min()}-{df['credit_score'].max()})")
    return df


def generate_spending_analysis_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate spending analysis training data"""
    print(f"\n💰 Generating spending analysis data ({n_samples} samples)...")
    
    np.random.seed(44)
    
    # Define 3 spending segments
    segments = []
    for _ in range(n_samples):
        segment = random.choice(['frugal', 'balanced', 'impulsive'])
        
        if segment == 'frugal':
            spending = np.random.lognormal(mean=7.0, sigma=0.3)
            txn_count = np.random.poisson(lam=10)
            variance = np.random.uniform(50, 200)
            diversity = np.random.randint(3, 8)
        elif segment == 'balanced':
            spending = np.random.lognormal(mean=7.8, sigma=0.5)
            txn_count = np.random.poisson(lam=25)
            variance = np.random.uniform(200, 500)
            diversity = np.random.randint(8, 15)
        else:  # impulsive
            spending = np.random.lognormal(mean=8.5, sigma=0.7)
            txn_count = np.random.poisson(lam=40)
            variance = np.random.uniform(500, 1500)
            diversity = np.random.randint(15, 30)
        
        segments.append({
            'monthly_spending': spending,
            'transaction_count': txn_count,
            'avg_transaction_amount': spending / max(txn_count, 1),
            'spending_variance': variance,
            'merchant_diversity': diversity,
            'segment': segment
        })
    
    df = pd.DataFrame(segments)
    
    # Add category distributions (simplified - 5 main categories)
    for cat in ['groceries', 'utilities', 'transport', 'entertainment', 'other']:
        df[f'cat_{cat}'] = np.random.dirichlet(np.ones(5), size=n_samples)[:, ['groceries', 'utilities', 'transport', 'entertainment', 'other'].index(cat)]
    
    print(f"  ✅ Generated {len(df)} samples (frugal: {(df['segment']=='frugal').sum()}, balanced: {(df['segment']=='balanced').sum()}, impulsive: {(df['segment']=='impulsive').sum()})")
    return df


def generate_voucher_forecast_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate voucher redemption forecast data"""
    print(f"\n🎫 Generating voucher forecast data ({n_samples} samples)...")
    
    np.random.seed(45)
    
    data = {
        'voucher_age_days': np.random.randint(0, 30, size=n_samples),
        'initial_amount': np.random.choice([500, 1000, 1500, 2000], size=n_samples),
        'remaining_amount': np.random.uniform(0, 2000, size=n_samples),
        'beneficiary_count': np.random.poisson(lam=1, size=n_samples),
        'prior_redemption_rate': np.random.beta(a=8, b=2, size=n_samples),
        'merchant_availability_score': np.random.beta(a=7, b=3, size=n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Calculate redemption rate (higher if: new voucher, high prior rate, good merchant availability)
    redemption_rate = (
        (1 - df['voucher_age_days'] / 30) * 0.3 +
        df['prior_redemption_rate'] * 0.4 +
        df['merchant_availability_score'] * 0.3 +
        np.random.normal(0, 0.1, n_samples)
    )
    df['redemption_rate'] = np.clip(redemption_rate, 0, 1)
    
    print(f"  ✅ Generated {len(df)} samples (avg redemption rate: {df['redemption_rate'].mean():.2f})")
    return df


def generate_churn_prediction_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate churn prediction training data"""
    print(f"\n🔄 Generating churn prediction data ({n_samples} samples)...")
    
    np.random.seed(46)
    
    data = {
        'days_inactive': np.random.exponential(scale=10, size=n_samples),
        'transaction_count_change': np.random.normal(0, 0.5, size=n_samples),
        'avg_amount_change': np.random.normal(0, 0.3, size=n_samples),
        'support_tickets': np.random.poisson(lam=0.5, size=n_samples),
        'app_login_frequency': np.random.poisson(lam=15, size=n_samples),
        'num_beneficiaries': np.random.poisson(lam=2, size=n_samples),
        'voucher_usage_rate': np.random.beta(a=7, b=3, size=n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Churn probability (higher if: inactive, declining usage, low engagement)
    churn_prob = (
        np.clip(df['days_inactive'] / 60, 0, 1) * 0.4 +
        np.clip(-df['transaction_count_change'], 0, 1) * 0.3 +
        (1 - df['voucher_usage_rate']) * 0.2 +
        (df['support_tickets'] / 10) * 0.1 +
        np.random.normal(0, 0.1, n_samples)
    )
    df['churn_probability'] = np.clip(churn_prob, 0, 1)
    df['churned'] = (df['churn_probability'] > 0.5).astype(int)
    
    print(f"  ✅ Generated {len(df)} samples (churn rate: {df['churned'].mean():.2%})")
    return df


def generate_expiry_risk_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate voucher expiry risk data"""
    print(f"\n⚠️  Generating expiry risk data ({n_samples} samples)...")
    
    np.random.seed(47)
    
    data = {
        'days_until_expiry': np.random.randint(1, 60, size=n_samples),
        'voucher_value': np.random.choice([500, 1000, 1500, 2000, 3000], size=n_samples),
        'redemption_history_rate': np.random.beta(a=7, b=3, size=n_samples),
        'beneficiary_engagement': np.random.beta(a=6, b=4, size=n_samples),
        'notification_responsiveness': np.random.beta(a=5, b=5, size=n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Expiry risk (higher if: soon expiring, low engagement, low responsiveness)
    risk = (
        (1 - df['days_until_expiry'] / 60) * 0.4 +
        (1 - df['redemption_history_rate']) * 0.2 +
        (1 - df['beneficiary_engagement']) * 0.2 +
        (1 - df['notification_responsiveness']) * 0.2 +
        np.random.normal(0, 0.1, n_samples)
    )
    df['expiry_risk'] = np.clip(risk, 0, 1)
    df['will_expire'] = (df['expiry_risk'] > 0.6).astype(int)
    
    print(f"  ✅ Generated {len(df)} samples (expiry rate: {df['will_expire'].mean():.2%})")
    return df


def generate_agent_demand_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate agent demand forecast data"""
    print(f"\n👥 Generating agent demand data ({n_samples} samples)...")
    
    np.random.seed(48)
    
    locations = ['Windhoek_CBD', 'Oshakati', 'Walvis_Bay', 'Katima_Mulilo', 'Rundu']
    
    data = {
        'location': np.random.choice(locations, size=n_samples),
        'day_of_week': np.random.choice(range(7), size=n_samples),
        'is_payday': np.random.choice([0, 1], p=[0.85, 0.15], size=n_samples),
        'is_holiday': np.random.choice([0, 1], p=[0.95, 0.05], size=n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Base demand by location
    location_base = {'Windhoek_CBD': 150, 'Oshakati': 80, 'Walvis_Bay': 100, 'Katima_Mulilo': 60, 'Rundu': 70}
    df['base_demand'] = df['location'].map(location_base)
    
    # Calculate demand (higher on payday, weekends, holidays)
    demand = (
        df['base_demand'] +
        df['is_payday'] * 100 +
        df['is_holiday'] * 50 +
        (df['day_of_week'].isin([5, 6])).astype(int) * 30 +
        np.random.normal(0, 15, n_samples)
    )
    df['demand_forecast'] = np.clip(demand, 10, 500).astype(int)
    
    print(f"  ✅ Generated {len(df)} samples (avg demand: {df['demand_forecast'].mean():.0f})")
    return df


def generate_transaction_classification_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate transaction classification data"""
    print(f"\n🏷️  Generating transaction classification data ({n_samples} samples)...")
    
    np.random.seed(49)
    
    categories = {
        'groceries': (5411, [50, 500], [8, 18]),
        'utilities': (4900, [100, 1000], [6, 20]),
        'transport': (4121, [20, 200], [6, 19]),
        'entertainment': (7832, [50, 300], [18, 23]),
        'healthcare': (8011, [100, 2000], [8, 17]),
        'education': (8299, [200, 5000], [8, 16]),
        'dining': (5812, [30, 300], [11, 21]),
        'shopping': (5311, [50, 1000], [10, 20]),
    }
    
    records = []
    for _ in range(n_samples):
        category = random.choice(list(categories.keys()))
        mcc, (min_amt, max_amt), (min_hr, max_hr) = categories[category]
        
        records.append({
            'amount': np.random.uniform(min_amt, max_amt),
            'merchant_category': mcc,
            'hour_of_day': np.random.randint(min_hr, max_hr),
            'day_of_week': np.random.choice(range(7)),
            'device_type': np.random.choice([0, 1, 2], p=[0.1, 0.8, 0.1]),  # Mobile dominant
            'location_type': np.random.choice([0, 1, 2, 3], p=[0.1, 0.4, 0.3, 0.2]),
            'account_age_days': np.random.randint(1, 1825),
            'category': category
        })
    
    df = pd.DataFrame(records)
    
    print(f"  ✅ Generated {len(df)} samples ({df['category'].nunique()} categories)")
    return df


def generate_nps_scoring_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate NPS scoring data"""
    print(f"\n⭐ Generating NPS scoring data ({n_samples} samples)...")
    
    np.random.seed(50)
    
    data = {
        'transaction_satisfaction': np.random.beta(a=7, b=3, size=n_samples) * 10,
        'app_rating': np.random.beta(a=8, b=2, size=n_samples) * 10,
        'support_rating': np.random.beta(a=6, b=4, size=n_samples) * 10,
        'feature_usage_count': np.random.poisson(lam=8, size=n_samples),
        'response_time_avg': np.random.gamma(shape=2, scale=0.5, size=n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # NPS score (0-10): Detractors (0-6), Passives (7-8), Promoters (9-10)
    nps = (
        df['transaction_satisfaction'] * 0.3 +
        df['app_rating'] * 0.4 +
        df['support_rating'] * 0.2 +
        (df['feature_usage_count'] / 20) * 10 * 0.1 +
        np.random.normal(0, 0.5, n_samples)
    )
    df['nps_score'] = np.clip(nps, 0, 10)
    df['nps_category'] = pd.cut(
        df['nps_score'],
        bins=[0, 6, 8, 10],
        labels=['detractor', 'passive', 'promoter']
    )
    
    print(f"  ✅ Generated {len(df)} samples (promoters: {(df['nps_category']=='promoter').sum()})")
    return df


def generate_digital_adoption_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate digital adoption data"""
    print(f"\n📱 Generating digital adoption data ({n_samples} samples)...")
    
    np.random.seed(51)
    
    data = {
        'app_sessions_per_week': np.random.poisson(lam=12, size=n_samples),
        'feature_adoption_count': np.random.poisson(lam=6, size=n_samples),
        'avg_session_duration': np.random.gamma(shape=3, scale=2, size=n_samples),
        'last_login_days_ago': np.random.exponential(scale=2, size=n_samples),
        'push_notification_response': np.random.beta(a=6, b=4, size=n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Adoption score
    adoption = (
        np.clip(df['app_sessions_per_week'] / 20, 0, 1) * 0.3 +
        np.clip(df['feature_adoption_count'] / 15, 0, 1) * 0.3 +
        np.clip(1 - df['last_login_days_ago'] / 30, 0, 1) * 0.2 +
        df['push_notification_response'] * 0.2
    )
    df['adoption_score'] = np.clip(adoption, 0, 1)
    df['segment'] = pd.cut(
        df['adoption_score'],
        bins=[0, 0.3, 0.6, 1.0],
        labels=['low', 'medium', 'high']
    )
    
    print(f"  ✅ Generated {len(df)} samples (high adoption: {(df['segment']=='high').sum()})")
    return df


def generate_beneficiary_segmentation_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate beneficiary segmentation data"""
    print(f"\n👤 Generating beneficiary segmentation data ({n_samples} samples)...")
    
    np.random.seed(52)
    
    segments = ['at_risk', 'stable', 'active', 'champion']
    
    records = []
    for _ in range(n_samples):
        segment = random.choice(segments)
        
        if segment == 'at_risk':
            txn_count = np.random.poisson(lam=3)
            recency = np.random.randint(30, 90)
            avg_send = np.random.uniform(50, 200)
        elif segment == 'stable':
            txn_count = np.random.poisson(lam=10)
            recency = np.random.randint(1, 30)
            avg_send = np.random.uniform(200, 500)
        elif segment == 'active':
            txn_count = np.random.poisson(lam=20)
            recency = np.random.randint(1, 7)
            avg_send = np.random.uniform(300, 800)
        else:  # champion
            txn_count = np.random.poisson(lam=40)
            recency = np.random.randint(1, 3)
            avg_send = np.random.uniform(500, 2000)
        
        records.append({
            'transaction_count': txn_count,
            'avg_send_amount': avg_send,
            'num_beneficiaries': np.random.poisson(lam=2),
            'frequency_variance': np.random.uniform(0, 100),
            'recency_days': recency,
            'segment': segment
        })
    
    df = pd.DataFrame(records)
    
    print(f"  ✅ Generated {len(df)} samples (champions: {(df['segment']=='champion').sum()})")
    return df


def main():
    """Generate all training datasets"""
    print("\n🎯 Generating training data for 12 ML models...\n")
    
    datasets = {
        'fraud_detection': generate_fraud_detection_data,
        'credit_scoring': generate_credit_scoring_data,
        'spending_analysis': generate_spending_analysis_data,
        'voucher_forecast': generate_voucher_forecast_data,
        'churn_prediction': generate_churn_prediction_data,
        'expiry_risk': generate_expiry_risk_data,
        'agent_demand': generate_agent_demand_data,
        'transaction_classification': generate_transaction_classification_data,
        'nps_scoring': generate_nps_scoring_data,
        'digital_adoption': generate_digital_adoption_data,
        'beneficiary_segmentation': generate_beneficiary_segmentation_data,
    }
    
    for name, generator in datasets.items():
        df = generator()
        output_path = OUTPUT_DIR / f"{name}_training.csv"
        df.to_csv(output_path, index=False)
        print(f"  💾 Saved to: {output_path}")
    
    print("\n" + "=" * 60)
    print(f"✅ Successfully generated {len(datasets)} training datasets")
    print(f"📁 Location: {OUTPUT_DIR}")
    print("\n🚀 Next steps:")
    print("  1. Review data: ls -lh data/training/")
    print("  2. Train models: python -m ml.fraud_detection --train")
    print("  3. Test predictions: python -m ml.fraud_detection --test")


if __name__ == "__main__":
    main()
