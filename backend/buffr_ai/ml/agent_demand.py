"""
Agent Demand Forecaster

2-model regression ensemble for predicting daily agent float demand:
1. Gradient Boosting Regressor (high accuracy)
2. Ridge Regression (baseline, fast)
"""

import numpy as np
from typing import Dict, Any, Optional
from dataclasses import dataclass
from pathlib import Path
import joblib
import logging

from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

logger = logging.getLogger(__name__)


@dataclass
class AgentDemandFeatures:
    """Feature vector for agent demand forecasting (10 features)."""
    day_of_week: int
    day_of_month: int
    is_payday_week: int
    region_encoded: int
    agent_count_in_region: int
    active_beneficiaries_in_region: int
    avg_historical_daily_demand: float
    seasonal_index: float
    recent_7d_avg_demand: float
    pending_voucher_value_in_region: float

    def to_array(self) -> np.ndarray:
        return np.array([
            self.day_of_week, self.day_of_month,
            self.is_payday_week, self.region_encoded,
            self.agent_count_in_region, self.active_beneficiaries_in_region,
            self.avg_historical_daily_demand, self.seasonal_index,
            self.recent_7d_avg_demand, self.pending_voucher_value_in_region,
        ])


class AgentDemandForecaster:
    """2-model regression ensemble for agent daily demand prediction."""

    def __init__(self):
        self.gb_model: Optional[GradientBoostingRegressor] = None
        self.ridge_model: Optional[Ridge] = None
        self.scaler = StandardScaler()
        self.ensemble_weights = {
            'gradient_boosting': 0.65, 'ridge': 0.35,
        }
        self.is_trained = False
        self.feature_names = [
            'day_of_week', 'day_of_month',
            'is_payday_week', 'region_encoded',
            'agent_count_in_region', 'active_beneficiaries_in_region',
            'avg_historical_daily_demand', 'seasonal_index',
            'recent_7d_avg_demand', 'pending_voucher_value_in_region',
        ]

    def train(
        self, X_train: np.ndarray, y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None, y_val: Optional[np.ndarray] = None,
    ) -> Dict[str, float]:
        logger.info("Training Agent Demand Forecaster...")
        X_scaled = self.scaler.fit_transform(X_train)

        self.gb_model = GradientBoostingRegressor(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            subsample=0.8, random_state=42,
        )
        self.gb_model.fit(X_scaled, y_train)

        self.ridge_model = Ridge(alpha=1.0)
        self.ridge_model.fit(X_scaled, y_train)

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
        p_ridge = self.ridge_model.predict(features_scaled)

        demand = (
            self.ensemble_weights['gradient_boosting'] * p_gb +
            self.ensemble_weights['ridge'] * p_ridge
        )
        predicted_demand = max(0.0, float(demand[0]))

        # Recommended float = 1.2x predicted demand (20% buffer)
        recommended_float = round(predicted_demand * 1.2, 2)

        # Restock alert if predicted demand > 80% of historical average
        historical_avg = float(features[0, 6])  # avg_historical_daily_demand
        restock_alert = predicted_demand > (historical_avg * 0.8) if historical_avg > 0 else False

        # Confidence based on how close models agree
        model_spread = abs(float(p_gb[0]) - float(p_ridge[0]))
        confidence = max(0.5, 1.0 - (model_spread / max(predicted_demand, 1.0)))

        return {
            "predicted_daily_demand": round(predicted_demand, 2),
            "recommended_float": recommended_float,
            "restock_alert": restock_alert,
            "confidence": round(confidence, 4),
        }

    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        X_scaled = self.scaler.transform(X_test)
        preds = (
            self.ensemble_weights['gradient_boosting'] * self.gb_model.predict(X_scaled) +
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
        joblib.dump(self.ridge_model, directory / 'ridge_model.pkl')
        joblib.dump(self.scaler, directory / 'scaler.pkl')
        joblib.dump({
            'ensemble_weights': self.ensemble_weights,
            'feature_names': self.feature_names,
            'is_trained': self.is_trained,
        }, directory / 'metadata.pkl')
        logger.info(f"Agent demand models saved to {directory}")

    def load(self, directory: Path):
        directory = Path(directory)
        self.gb_model = joblib.load(directory / 'gradient_boosting_model.pkl')
        self.ridge_model = joblib.load(directory / 'ridge_model.pkl')
        self.scaler = joblib.load(directory / 'scaler.pkl')
        metadata = joblib.load(directory / 'metadata.pkl')
        self.ensemble_weights = metadata['ensemble_weights']
        self.feature_names = metadata['feature_names']
        self.is_trained = metadata['is_trained']
        logger.info(f"Agent demand models loaded from {directory}")


async def load_demand_models() -> AgentDemandForecaster:
    import os
    model_dir = Path(os.getenv('MODEL_DIR', 'buffr_ai/models/agent_demand'))
    forecaster = AgentDemandForecaster()
    if model_dir.exists():
        try:
            forecaster.load(model_dir)
            logger.info("Agent demand models loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load agent demand models: {e}.")
    else:
        logger.warning(f"Agent demand model directory {model_dir} does not exist.")
    return forecaster
