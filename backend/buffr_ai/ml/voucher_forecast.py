"""
Voucher Redemption Forecaster

Dual-model predictor for voucher redemption behaviour:
1. GradientBoostingRegressor — predicts days to redeem
2. RandomForestClassifier — predicts redemption channel
"""

import numpy as np
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from pathlib import Path
import joblib
import logging

from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score

logger = logging.getLogger(__name__)

REDEMPTION_CHANNELS = ["wallet", "cash_out", "bank_transfer", "merchant_payment", "cash_at_till"]


@dataclass
class VoucherForecastFeatures:
    """Feature vector for voucher redemption forecasting (11 features)."""
    days_since_issue: int
    grant_type_encoded: int
    amount_normalized: float
    region_encoded: int
    beneficiary_segment: int
    day_of_week_issued: int
    day_of_month_issued: int
    is_payday_week: int
    historical_avg_days_to_redeem: float
    preferred_channel_encoded: int
    nearby_agent_count: int

    def to_array(self) -> np.ndarray:
        return np.array([
            self.days_since_issue, self.grant_type_encoded,
            self.amount_normalized, self.region_encoded,
            self.beneficiary_segment, self.day_of_week_issued,
            self.day_of_month_issued, self.is_payday_week,
            self.historical_avg_days_to_redeem, self.preferred_channel_encoded,
            self.nearby_agent_count,
        ])


class VoucherRedemptionForecaster:
    """Dual-model forecaster: days-to-redeem (regression) + channel (classification)."""

    def __init__(self):
        self.days_model: Optional[GradientBoostingRegressor] = None
        self.channel_model: Optional[RandomForestClassifier] = None
        self.scaler = StandardScaler()
        self.channel_encoder = LabelEncoder()
        self.is_trained = False
        self.feature_names = [
            'days_since_issue', 'grant_type_encoded',
            'amount_normalized', 'region_encoded',
            'beneficiary_segment', 'day_of_week_issued',
            'day_of_month_issued', 'is_payday_week',
            'historical_avg_days_to_redeem', 'preferred_channel_encoded',
            'nearby_agent_count',
        ]

    def train(
        self, X_train: np.ndarray,
        y_days: np.ndarray, y_channel: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val_days: Optional[np.ndarray] = None,
        y_val_channel: Optional[np.ndarray] = None,
    ) -> Dict[str, Any]:
        logger.info("Training Voucher Redemption Forecaster...")
        X_scaled = self.scaler.fit_transform(X_train)

        # Days-to-redeem regression model
        self.days_model = GradientBoostingRegressor(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            subsample=0.8, random_state=42,
        )
        self.days_model.fit(X_scaled, y_days)

        # Channel classification model
        self.channel_encoder.fit(REDEMPTION_CHANNELS)
        y_channel_encoded = self.channel_encoder.transform(y_channel)

        self.channel_model = RandomForestClassifier(
            n_estimators=150, max_depth=10, min_samples_split=10,
            n_jobs=-1, random_state=42,
        )
        self.channel_model.fit(X_scaled, y_channel_encoded)

        self.is_trained = True

        results: Dict[str, Any] = {
            'days_train_mae': float(mean_absolute_error(y_days, self.days_model.predict(X_scaled))),
            'channel_train_accuracy': float(accuracy_score(
                y_channel_encoded, self.channel_model.predict(X_scaled)
            )),
        }

        if X_val is not None and y_val_days is not None and y_val_channel is not None:
            results.update(self.evaluate(X_val, y_val_days, y_val_channel))

        return results

    def predict(self, features: np.ndarray) -> Dict[str, Any]:
        if not self.is_trained:
            raise ValueError("Models must be trained before prediction")
        if features.ndim == 1:
            features = features.reshape(1, -1)

        features_scaled = self.scaler.transform(features)

        # Predict days to redeem
        days_pred = max(0, float(self.days_model.predict(features_scaled)[0]))

        # Predict channel
        channel_idx = self.channel_model.predict(features_scaled)[0]
        channel = self.channel_encoder.inverse_transform([channel_idx])[0]
        channel_probs = self.channel_model.predict_proba(features_scaled)[0]
        confidence = float(np.max(channel_probs))

        # Similar voucher stats based on features
        similar_stats = {
            "avg_days_to_redeem": round(float(features[0, 8]), 1),  # historical_avg
            "most_common_channel": channel,
        }

        return {
            "predicted_days_to_redeem": round(days_pred, 1),
            "predicted_channel": channel,
            "confidence": round(confidence, 4),
            "similar_voucher_stats": similar_stats,
        }

    def evaluate(
        self, X_test: np.ndarray,
        y_days: np.ndarray, y_channel: np.ndarray,
    ) -> Dict[str, float]:
        X_scaled = self.scaler.transform(X_test)

        days_pred = self.days_model.predict(X_scaled)
        channel_encoded = self.channel_encoder.transform(y_channel)
        channel_pred = self.channel_model.predict(X_scaled)

        return {
            'days_mae': float(mean_absolute_error(y_days, days_pred)),
            'days_rmse': float(np.sqrt(mean_squared_error(y_days, days_pred))),
            'days_r_squared': float(r2_score(y_days, days_pred)),
            'channel_accuracy': float(accuracy_score(channel_encoded, channel_pred)),
        }

    def save(self, directory: Path):
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.days_model, directory / 'days_model.pkl')
        joblib.dump(self.channel_model, directory / 'channel_model.pkl')
        joblib.dump(self.scaler, directory / 'scaler.pkl')
        joblib.dump(self.channel_encoder, directory / 'channel_encoder.pkl')
        joblib.dump({
            'feature_names': self.feature_names,
            'is_trained': self.is_trained,
        }, directory / 'metadata.pkl')
        logger.info(f"Voucher forecast models saved to {directory}")

    def load(self, directory: Path):
        directory = Path(directory)
        self.days_model = joblib.load(directory / 'days_model.pkl')
        self.channel_model = joblib.load(directory / 'channel_model.pkl')
        self.scaler = joblib.load(directory / 'scaler.pkl')
        self.channel_encoder = joblib.load(directory / 'channel_encoder.pkl')
        metadata = joblib.load(directory / 'metadata.pkl')
        self.feature_names = metadata['feature_names']
        self.is_trained = metadata['is_trained']
        logger.info(f"Voucher forecast models loaded from {directory}")


async def load_forecast_models() -> VoucherRedemptionForecaster:
    import os
    model_dir = Path(os.getenv('MODEL_DIR', 'buffr_ai/models/voucher_forecast'))
    forecaster = VoucherRedemptionForecaster()
    if model_dir.exists():
        try:
            forecaster.load(model_dir)
            logger.info("Voucher forecast models loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load voucher forecast models: {e}.")
    else:
        logger.warning(f"Voucher forecast model directory {model_dir} does not exist.")
    return forecaster
