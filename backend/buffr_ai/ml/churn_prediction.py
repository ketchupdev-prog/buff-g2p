"""
Churn Prediction Ensemble

3-model ensemble for predicting beneficiary/agent attrition risk:
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
    precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
)

logger = logging.getLogger(__name__)


@dataclass
class ChurnFeatures:
    """Feature vector for churn prediction (15 features)."""
    tx_count_30d: int
    tx_count_trend: float
    days_since_last_tx: int
    voucher_redemption_count_30d: int
    days_since_last_redemption: int
    avg_tx_amount_30d: float
    notification_read_rate: float
    wallet_balance_trend: float
    login_frequency_30d: int
    session_count_30d: int
    unique_merchants_30d: int
    has_savings_goal: int
    has_active_autopay: int
    account_age_days: int
    region_encoded: int

    def to_array(self) -> np.ndarray:
        return np.array([
            self.tx_count_30d, self.tx_count_trend, self.days_since_last_tx,
            self.voucher_redemption_count_30d, self.days_since_last_redemption,
            self.avg_tx_amount_30d, self.notification_read_rate,
            self.wallet_balance_trend, self.login_frequency_30d,
            self.session_count_30d, self.unique_merchants_30d,
            self.has_savings_goal, self.has_active_autopay,
            self.account_age_days, self.region_encoded,
        ])


class ChurnPredictionEnsemble:
    """3-model ensemble for churn prediction."""

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
            'tx_count_30d', 'tx_count_trend', 'days_since_last_tx',
            'voucher_redemption_count_30d', 'days_since_last_redemption',
            'avg_tx_amount_30d', 'notification_read_rate',
            'wallet_balance_trend', 'login_frequency_30d',
            'session_count_30d', 'unique_merchants_30d',
            'has_savings_goal', 'has_active_autopay',
            'account_age_days', 'region_encoded',
        ]

    def train(
        self, X_train: np.ndarray, y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None, y_val: Optional[np.ndarray] = None,
    ) -> Dict[str, float]:
        logger.info("Training Churn Prediction Ensemble...")
        X_train_scaled = self.scaler.fit_transform(X_train)

        self.logistic_model = LogisticRegression(
            penalty='l2', C=1.0, solver='lbfgs', max_iter=1000,
            class_weight='balanced', random_state=42,
        )
        self.logistic_model.fit(X_train_scaled, y_train)

        self.rf_model = RandomForestClassifier(
            n_estimators=200, max_depth=12, min_samples_split=15,
            min_samples_leaf=8, class_weight='balanced_subsample',
            n_jobs=-1, random_state=42,
        )
        self.rf_model.fit(X_train_scaled, y_train)

        self.gb_model = GradientBoostingClassifier(
            n_estimators=150, max_depth=5, learning_rate=0.1,
            subsample=0.8, random_state=42,
        )
        self.gb_model.fit(X_train_scaled, y_train)

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

        churn_prob = float(prob[0])
        if churn_prob >= 0.7:
            risk_tier = "High"
        elif churn_prob >= 0.4:
            risk_tier = "Medium"
        else:
            risk_tier = "Low"

        days_estimate = max(7, int((1 - churn_prob) * 90))

        # Top risk factors from RF feature importance
        top_factors = []
        if self.rf_model is not None:
            importances = self.rf_model.feature_importances_
            top_idx = np.argsort(importances)[::-1][:5]
            top_factors = [
                {"feature": self.feature_names[i], "importance": float(importances[i])}
                for i in top_idx
            ]

        return {
            "churn_probability": churn_prob,
            "risk_tier": risk_tier,
            "days_to_churn_estimate": days_estimate,
            "top_risk_factors": top_factors,
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
        logger.info(f"Churn models saved to {directory}")

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
        logger.info(f"Churn models loaded from {directory}")


async def load_churn_models() -> ChurnPredictionEnsemble:
    import os
    model_dir = Path(os.getenv('MODEL_DIR', 'buffr_ai/models/churn_prediction'))
    ensemble = ChurnPredictionEnsemble()
    if model_dir.exists():
        try:
            ensemble.load(model_dir)
            logger.info("Churn prediction models loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load churn models: {e}. Using untrained ensemble.")
    else:
        logger.warning(f"Churn model directory {model_dir} does not exist.")
    return ensemble
