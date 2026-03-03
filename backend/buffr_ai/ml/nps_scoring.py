"""
NPS / Satisfaction Scoring Ensemble

3-model regression ensemble for predicting user satisfaction:
1. Gradient Boosting Regressor (high accuracy)
2. Random Forest Regressor (robust, feature importance)
3. Ridge Regression (baseline, fast)
"""

import numpy as np
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from pathlib import Path
import joblib
import logging

from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

logger = logging.getLogger(__name__)


@dataclass
class NPSFeatures:
    """Feature vector for NPS scoring (12 features)."""
    tx_success_rate: float
    avg_response_time_ms: float
    support_ticket_count_30d: int
    complaint_count_90d: int
    notification_read_rate: float
    feature_adoption_score: float
    session_frequency: int
    tx_volume_30d: float
    failed_tx_count_30d: int
    days_since_last_complaint: int
    onboarding_complete: int
    account_age_days: int

    def to_array(self) -> np.ndarray:
        return np.array([
            self.tx_success_rate, self.avg_response_time_ms,
            self.support_ticket_count_30d, self.complaint_count_90d,
            self.notification_read_rate, self.feature_adoption_score,
            self.session_frequency, self.tx_volume_30d,
            self.failed_tx_count_30d, self.days_since_last_complaint,
            self.onboarding_complete, self.account_age_days,
        ])


class NPSScoringEnsemble:
    """3-model regression ensemble for NPS prediction."""

    def __init__(self):
        self.gb_model: Optional[GradientBoostingRegressor] = None
        self.rf_model: Optional[RandomForestRegressor] = None
        self.ridge_model: Optional[Ridge] = None
        self.scaler = StandardScaler()
        self.ensemble_weights = {
            'gradient_boosting': 0.40, 'random_forest': 0.35, 'ridge': 0.25,
        }
        self.is_trained = False
        self.feature_names = [
            'tx_success_rate', 'avg_response_time_ms',
            'support_ticket_count_30d', 'complaint_count_90d',
            'notification_read_rate', 'feature_adoption_score',
            'session_frequency', 'tx_volume_30d',
            'failed_tx_count_30d', 'days_since_last_complaint',
            'onboarding_complete', 'account_age_days',
        ]

    def train(
        self, X_train: np.ndarray, y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None, y_val: Optional[np.ndarray] = None,
    ) -> Dict[str, float]:
        logger.info("Training NPS Scoring Ensemble...")
        X_train_scaled = self.scaler.fit_transform(X_train)

        self.gb_model = GradientBoostingRegressor(
            n_estimators=150, max_depth=5, learning_rate=0.1,
            subsample=0.8, random_state=42,
        )
        self.gb_model.fit(X_train_scaled, y_train)

        self.rf_model = RandomForestRegressor(
            n_estimators=200, max_depth=12, min_samples_split=10,
            n_jobs=-1, random_state=42,
        )
        self.rf_model.fit(X_train_scaled, y_train)

        self.ridge_model = Ridge(alpha=1.0)
        self.ridge_model.fit(X_train_scaled, y_train)

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

        p_gb = self.gb_model.predict(features_scaled)
        p_rf = self.rf_model.predict(features_scaled)
        p_ridge = self.ridge_model.predict(features_scaled)

        score = (
            self.ensemble_weights['gradient_boosting'] * p_gb +
            self.ensemble_weights['random_forest'] * p_rf +
            self.ensemble_weights['ridge'] * p_ridge
        )
        nps = int(np.clip(score[0], 0, 100))

        if nps >= 70:
            tier = "Promoter"
        elif nps >= 50:
            tier = "Passive"
        else:
            tier = "Detractor"

        # Key drivers from RF feature importance
        key_drivers = []
        improvement_areas = []
        if self.rf_model is not None:
            importances = self.rf_model.feature_importances_
            top_idx = np.argsort(importances)[::-1][:5]
            for i in top_idx:
                entry = {"feature": self.feature_names[i], "importance": float(importances[i])}
                if features[0, i] > 0.5 or (self.feature_names[i] == 'tx_success_rate' and features[0, i] > 0.9):
                    key_drivers.append(entry)
                else:
                    improvement_areas.append(entry)

        return {
            "nps_score": nps,
            "satisfaction_tier": tier,
            "key_drivers": key_drivers[:3],
            "improvement_areas": improvement_areas[:3],
        }

    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        X_scaled = self.scaler.transform(X_test)
        preds = (
            self.ensemble_weights['gradient_boosting'] * self.gb_model.predict(X_scaled) +
            self.ensemble_weights['random_forest'] * self.rf_model.predict(X_scaled) +
            self.ensemble_weights['ridge'] * self.ridge_model.predict(X_scaled)
        )
        return {
            'mae': float(mean_absolute_error(y_test, preds)),
            'rmse': float(np.sqrt(mean_squared_error(y_test, preds))),
            'r_squared': float(r2_score(y_test, preds)),
        }

    def save(self, directory: Path):
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.gb_model, directory / 'gradient_boosting_model.pkl')
        joblib.dump(self.rf_model, directory / 'random_forest_model.pkl')
        joblib.dump(self.ridge_model, directory / 'ridge_model.pkl')
        joblib.dump(self.scaler, directory / 'scaler.pkl')
        joblib.dump({
            'ensemble_weights': self.ensemble_weights,
            'feature_names': self.feature_names,
            'is_trained': self.is_trained,
        }, directory / 'metadata.pkl')
        logger.info(f"NPS models saved to {directory}")

    def load(self, directory: Path):
        directory = Path(directory)
        self.gb_model = joblib.load(directory / 'gradient_boosting_model.pkl')
        self.rf_model = joblib.load(directory / 'random_forest_model.pkl')
        self.ridge_model = joblib.load(directory / 'ridge_model.pkl')
        self.scaler = joblib.load(directory / 'scaler.pkl')
        metadata = joblib.load(directory / 'metadata.pkl')
        self.ensemble_weights = metadata['ensemble_weights']
        self.feature_names = metadata['feature_names']
        self.is_trained = metadata['is_trained']
        logger.info(f"NPS models loaded from {directory}")


async def load_nps_models() -> NPSScoringEnsemble:
    import os
    model_dir = Path(os.getenv('MODEL_DIR', 'buffr_ai/models/nps_scoring'))
    ensemble = NPSScoringEnsemble()
    if model_dir.exists():
        try:
            ensemble.load(model_dir)
            logger.info("NPS scoring models loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load NPS models: {e}. Using untrained ensemble.")
    else:
        logger.warning(f"NPS model directory {model_dir} does not exist.")
    return ensemble
