"""
Digital Adoption Engine

Clustering + classifier for tracking feature adoption and engagement:
1. K-Means (5 tiers) for tier discovery
2. Random Forest Classifier for tier prediction on new users
"""

import numpy as np
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from pathlib import Path
import joblib
import logging

from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import silhouette_score, accuracy_score

logger = logging.getLogger(__name__)

ADOPTION_TIERS = ["Dormant", "Basic", "Active", "Power", "Champion"]


@dataclass
class AdoptionFeatures:
    """Feature vector for digital adoption (14 features)."""
    has_used_send_money: int
    has_used_bill_pay: int
    has_used_savings: int
    has_used_groups: int
    has_used_qr_pay: int
    has_used_ussd: int
    has_used_cashback: int
    session_count_30d: int
    avg_session_duration_min: float
    channel_diversity: int
    features_used_count: int
    onboarding_stage: int
    days_since_first_use: int
    tx_count_30d: int

    def to_array(self) -> np.ndarray:
        return np.array([
            self.has_used_send_money, self.has_used_bill_pay,
            self.has_used_savings, self.has_used_groups,
            self.has_used_qr_pay, self.has_used_ussd,
            self.has_used_cashback, self.session_count_30d,
            self.avg_session_duration_min, self.channel_diversity,
            self.features_used_count, self.onboarding_stage,
            self.days_since_first_use, self.tx_count_30d,
        ])


class DigitalAdoptionEngine:
    """Clustering + classifier for digital adoption tiers."""

    def __init__(self):
        self.kmeans: Optional[KMeans] = None
        self.classifier: Optional[RandomForestClassifier] = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.tier_profiles: List[Dict[str, Any]] = []
        self.is_trained = False
        self.feature_names = [
            'has_used_send_money', 'has_used_bill_pay',
            'has_used_savings', 'has_used_groups',
            'has_used_qr_pay', 'has_used_ussd',
            'has_used_cashback', 'session_count_30d',
            'avg_session_duration_min', 'channel_diversity',
            'features_used_count', 'onboarding_stage',
            'days_since_first_use', 'tx_count_30d',
        ]

    def train(
        self, X_train: np.ndarray,
        y_train: Optional[np.ndarray] = None,
    ) -> Dict[str, Any]:
        logger.info("Training Digital Adoption Engine...")
        X_scaled = self.scaler.fit_transform(X_train)

        # Step 1: K-Means clustering to discover tiers
        self.kmeans = KMeans(
            n_clusters=5, init='k-means++', n_init=20,
            max_iter=300, random_state=42,
        )
        cluster_labels = self.kmeans.fit_predict(X_scaled)

        # Map clusters to ordered tiers by centroid activity level
        centroids = self.kmeans.cluster_centers_
        activity_scores = centroids[:, 7] + centroids[:, 10] + centroids[:, 13]  # session + features + tx
        cluster_order = np.argsort(activity_scores)
        cluster_to_tier = {cluster_order[i]: i for i in range(5)}
        tier_labels = np.array([ADOPTION_TIERS[cluster_to_tier[c]] for c in cluster_labels])

        # Step 2: Train classifier on discovered tiers
        self.label_encoder.fit(ADOPTION_TIERS)
        y_encoded = self.label_encoder.transform(tier_labels)

        self.classifier = RandomForestClassifier(
            n_estimators=150, max_depth=10, min_samples_split=10,
            n_jobs=-1, random_state=42,
        )
        self.classifier.fit(X_scaled, y_encoded)

        # Build tier profiles
        self._build_tier_profiles(X_train, tier_labels)

        self.is_trained = True

        sil_score = float(silhouette_score(X_scaled, cluster_labels))
        clf_accuracy = float(accuracy_score(y_encoded, self.classifier.predict(X_scaled)))

        return {
            'silhouette_score': sil_score,
            'classifier_accuracy': clf_accuracy,
            'n_tiers': 5,
            'tier_distribution': {
                tier: int(np.sum(tier_labels == tier)) for tier in ADOPTION_TIERS
            },
        }

    def _build_tier_profiles(self, X: np.ndarray, tier_labels: np.ndarray):
        self.tier_profiles = []
        for tier in ADOPTION_TIERS:
            mask = tier_labels == tier
            if np.sum(mask) == 0:
                continue
            subset = X[mask]
            profile = {
                'tier': tier,
                'count': int(np.sum(mask)),
                'avg_features_used': float(np.mean(subset[:, 10])),
                'avg_sessions': float(np.mean(subset[:, 7])),
                'avg_tx_count': float(np.mean(subset[:, 13])),
            }
            self.tier_profiles.append(profile)

    def predict(self, features: np.ndarray) -> Dict[str, Any]:
        if not self.is_trained:
            raise ValueError("Models must be trained before prediction")
        if features.ndim == 1:
            features = features.reshape(1, -1)

        features_scaled = self.scaler.transform(features)

        tier_idx = self.classifier.predict(features_scaled)[0]
        tier = self.label_encoder.inverse_transform([tier_idx])[0]
        probs = self.classifier.predict_proba(features_scaled)[0]
        confidence = float(np.max(probs))

        # Adoption score (0-1)
        adoption_score = float(tier_idx / 4.0)

        # Feature usage heatmap
        feature_flags = ['send_money', 'bill_pay', 'savings', 'groups', 'qr_pay', 'ussd', 'cashback']
        heatmap = {
            feature_flags[i]: bool(features[0, i]) for i in range(7)
        }

        # Engagement trend
        if features[0, 7] > 15:  # session_count_30d
            trend = "increasing"
        elif features[0, 7] > 5:
            trend = "stable"
        else:
            trend = "declining"

        return {
            "adoption_score": round(adoption_score, 4),
            "adoption_tier": tier,
            "confidence": round(confidence, 4),
            "feature_usage_heatmap": heatmap,
            "engagement_trend": trend,
        }

    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        X_scaled = self.scaler.transform(X_test)
        y_encoded = self.label_encoder.transform(y_test)
        y_pred = self.classifier.predict(X_scaled)
        return {'accuracy': float(accuracy_score(y_encoded, y_pred))}

    def save(self, directory: Path):
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.kmeans, directory / 'kmeans.pkl')
        joblib.dump(self.classifier, directory / 'classifier.pkl')
        joblib.dump(self.scaler, directory / 'scaler.pkl')
        joblib.dump(self.label_encoder, directory / 'label_encoder.pkl')
        joblib.dump({
            'feature_names': self.feature_names,
            'tier_profiles': self.tier_profiles,
            'is_trained': self.is_trained,
        }, directory / 'metadata.pkl')
        logger.info(f"Adoption models saved to {directory}")

    def load(self, directory: Path):
        directory = Path(directory)
        self.kmeans = joblib.load(directory / 'kmeans.pkl')
        self.classifier = joblib.load(directory / 'classifier.pkl')
        self.scaler = joblib.load(directory / 'scaler.pkl')
        self.label_encoder = joblib.load(directory / 'label_encoder.pkl')
        metadata = joblib.load(directory / 'metadata.pkl')
        self.feature_names = metadata['feature_names']
        self.tier_profiles = metadata['tier_profiles']
        self.is_trained = metadata['is_trained']
        logger.info(f"Adoption models loaded from {directory}")


async def load_adoption_models() -> DigitalAdoptionEngine:
    import os
    model_dir = Path(os.getenv('MODEL_DIR', 'buffr_ai/models/digital_adoption'))
    engine = DigitalAdoptionEngine()
    if model_dir.exists():
        try:
            engine.load(model_dir)
            logger.info("Digital adoption models loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load adoption models: {e}.")
    else:
        logger.warning(f"Adoption model directory {model_dir} does not exist.")
    return engine
