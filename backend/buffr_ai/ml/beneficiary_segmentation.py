"""
Beneficiary Segmentation Engine

Clustering for beneficiary persona discovery and classification:
1. K-Means (6 segments) for segment discovery
2. GaussianMixture (6) for soft/probabilistic segmentation
"""

import numpy as np
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from pathlib import Path
import joblib
import logging

from sklearn.cluster import KMeans
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

logger = logging.getLogger(__name__)

SEGMENT_NAMES = [
    "Rural Elderly", "Urban Youth", "Peri-Urban Family",
    "Digital-First", "Traditional Cash", "New Enrollee",
]


@dataclass
class BeneficiaryFeatures:
    """Feature vector for beneficiary segmentation (12 features)."""
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

    def to_array(self) -> np.ndarray:
        return np.array([
            self.age_bracket, self.region_encoded,
            self.grant_type_encoded, self.dependant_count,
            self.has_proxy, self.redemption_channel_pref_encoded,
            self.avg_redemption_amount, self.redemption_frequency,
            self.days_since_last_payment, self.digital_literacy_score,
            self.household_size_estimate, self.enrollment_duration_days,
        ])


class BeneficiarySegmentationEngine:
    """KMeans + GMM clustering for beneficiary segmentation."""

    def __init__(self):
        self.kmeans: Optional[KMeans] = None
        self.gmm: Optional[GaussianMixture] = None
        self.scaler = StandardScaler()
        self.segment_profiles: List[Dict[str, Any]] = []
        self.is_trained = False
        self.feature_names = [
            'age_bracket', 'region_encoded',
            'grant_type_encoded', 'dependant_count',
            'has_proxy', 'redemption_channel_pref_encoded',
            'avg_redemption_amount', 'redemption_frequency',
            'days_since_last_payment', 'digital_literacy_score',
            'household_size_estimate', 'enrollment_duration_days',
        ]

    def train(self, X_train: np.ndarray) -> Dict[str, Any]:
        logger.info("Training Beneficiary Segmentation Engine...")
        X_scaled = self.scaler.fit_transform(X_train)

        # K-Means hard clustering
        self.kmeans = KMeans(
            n_clusters=6, init='k-means++', n_init=20,
            max_iter=300, random_state=42,
        )
        km_labels = self.kmeans.fit_predict(X_scaled)

        # GMM soft clustering
        self.gmm = GaussianMixture(
            n_components=6, covariance_type='full',
            n_init=5, random_state=42,
        )
        self.gmm.fit(X_scaled)
        gmm_labels = self.gmm.predict(X_scaled)

        # Map clusters to named segments by centroid characteristics
        centroids = self.kmeans.cluster_centers_
        # Score: higher age + lower digital literacy = traditional; lower age + higher digital = digital-first
        digital_scores = centroids[:, 9] - centroids[:, 0] * 0.3  # digital_literacy - age influence
        cluster_order = np.argsort(digital_scores)
        cluster_to_segment = {cluster_order[i]: i for i in range(6)}
        segment_labels = np.array([SEGMENT_NAMES[cluster_to_segment[c]] for c in km_labels])

        # Build segment profiles
        self._build_segment_profiles(X_train, segment_labels)

        self.is_trained = True

        km_sil = float(silhouette_score(X_scaled, km_labels))
        gmm_sil = float(silhouette_score(X_scaled, gmm_labels))

        return {
            'kmeans_silhouette': km_sil,
            'gmm_silhouette': gmm_sil,
            'n_segments': 6,
            'segment_distribution': {
                seg: int(np.sum(segment_labels == seg)) for seg in SEGMENT_NAMES
            },
        }

    def _build_segment_profiles(self, X: np.ndarray, segment_labels: np.ndarray):
        self.segment_profiles = []
        for seg in SEGMENT_NAMES:
            mask = segment_labels == seg
            if np.sum(mask) == 0:
                continue
            subset = X[mask]
            profile = {
                'segment': seg,
                'count': int(np.sum(mask)),
                'avg_age_bracket': float(np.mean(subset[:, 0])),
                'avg_redemption_amount': float(np.mean(subset[:, 6])),
                'avg_digital_literacy': float(np.mean(subset[:, 9])),
                'avg_dependants': float(np.mean(subset[:, 3])),
            }
            self.segment_profiles.append(profile)

    def predict(self, features: np.ndarray) -> Dict[str, Any]:
        if not self.is_trained:
            raise ValueError("Models must be trained before prediction")
        if features.ndim == 1:
            features = features.reshape(1, -1)

        features_scaled = self.scaler.transform(features)

        # K-Means hard assignment
        km_cluster = self.kmeans.predict(features_scaled)[0]

        # GMM soft probabilities
        gmm_probs = self.gmm.predict_proba(features_scaled)[0]
        gmm_cluster = int(np.argmax(gmm_probs))
        confidence = float(np.max(gmm_probs))

        # Map cluster to segment name using centroid ordering
        centroids = self.kmeans.cluster_centers_
        digital_scores = centroids[:, 9] - centroids[:, 0] * 0.3
        cluster_order = np.argsort(digital_scores)
        cluster_to_segment = {cluster_order[i]: i for i in range(6)}
        segment_idx = cluster_to_segment.get(km_cluster, 0)
        segment_name = SEGMENT_NAMES[segment_idx]

        # Recommendations based on segment
        recommendations = self._get_recommendations(segment_name, features[0])

        return {
            "segment_id": segment_idx,
            "segment_name": segment_name,
            "segment_confidence": round(confidence, 4),
            "recommendations": recommendations,
        }

    def _get_recommendations(self, segment: str, features: np.ndarray) -> List[str]:
        recs = {
            "Rural Elderly": [
                "Enable USSD-first voucher redemption",
                "Assign dedicated agent for assisted payments",
                "Send SMS notifications in local language",
            ],
            "Urban Youth": [
                "Promote QR pay and merchant payments",
                "Enable cashback offers at partner merchants",
                "Suggest savings goals and group contributions",
            ],
            "Peri-Urban Family": [
                "Highlight bill pay and autopay features",
                "Recommend family savings groups",
                "Enable proxy management for dependants",
            ],
            "Digital-First": [
                "Promote advanced features (split-bill, QR pay)",
                "Suggest multi-wallet management",
                "Enable real-time spending insights",
            ],
            "Traditional Cash": [
                "Guide toward agent network for cash-out",
                "Introduce NamPost branch redemption",
                "Gradually introduce mobile wallet deposits",
            ],
            "New Enrollee": [
                "Complete onboarding tutorial",
                "Set up PIN and 2FA",
                "Redeem first voucher with guided walkthrough",
            ],
        }
        return recs.get(segment, ["Complete profile setup"])

    def evaluate(self, X_test: np.ndarray) -> Dict[str, float]:
        X_scaled = self.scaler.transform(X_test)
        km_labels = self.kmeans.predict(X_scaled)
        gmm_labels = self.gmm.predict(X_scaled)
        return {
            'kmeans_silhouette': float(silhouette_score(X_scaled, km_labels)),
            'gmm_silhouette': float(silhouette_score(X_scaled, gmm_labels)),
        }

    def save(self, directory: Path):
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.kmeans, directory / 'kmeans.pkl')
        joblib.dump(self.gmm, directory / 'gmm.pkl')
        joblib.dump(self.scaler, directory / 'scaler.pkl')
        joblib.dump({
            'feature_names': self.feature_names,
            'segment_profiles': self.segment_profiles,
            'is_trained': self.is_trained,
        }, directory / 'metadata.pkl')
        logger.info(f"Segmentation models saved to {directory}")

    def load(self, directory: Path):
        directory = Path(directory)
        self.kmeans = joblib.load(directory / 'kmeans.pkl')
        self.gmm = joblib.load(directory / 'gmm.pkl')
        self.scaler = joblib.load(directory / 'scaler.pkl')
        metadata = joblib.load(directory / 'metadata.pkl')
        self.feature_names = metadata['feature_names']
        self.segment_profiles = metadata['segment_profiles']
        self.is_trained = metadata['is_trained']
        logger.info(f"Segmentation models loaded from {directory}")


async def load_segmentation_models() -> BeneficiarySegmentationEngine:
    import os
    model_dir = Path(os.getenv('MODEL_DIR', 'buffr_ai/models/beneficiary_segmentation'))
    engine = BeneficiarySegmentationEngine()
    if model_dir.exists():
        try:
            engine.load(model_dir)
            logger.info("Beneficiary segmentation models loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load segmentation models: {e}.")
    else:
        logger.warning(f"Segmentation model directory {model_dir} does not exist.")
    return engine
