"""
ML Service - Unified Machine Learning Interface

Provides a unified API for all ML models in the Buffr G2P ecosystem.
This service wraps all 13 ML ensembles and provides:
- Real-time predictions
- Batch processing
- Model health monitoring
- Integration with AI Companion

Trained weights are loaded from backend/buffr_ai/models/<model_name>/ when present.
"""

import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

# Base path for serialized models (resolved from this file so CWD-independent)
_MODELS_BASE = Path(__file__).resolve().parent / "models"


class MLModelType(str, Enum):
    """Available ML models in the Buffr ecosystem."""
    FRAUD_DETECTION = "fraud_detection"
    CREDIT_SCORING = "credit_scoring"
    CHURN_PREDICTION = "churn_prediction"
    NPS_SCORING = "nps_scoring"
    DIGITAL_ADOPTION = "digital_adoption"
    BENEFICIARY_SEGMENTATION = "beneficiary_segmentation"
    SPENDING_ANALYSIS = "spending_analysis"
    VOUCHER_FORECAST = "voucher_forecast"
    AGENT_DEMAND = "agent_demand"
    EXPIRY_RISK = "expiry_risk"
    TRANSACTION_CLASSIFICATION = "transaction_classification"
    AGENT_NETWORK_FEATURES = "agent_network_features"


@dataclass
class MLPredictionResult:
    """Standard response format for ML predictions."""
    model: str
    prediction: Any
    confidence: float
    risk_level: Optional[str] = None
    recommendations: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class MLService:
    """
    Unified ML Service for Buffr G2P
    
    Provides a single interface to access all ML models:
    - Fraud Detection (Guardian Agent)
    - Credit Scoring (Guardian Agent)
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
    """
    
    def __init__(self):
        self._models: Dict[MLModelType, Any] = {}
        self._initialized = False
        logger.info("ML Service initialized")
    
    def initialize(self) -> bool:
        """
        Initialize all ML models.
        Returns True if all models loaded successfully.
        """
        if self._initialized:
            return True
            
        try:
            # Import all ML models
            from buffr_ai.ml import (
                FraudDetectionEnsemble,
                CreditScoringEnsemble,
                ChurnPredictionEnsemble,
                NPSScoringEnsemble,
                DigitalAdoptionEngine,
                BeneficiarySegmentationEngine,
                SpendingAnalysisEngine,
                VoucherRedemptionForecaster,
                AgentDemandForecaster,
                ExpiryRiskEnsemble,
                TransactionClassifier,
                AgentNetworkFeatureExtractor,
                ML_AVAILABLE,
                G2P_ML_AVAILABLE
            )
            
            if not ML_AVAILABLE:
                logger.warning("Core ML models not available (missing dependencies)")
                return False
            
            # Initialize models (lazy initialization - only when needed)
            self._models = {
                MLModelType.FRAUD_DETECTION: FraudDetectionEnsemble(),
                MLModelType.CREDIT_SCORING: CreditScoringEnsemble(),
                MLModelType.CHURN_PREDICTION: ChurnPredictionEnsemble(),
                MLModelType.NPS_SCORING: NPSScoringEnsemble(),
                MLModelType.DIGITAL_ADOPTION: DigitalAdoptionEngine(),
                MLModelType.BENEFICIARY_SEGMENTATION: BeneficiarySegmentationEngine(),
                MLModelType.SPENDING_ANALYSIS: SpendingAnalysisEngine(),
                MLModelType.VOUCHER_FORECAST: VoucherRedemptionForecaster(),
                MLModelType.AGENT_DEMAND: AgentDemandForecaster(),
                MLModelType.EXPIRY_RISK: ExpiryRiskEnsemble(),
                MLModelType.TRANSACTION_CLASSIFICATION: TransactionClassifier(),
                MLModelType.AGENT_NETWORK_FEATURES: AgentNetworkFeatureExtractor(),
            }

            # Load trained weights from backend/buffr_ai/models/ when present
            self._load_trained_weights()

            # Load trained weights from backend/buffr_ai/models/ when present
            self._load_trained_weights()

            self._initialized = True
            logger.info(f"ML Service initialized with {len(self._models)} models")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize ML models: {e}")
            return False

    def _load_trained_weights(self) -> None:
        """Load trained weights from backend/buffr_ai/models/<model_name>/ when directory exists."""
        for model_type in self._models:
            model_dir = _MODELS_BASE / model_type.value
            if not model_dir.is_dir():
                logger.debug(f"No trained weights at {model_dir}, using untrained {model_type.value}")
                continue
            model = self._models[model_type]
            if not hasattr(model, "load"):
                continue
            try:
                model.load(model_dir)
                logger.info(f"Loaded trained weights for {model_type.value} from {model_dir}")
            except Exception as e:
                logger.warning(f"Could not load weights for {model_type.value} from {model_dir}: {e}")

    
    def predict(self, model_type: MLModelType, features: Dict[str, Any]) -> MLPredictionResult:
        """
        Get prediction from a specific ML model.
        
        Args:
            model_type: Type of ML model to use
            features: Input features for prediction
            
        Returns:
            MLPredictionResult with prediction, confidence, and recommendations
        """
        if not self._initialized:
            self.initialize()
        
        model = self._models.get(model_type)
        if not model:
            raise ValueError(f"Model {model_type} not found")
        
        try:
            # Convert features to numpy array
            import numpy as np
            feature_array = np.array([[features.get(f, 0) for f in self._get_feature_names(model_type)]])
            
            # Get prediction based on model type
            if model_type == MLModelType.FRAUD_DETECTION:
                result = model.predict_ensemble(feature_array)
                return MLPredictionResult(
                    model=model_type.value,
                    prediction=result.get("fraud_probability", 0),
                    confidence=result.get("confidence", 0),
                    risk_level=result.get("risk_level", "unknown"),
                    recommendations=result.get("recommendations", []),
                    metadata=result
                )
                
            elif model_type == MLModelType.CREDIT_SCORING:
                result = model.predict(feature_array)
                return MLPredictionResult(
                    model=model_type.value,
                    prediction=result.get("credit_score", 0),
                    confidence=result.get("confidence", 0),
                    risk_level=result.get("risk_category", "unknown"),
                    recommendations=result.get("recommendations", []),
                    metadata=result
                )
                
            elif model_type == MLModelType.CHURN_PREDICTION:
                result = model.predict(feature_array)
                return MLPredictionResult(
                    model=model_type.value,
                    prediction=result.get("churn_probability", 0),
                    confidence=result.get("confidence", 0),
                    risk_level=result.get("risk_level", "unknown"),
                    recommendations=result.get("recommendations", []),
                    metadata=result
                )
                
            elif model_type == MLModelType.NPS_SCORING:
                result = model.predict(feature_array)
                return MLPredictionResult(
                    model=model_type.value,
                    prediction=result.get("nps_score", 0),
                    confidence=result.get("confidence", 0),
                    metadata=result
                )
                
            elif model_type == MLModelType.DIGITAL_ADOPTION:
                result = model.predict(feature_array)
                return MLPredictionResult(
                    model=model_type.value,
                    prediction=result.get("adoption_score", 0),
                    confidence=result.get("confidence", 0),
                    risk_level=result.get("segment", "unknown"),
                    recommendations=result.get("recommendations", []),
                    metadata=result
                )
                
            elif model_type == MLModelType.BENEFICIARY_SEGMENTATION:
                result = model.predict(feature_array)
                return MLPredictionResult(
                    model=model_type.value,
                    prediction=result.get("segment", "unknown"),
                    confidence=result.get("confidence", 0),
                    metadata=result
                )
                
            elif model_type == MLModelType.SPENDING_ANALYSIS:
                result = model.predict(feature_array)
                return MLPredictionResult(
                    model=model_type.value,
                    prediction=result.get("segment", "unknown"),
                    confidence=result.get("confidence", 0),
                    risk_level=result.get("spending_pattern", "unknown"),
                    recommendations=result.get("recommendations", []),
                    metadata=result
                )
                
            elif model_type == MLModelType.VOUCHER_FORECAST:
                result = model.predict(feature_array)
                return MLPredictionResult(
                    model=model_type.value,
                    prediction=result.get("redemption_rate", 0),
                    confidence=result.get("confidence", 0),
                    metadata=result
                )
                
            elif model_type == MLModelType.AGENT_DEMAND:
                result = model.predict(feature_array)
                return MLPredictionResult(
                    model=model_type.value,
                    prediction=result.get("demand_forecast", 0),
                    confidence=result.get("confidence", 0),
                    metadata=result
                )
                
            elif model_type == MLModelType.EXPIRY_RISK:
                result = model.predict(feature_array)
                return MLPredictionResult(
                    model=model_type.value,
                    prediction=result.get("expiry_risk", 0),
                    confidence=result.get("confidence", 0),
                    risk_level=result.get("risk_level", "unknown"),
                    recommendations=result.get("recommendations", []),
                    metadata=result
                )
                
            elif model_type == MLModelType.TRANSACTION_CLASSIFICATION:
                result = model.predict(feature_array)
                return MLPredictionResult(
                    model=model_type.value,
                    prediction=result.get("category", "unknown"),
                    confidence=result.get("confidence", 0),
                    metadata=result
                )
                
            elif model_type == MLModelType.AGENT_NETWORK_FEATURES:
                result = model.extract_features(feature_array)
                return MLPredictionResult(
                    model=model_type.value,
                    prediction=result.get("features", {}),
                    confidence=1.0,
                    metadata=result
                )
                
            else:
                raise ValueError(f"Unsupported model type: {model_type}")
                
        except Exception as e:
            logger.error(f"Prediction failed for {model_type}: {e}")
            raise
    
    def _get_feature_names(self, model_type: MLModelType) -> List[str]:
        """Get expected feature names for each model type."""
        feature_maps = {
            MLModelType.FRAUD_DETECTION: [
                "amount", "hour_of_day", "day_of_week", "transaction_frequency",
                "avg_transaction_amount", "distance_from_home", "device_score",
                "account_age_days", "num_failed_attempts", "velocity_1h",
                "velocity_24h", "merchant_category", "country_risk_score"
            ],
            MLModelType.CREDIT_SCORING: [
                "monthly_income", "transaction_count", "avg_balance",
                "credit_utilization", "payment_history", "debt_to_income",
                "employment_length", "num_credit_lines", "num_inquiries",
                "loan_amount", "loan_term", "interest_rate"
            ],
            # Add more feature maps as needed
        }
        return feature_maps.get(model_type, [f"feature_{i}" for i in range(20)])
    
    def get_available_models(self) -> List[str]:
        """Get list of available ML models."""
        return [model.value for model in MLModelType]
    
    def get_model_status(self) -> Dict[str, Any]:
        """Get status of all ML models."""
        return {
            "initialized": self._initialized,
            "models_available": len(self._models),
            "models": list(MLModelType.__members__.keys())
        }


# Singleton instance for global use
_ml_service: Optional[MLService] = None


def get_ml_service() -> MLService:
    """Get the singleton ML service instance."""
    global _ml_service
    if _ml_service is None:
        _ml_service = MLService()
    return _ml_service


def predict_fraud(features: Dict[str, Any]) -> MLPredictionResult:
    """Convenience function for fraud detection."""
    return get_ml_service().predict(MLModelType.FRAUD_DETECTION, features)


def predict_credit_score(features: Dict[str, Any]) -> MLPredictionResult:
    """Convenience function for credit scoring."""
    return get_ml_service().predict(MLModelType.CREDIT_SCORING, features)


def predict_churn(features: Dict[str, Any]) -> MLPredictionResult:
    """Convenience function for churn prediction."""
    return get_ml_service().predict(MLModelType.CHURN_PREDICTION, features)


def analyze_spending(features: Dict[str, Any]) -> MLPredictionResult:
    """Convenience function for spending analysis."""
    return get_ml_service().predict(MLModelType.SPENDING_ANALYSIS, features)
