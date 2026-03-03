"""
Buffr AI - Machine Learning Module

Comprehensive ML models for financial intelligence:
- Fraud Detection (Guardian Agent)
- Credit Scoring (Guardian Agent)
- Spending Analysis (Transaction Analyst Agent)
- Transaction Classification (Transaction Analyst Agent)
- Churn Prediction
- NPS Scoring
- Digital Adoption
- Beneficiary Segmentation
- Voucher Redemption Forecast
- Agent Demand Forecast
- Expiry Risk
"""

# Optional imports - graceful degradation if pandas/sklearn not available
try:
    from buffr_ai.ml.fraud_detection import FraudDetectionEnsemble
    from buffr_ai.ml.credit_scoring import CreditScoringEnsemble
    from buffr_ai.ml.spending_analysis import SpendingAnalysisEngine
    from buffr_ai.ml.transaction_classification import TransactionClassifier
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    FraudDetectionEnsemble = None
    CreditScoringEnsemble = None
    SpendingAnalysisEngine = None
    TransactionClassifier = None

# G2P-specific models (optional, graceful degradation)
try:
    from buffr_ai.ml.churn_prediction import ChurnPredictionEnsemble
    from buffr_ai.ml.nps_scoring import NPSScoringEnsemble
    from buffr_ai.ml.digital_adoption import DigitalAdoptionEngine
    from buffr_ai.ml.beneficiary_segmentation import BeneficiarySegmentationEngine
    from buffr_ai.ml.voucher_forecast import VoucherRedemptionForecaster
    from buffr_ai.ml.agent_demand import AgentDemandForecaster
    from buffr_ai.ml.expiry_risk import ExpiryRiskEnsemble
    from buffr_ai.ml.agent_network_features import AgentNetworkFeatureExtractor
    G2P_ML_AVAILABLE = True
except ImportError:
    G2P_ML_AVAILABLE = False
    ChurnPredictionEnsemble = None
    NPSScoringEnsemble = None
    DigitalAdoptionEngine = None
    BeneficiarySegmentationEngine = None
    VoucherRedemptionForecaster = None
    AgentDemandForecaster = None
    ExpiryRiskEnsemble = None
    AgentNetworkFeatureExtractor = None

__all__ = [
    'FraudDetectionEnsemble',
    'CreditScoringEnsemble',
    'SpendingAnalysisEngine',
    'TransactionClassifier',
    'ChurnPredictionEnsemble',
    'NPSScoringEnsemble',
    'DigitalAdoptionEngine',
    'BeneficiarySegmentationEngine',
    'VoucherRedemptionForecaster',
    'AgentDemandForecaster',
    'ExpiryRiskEnsemble',
    'AgentNetworkFeatureExtractor',
    'ML_AVAILABLE',
    'G2P_ML_AVAILABLE',
]

__version__ = '1.1.0'
