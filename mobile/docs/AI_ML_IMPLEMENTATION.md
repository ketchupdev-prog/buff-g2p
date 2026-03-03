# Buffr G2P - AI/ML Implementation Guide

**Last Updated:** March 2026  
**Platform:** Buffr G2P Backend AI Services  
**Purpose:** Machine Learning models for fraud detection, beneficiary analytics, and operational optimization

---

## 1. AI/ML Architecture Overview

The Buffr G2P system includes 13 ML-powered agents that process transaction data, predict user behavior, and detect fraud in real-time:

```
buffr_ai/
  ├── ml/
  │   ├── agent_demand.py           # Agent float demand forecasting
  │   ├── agent_network_features.py # Agent network feature extraction
  │   ├── beneficiary_segmentation.py # Beneficiary persona clustering
  │   ├── churn_prediction.py        # Beneficiary/agent attrition risk
  │   ├── credit_scoring.py          # Merchant credit risk assessment
  │   ├── digital_adoption.py        # Feature adoption tier prediction
  │   ├── expiry_risk.py            # Voucher expiry risk prediction
  │   ├── fraud_detection.py         # Real-time transaction fraud detection
  │   ├── nps_scoring.py             # User satisfaction prediction
  │   ├── spending_analysis.py       # Spending pattern analysis
  │   ├── transaction_classification.py # Auto transaction categorization
  │   └── voucher_forecast.py        # Voucher redemption forecasting
```

---

## 2. Model Ensembles Summary

| Agent | Purpose | Models | Target Performance |
|-------|---------|--------|-------------------|
| **Fraud Detection** | Real-time transaction monitoring | LR + NN + RF + GMM | Precision >95%, Recall >90%, F1 >92% |
| **Credit Scoring** | Merchant lending assessment | LR + DT + RF + GB | ROC-AUC >0.75, Brier <0.15 |
| **Beneficiary Segmentation** | Persona discovery | K-Means + GMM | 6 segments |
| **Churn Prediction** | Attrition risk | LR + RF + GB | ROC-AUC >0.80 |
| **Expiry Risk** | Voucher expiry prevention | LR + RF + GB | ROC-AUC >0.75 |
| **Digital Adoption** | Feature adoption tiers | K-Means + RF | 5 tiers |
| **Spending Analysis** | User persona profiling | K-Means + GMM + Hierarchical | 8 personas |
| **NPS Scoring** | Satisfaction prediction | GB + RF + Ridge | MAE <10 |
| **Voucher Forecast** | Redemption prediction | GB + RF | MAE <5 days |
| **Agent Demand** | Float forecasting | GB + Ridge | MAPE <15% |
| **Transaction Classification** | Auto-categorization | RF + DT + Bagging + AdaBoost | Accuracy >98% |

---

## 3. Detailed Model Specifications

### 3.1 Fraud Detection Ensemble (Guardian Agent)

**File:** `fraud_detection.py`

**Purpose:** Real-time transaction fraud detection with <10ms inference time

**Architecture:**
- 4-model ensemble: Logistic Regression + Neural Network + Random Forest + GMM
- 29 features (20 original + 9 agent network features)
- Target: Precision >95%, Recall >90%, F1 >92%

**Features (29 total):**
```python
@dataclass
class FraudFeatures:
    # Transaction features (3)
    amount_normalized: float
    amount_log: float
    amount_deviation_from_avg: float
    
    # Time features (5)
    hour_sin: float
    hour_cos: float
    day_of_week: int
    is_weekend: int
    is_unusual_hour: int
    
    # Merchant features (2)
    merchant_category_encoded: int
    merchant_fraud_rate: float
    
    # Location features (2)
    distance_from_home_km: float
    is_foreign_transaction: int
    
    # User behavior (3)
    transactions_last_hour: int
    transactions_last_day: int
    velocity_score: float
    
    # Device features (2)
    device_fingerprint_match: int
    card_not_present: int
    
    # Additional (3)
    round_number_flag: int
    beneficiary_account_age_days: int
    user_kyc_level: int
    
    # Agent network features (9)
    is_agent_transaction: int
    agent_type_encoded: int
    agent_status_encoded: int
    agent_liquidity_normalized: float
    agent_cash_on_hand_normalized: float
    agent_has_sufficient_liquidity: int
    agent_transaction_type_encoded: int
    agent_commission_rate: float
    agent_risk_score: float
```

**Neural Network Architecture:**
```
Input (29) → Dense(64, ReLU) → Dropout(0.3) → Dense(32, ReLU) → Dropout(0.2) → Dense(16, ReLU) → Dense(1, Sigmoid)
```

**Ensemble Weights:**
- Logistic Regression: 25%
- Neural Network: 35%
- Random Forest: 30%
- GMM Anomaly: 10%

---

### 3.2 Credit Scoring Ensemble (Guardian Agent)

**File:** `credit_scoring.py`

**Purpose:** Merchant credit risk assessment for Buffr Lend (NAD 500 - 10,000)

**Architecture:**
- 4-model ensemble: Logistic Regression + Decision Tree + Random Forest + Gradient Boosting
- 30 features covering transaction, merchant, alternative data, loan history, financial health
- Target: ROC-AUC >0.75, Gini >0.50, Brier Score <0.15

**Credit Tiers:**
| Tier | Credit Score | Max Loan | Interest Rate |
|------|-------------|----------|---------------|
| EXCELLENT | 700+ | N$10,000 | 8% APR |
| GOOD | 650-699 | N$5,000 | 12% APR |
| FAIR | 600-649 | N$2,000 | 16% APR |
| POOR | 550-599 | N$500 | 20% APR |
| DECLINED | <550 | N$0 | - |

---

### 3.3 Beneficiary Segmentation Engine

**File:** `beneficiary_segmentation.py`

**Purpose:** Cluster beneficiaries into persona groups for targeted interventions

**Architecture:**
- K-Means (6 clusters) + Gaussian Mixture Model
- 12 features per beneficiary

**Segment Names:**
1. Rural Elderly
2. Urban Youth
3. Peri-Urban Family
4. Digital-First
5. Traditional Cash
6. New Enrollee

**Features:**
```python
@dataclass
class BeneficiaryFeatures:
    age_bracket: int
    region_encoded: int
    grant_type_encoded: int
    dependant_count: int
    has_proxy: int
    redemption_channel_pref_encoded: int
    avg_redemption_amount: float
    redemption_frequency: float
    days_since_last_payment: int
    digital_literacy_score: float
    household_size_estimate: int
    enrollment_duration_days: int
```

---

### 3.4 Churn Prediction Ensemble

**File:** `churn_prediction.py`

**Purpose:** Predict beneficiary/agent attrition risk

**Architecture:**
- 3-model ensemble: Logistic Regression + Random Forest + Gradient Boosting
- 15 features

**Risk Tiers:**
- High: churn_probability >= 0.7
- Medium: 0.4 <= churn_probability < 0.7
- Low: churn_probability < 0.4

---

### 3.5 Expiry Risk Ensemble

**File:** `expiry_risk.py`

**Purpose:** Predict voucher expiry risk (unredeemed vouchers)

**Interventions:**
| Risk Tier | Probability | Recommended Action |
|-----------|-------------|-------------------|
| High | >= 0.7 | agent_outreach |
| Medium | 0.4-0.7 | sms_reminder |
| Low | < 0.4 | no_action |

---

### 3.6 Digital Adoption Engine

**File:** `digital_adoption.py`

**Purpose:** Track feature adoption and engagement tiers

**Adoption Tiers:**
1. Dormant
2. Basic
3. Active
4. Power
5. Champion

---

### 3.7 Spending Analysis Engine

**File:** `spending_analysis.py`

**Purpose:** Analyze user spending patterns and generate personas

**Namibian-Specific Personas:**
- Grant Recipient - Cash User (70% unbanked)
- Grant Recipient - Food Focused
- Grant Recipient - Responsible Payer
- Grant Recipient - Balanced
- Urban Professional - Conservative
- Urban Professional - Diverse Spender
- Urban Professional - Big Spender
- Rural User - Cash Dependent
- Rural User - Essential Focused
- Rural User - Limited Access

---

### 3.8 NPS Scoring Ensemble

**File:** `nps_scoring.py`

**Purpose:** Predict user satisfaction and Net Promoter Score

**Satisfaction Tiers:**
- Promoter: NPS >= 70
- Passive: 50 <= NPS < 70
- Detractor: NPS < 50

---

### 3.9 Voucher Redemption Forecaster

**File:** `voucher_forecast.py`

**Purpose:** Predict days to redeem and redemption channel

**Redemption Channels:**
- wallet
- cash_out
- bank_transfer
- merchant_payment
- cash_at_till

---

### 3.10 Agent Demand Forecaster

**File:** `agent_demand.py`

**Purpose:** Predict daily agent float demand

**Output:**
- predicted_daily_demand
- recommended_float (1.2x buffer)
- restock_alert (if demand > 80% historical avg)
- confidence score

---

### 3.11 Transaction Classification

**File:** `transaction_classification.py`

**Purpose:** Automatic transaction categorization

**Categories (17):**
- Food & Dining
- Groceries
- Transport
- Shopping
- Bills & Utilities
- Entertainment
- Health
- Education
- Travel
- Personal Care
- Home
- Income
- Transfers
- Other
- AGENT_CASHOUT
- AGENT_CASHIN
- AGENT_COMMISSION

---

### 3.12 Agent Network Feature Extraction

**File:** `agent_network_features.py`

**Purpose:** Extract agent-related features for other ML models

**Features Extracted:**
- is_agent_transaction
- agent_type_encoded (small=0, medium=1, large=2)
- agent_status_encoded (active=1, inactive=0, suspended=-1)
- agent_liquidity_normalized
- agent_cash_on_hand_normalized
- agent_has_sufficient_liquidity
- agent_transaction_type_encoded
- agent_commission_rate
- agent_risk_score

---

## 4. Database Integration

### 4.1 Required Tables

```sql
-- ML model metadata
CREATE TABLE ml_models (
    id UUID PRIMARY KEY,
    model_type VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    trained_at TIMESTAMP,
    metrics JSONB,
    is_active BOOLEAN DEFAULT true
);

-- Feature store
CREATE TABLE feature_store (
    user_id UUID,
    feature_name VARCHAR(100),
    feature_value FLOAT,
    computed_at TIMESTAMP,
    PRIMARY KEY (user_id, feature_name)
);

-- Model predictions log
CREATE TABLE ml_predictions (
    id UUID PRIMARY KEY,
    model_type VARCHAR(50),
    user_id UUID,
    prediction JSONB,
    probability FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 API Endpoints

```python
# Fraud Detection
POST /api/v1/ml/fraud/detect
POST /api/v1/ml/fraud/batch-detect

# Credit Scoring
POST /api/v1/ml/credit/score
POST /api/v1/ml/credit/explain

# Beneficiary Segmentation
POST /api/v1/ml/segmentation/predict

# Churn Prediction
POST /api/v1/ml/churn/predict

# Expiry Risk
POST /api/v1/ml/expiry/predict

# Digital Adoption
POST /api/v1/ml/adoption/predict

# Spending Analysis
POST /api/v1/ml/spending/analyze

# NPS Scoring
POST /api/v1/ml/nps/predict

# Voucher Forecast
POST /api/v1/ml/voucher/forecast

# Agent Demand
POST /api/v1/ml/agent/demand

# Transaction Classification
POST /api/v1/ml/transaction/classify
POST /api/v1/ml/transaction/batch-classify
```

---

## 5. Model Training Pipeline

### 5.1 Training Data Sources

- PostgreSQL transactions table
- Vouchers table
- Users table
- Agents table
- Merchants table

### 5.2 Training Schedule

| Model | Frequency | Trigger |
|-------|-----------|---------|
| Fraud Detection | Weekly | New fraud patterns |
| Credit Scoring | Monthly | New merchant data |
| Beneficiary Segmentation | Quarterly | New enrollees |
| Churn Prediction | Weekly | Activity updates |
| Expiry Risk | Daily | Voucher issues |
| Digital Adoption | Weekly | App updates |
| Spending Analysis | Monthly | Transaction volume |
| NPS Scoring | Monthly | Survey data |
| Voucher Forecast | Weekly | Redemption patterns |
| Agent Demand | Daily | Transaction patterns |
| Transaction Classification | Monthly | New merchants |

### 5.3 Model Storage

Models are saved using joblib:
```
buffr_ai/models/
  ├── fraud_detection/
  ├── credit_scoring/
  ├── beneficiary_segmentation/
  ├── churn_prediction/
  ├── expiry_risk/
  ├── digital_adoption/
  ├── spending_analysis/
  ├── nps_scoring/
  ├── voucher_forecast/
  ├── agent_demand/
  └── transaction_classification/
```

---

## 6. Namibia-Specific Considerations

### 6.1 Demographic Context

- **Population:** ~2.5 million
- **Unbanked:** ~70% (cash-dependent)
- **Median Age:** 22 years
- **Youth (under 35):** 71.1%
- **Grant Amount:** N$1,600-3,000/month

### 6.2 Regional Patterns

- **Urban (Windhoek, Swakopmund):** Higher merchant diversity, digital adoption
- **Rural:** Limited access, cash-dependent, agent network critical

### 6.3 G2P Context

- Voucher-based social grants
- Quarterly disbursement cycles
- Multiple redemption channels (Wallet, NamPost, SmartPay)
- Proof-of-life requirements

---

## 7. Compliance & Ethics

### 7.1 Model Explainability

- All credit decisions include feature importance explanations
- Decision tree rules extracted for regulatory transparency
- GMM provides probabilistic segmentation

### 7.2 Fairness

- Class-balanced training for protected groups
- Regional fairness checks (urban vs rural)
- Age-appropriate product recommendations

### 7.3 Data Privacy

- No PII in model training data
- Feature store with access controls
- Prediction logging for audit trails

---

## 8. Implementation Notes

### 8.1 Dependencies

```python
numpy>=1.21.0
pandas>=1.3.0
scikit-learn>=1.0.0
joblib>=1.1.0
torch>=2.0.0  # For neural network
asyncpg>=0.27.0  # For database
```

### 8.2 Loading Models

```python
from buffr_ai.ml.fraud_detection import load_fraud_models
from buffr_ai.ml.credit_scoring import load_credit_models

# At startup
fraud_ensemble = await load_fraud_models()
credit_ensemble = await load_credit_models()
```

### 8.3 Real-time Inference

```python
# Example: Fraud detection
fraud_features = FraudFeatures(
    amount_normalized=0.5,
    # ... other features
)
result = fraud_ensemble.predict_ensemble(fraud_features.to_array())
```

---

This document should be used in conjunction with PRD.md for complete Buffr G2P implementation guidance.
