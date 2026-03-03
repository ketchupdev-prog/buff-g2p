"""
Expiry Risk Ensemble

3-model ensemble for predicting voucher expiry risk (unredeemed):
1. Logistic Regression (baseline, explainable)
2. Random Forest (ensemble, feature importance)
3. Gradient Boosting (high accuracy)
"""

import numpy as np
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from pathlib import Path
import joblib
import logging

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
)

logger = logging.getLogger(__name__)

INTERVENTIONS = {
    "High": "agent_outreach",
    "Medium": "sms_reminder",
    "Low": "no_action",
}


@dataclass
class ExpiryRiskFeatures:
    """Feature vector for expiry risk prediction (12 features)."""
    days_since_issue: int
    days_until_expiry: int
    grant_type_encoded: int
    amount_normalized: float
    region_encoded: int
    beneficiary_activity_score: float
    similar_voucher_redemption_rate: float
    channel_availability_score: float
    has_used_app: int
    has_used_ussd: int
    nearest_agent_distance_km: float
    notification_sent_count: int

    def to_array(self) -> np.ndarray:
        return np.array([
            self.days_since_issue, self.days_until_expiry,
            self.grant_type_encoded, self.amount_normalized,
            self.region_encoded, self.beneficiary_activity_score,
            self.similar_voucher_redemption_rate, self.channel_availability_score,
            self.has_used_app, self.has_used_ussd,
            self.nearest_agent_distance_km, self.notification_sent_count,
        ])


class ExpiryRiskEnsemble:
    """3-model ensemble for voucher expiry risk prediction."""

    def __init__(self):
        self.logistic_model: Optional[LogisticRegression] = None
        self.rf_model: Optional[RandomForestClassifier] = None
        self.gb_model: Optional[GradientBoostingClassifier] = None
        self.scaler = StandardScaler()
        self.ensemble_weights = {
            'logistic': 0.25, 'random_forest': 0.35, 'gradient_boosting': 0.40,
        }
        self.is_trained = False
        self.feature_names = [
            'days_since_issue', 'days_until_expiry',
            'grant_type_encoded', 'amount_normalized',
            'region_encoded', 'beneficiary_activity_score',
            'similar_voucher_redemption_rate', 'channel_availability_score',
            'has_used_app', 'has_used_ussd',
            'nearest_agent_distance_km', 'notification_sent_count',
        ]

    def train(
        self, X_train: np.ndarray, y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None, y_val: Optional[np.ndarray] = None,
    ) -> Dict[str, float]:
        logger.info("Training Expiry Risk Ensemble...")
        X_scaled = self.scaler.fit_transform(X_train)

        self.logistic_model = LogisticRegression(
            penalty='l2', C=1.0, solver='lbfgs', max_iter=1000,
            class_weight='balanced', random_state=42,
        )
        self.logistic_model.fit(X_scaled, y_train)

        self.rf_model = RandomForestClassifier(
            n_estimators=200, max_depth=12, min_samples_split=15,
            min_samples_leaf=8, class_weight='balanced_subsample',
            n_jobs=-1, random_state=42,
        )
        self.rf_model.fit(X_scaled, y_train)

        self.gb_model = GradientBoostingClassifier(
            n_estimators=150, max_depth=5, learning_rate=0.1,
            subsample=0.8, random_state=42,
        )
        self.gb_model.fit(X_scaled, y_train)

        self.is_trained = True

        if X_val is not None and y_val is not None:
            return self.evaluate(X_val, y_val)
        return {}

    def predict(self, features: np.ndarray) -> Dict[str, Any]:
        if not self.is_trained:
            raise ValueError("Models must be trained before prediction")
        if features.ndim == 1:
            features = features.reshape(1, -1)

        features_scaled = self.scaler.transform(features)

        p_lr = self.logistic_model.predict_proba(features_scaled)[:, 1]
        p_rf = self.rf_model.predict_proba(features_scaled)[:, 1]
        p_gb = self.gb_model.predict_proba(features_scaled)[:, 1]

        prob = (
            self.ensemble_weights['logistic'] * p_lr +
            self.ensemble_weights['random_forest'] * p_rf +
            self.ensemble_weights['gradient_boosting'] * p_gb
        )

        expiry_prob = float(prob[0])
        if expiry_prob >= 0.7:
            risk_tier = "High"
        elif expiry_prob >= 0.4:
            risk_tier = "Medium"
        else:
            risk_tier = "Low"

        intervention = INTERVENTIONS[risk_tier]

        # Top risk factors from RF feature importance
        top_factors: List[Dict[str, Any]] = []
        if self.rf_model is not None:
            importances = self.rf_model.feature_importances_
            top_idx = np.argsort(importances)[::-1][:5]
            top_factors = [
                {"feature": self.feature_names[i], "importance": float(importances[i])}
                for i in top_idx
            ]

        # Similar voucher stats
        similar_stats = {
            "similar_voucher_redemption_rate": round(float(features[0, 6]), 4),
            "channel_availability": round(float(features[0, 7]), 4),
        }

        return {
            "expiry_probability": round(expiry_prob, 4),
            "risk_tier": risk_tier,
            "recommended_intervention": intervention,
            "top_risk_factors": top_factors,
            "similar_voucher_stats": similar_stats,
        }

    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        X_scaled = self.scaler.transform(X_test)
        probs = (
            self.ensemble_weights['logistic'] * self.logistic_model.predict_proba(X_scaled)[:, 1] +
            self.ensemble_weights['random_forest'] * self.rf_model.predict_proba(X_scaled)[:, 1] +
            self.ensemble_weights['gradient_boosting'] * self.gb_model.predict_proba(X_scaled)[:, 1]
        )
        y_pred = (probs > 0.5).astype(int)
        return {
            'accuracy': float(np.mean(y_pred == y_test)),
            'precision': float(precision_score(y_test, y_pred, zero_division=0)),
            'recall': float(recall_score(y_test, y_pred, zero_division=0)),
            'f1_score': float(f1_score(y_test, y_pred, zero_division=0)),
            'roc_auc': float(roc_auc_score(y_test, probs)),
        }

    def save(self, directory: Path):
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.logistic_model, directory / 'logistic_model.pkl')
        joblib.dump(self.rf_model, directory / 'random_forest_model.pkl')
        joblib.dump(self.gb_model, directory / 'gradient_boosting_model.pkl')
        joblib.dump(self.scaler, directory / 'scaler.pkl')
        joblib.dump({
            'ensemble_weights': self.ensemble_weights,
            'feature_names': self.feature_names,
            'is_trained': self.is_trained,
        }, directory / 'metadata.pkl')
        logger.info(f"Expiry risk models saved to {directory}")

    def load(self, directory: Path):
        directory = Path(directory)
        self.logistic_model = joblib.load(directory / 'logistic_model.pkl')
        self.rf_model = joblib.load(directory / 'random_forest_model.pkl')
        self.gb_model = joblib.load(directory / 'gradient_boosting_model.pkl')
        self.scaler = joblib.load(directory / 'scaler.pkl')
        metadata = joblib.load(directory / 'metadata.pkl')
        self.ensemble_weights = metadata['ensemble_weights']
        self.feature_names = metadata['feature_names']
        self.is_trained = metadata['is_trained']
        logger.info(f"Expiry risk models loaded from {directory}")


async def load_expiry_models() -> ExpiryRiskEnsemble:
    import os
    model_dir = Path(os.getenv('MODEL_DIR', 'buffr_ai/models/expiry_risk'))
    ensemble = ExpiryRiskEnsemble()
    if model_dir.exists():
        try:
            ensemble.load(model_dir)
            logger.info("Expiry risk models loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load expiry risk models: {e}.")
    else:
        logger.warning(f"Expiry risk model directory {model_dir} does not exist.")
    return ensemble
