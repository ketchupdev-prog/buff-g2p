"""
ML Model Monitoring System

Location: smartpay_ai/ml/model_monitor.py
Purpose: Monitor model performance, detect drift, and trigger retraining
Features:
  - Real-time prediction accuracy tracking
  - Input data distribution shift detection
  - Model latency monitoring
  - False positive/negative rate tracking
  - Automatic retraining triggers
"""

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from collections import deque

import numpy as np
from scipy import stats

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelMonitor:
    """
    Monitor ML model performance and detect degradation
    
    Tracks:
    - Prediction accuracy over time
    - Input feature distributions
    - Model latency
    - Error rates
    - Drift detection
    """

    def __init__(
        self,
        model_name: str,
        monitoring_dir: Optional[Path] = None,
        window_size: int = 1000
    ):
        """
        Initialize model monitor
        
        Args:
            model_name: Name of model to monitor
            monitoring_dir: Directory for monitoring data
            window_size: Number of recent predictions to track
        """
        self.model_name = model_name
        
        if monitoring_dir is None:
            project_root = Path(__file__).parent.parent.parent
            monitoring_dir = project_root / "data" / "monitoring"
        
        self.monitoring_dir = Path(monitoring_dir)
        self.monitoring_dir.mkdir(parents=True, exist_ok=True)
        
        self.window_size = window_size
        
        # Metrics storage (in-memory, circular buffers)
        self.predictions = deque(maxlen=window_size)
        self.ground_truth = deque(maxlen=window_size)
        self.features = deque(maxlen=window_size)
        self.latencies = deque(maxlen=window_size)
        self.timestamps = deque(maxlen=window_size)
        
        # Baseline statistics (from training)
        self.baseline_stats = self._load_baseline_stats()
        
        # Alert thresholds
        self.accuracy_drop_threshold = 0.05  # 5% drop triggers alert
        self.drift_threshold = 0.05  # p-value for KS test
        self.latency_threshold_ms = 200  # Max acceptable latency
        
        logger.info(f"Model monitor initialized for {model_name}")
        logger.info(f"  Monitoring dir: {monitoring_dir}")
        logger.info(f"  Window size: {window_size}")

    def _load_baseline_stats(self) -> Dict[str, Any]:
        """Load baseline statistics from training metadata"""
        project_root = Path(__file__).parent.parent.parent
        metadata_file = project_root / "smartpay_ai" / "models" / self.model_name / "metadata.json"
        
        if not metadata_file.exists():
            logger.warning(f"No baseline stats found for {self.model_name}")
            return {}
        
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        return {
            'training_accuracy': metadata.get('metrics', {}).get('test_accuracy', 0),
            'training_roc_auc': metadata.get('metrics', {}).get('test_roc_auc', 0),
            'training_samples': metadata.get('training_samples', 0),
            'training_date': metadata.get('training_date'),
            'features': metadata.get('features', []),
        }

    def log_prediction(
        self,
        prediction: Any,
        features: Optional[np.ndarray] = None,
        ground_truth: Optional[Any] = None,
        latency_ms: Optional[float] = None
    ):
        """
        Log a prediction for monitoring
        
        Args:
            prediction: Model prediction
            features: Input features
            ground_truth: True label (if available)
            latency_ms: Prediction latency in milliseconds
        """
        self.predictions.append(prediction)
        
        if features is not None:
            self.features.append(features)
        
        if ground_truth is not None:
            self.ground_truth.append(ground_truth)
        
        if latency_ms is not None:
            self.latencies.append(latency_ms)
        
        self.timestamps.append(datetime.now())

    def get_accuracy_trend(
        self,
        time_window_minutes: int = 60
    ) -> Dict[str, Any]:
        """
        Calculate accuracy trend over time window
        
        Args:
            time_window_minutes: Time window for analysis
            
        Returns:
            Accuracy trend metrics
        """
        if not self.predictions or not self.ground_truth:
            return {
                'error': 'Insufficient data',
                'predictions_count': len(self.predictions),
                'ground_truth_count': len(self.ground_truth),
            }
        
        # Filter to time window
        cutoff_time = datetime.now() - timedelta(minutes=time_window_minutes)
        
        recent_preds = []
        recent_truth = []
        
        for i, ts in enumerate(self.timestamps):
            if ts >= cutoff_time and i < len(self.ground_truth):
                recent_preds.append(self.predictions[i])
                recent_truth.append(self.ground_truth[i])
        
        if not recent_preds:
            return {
                'error': 'No recent data in time window',
                'time_window_minutes': time_window_minutes,
            }
        
        # Calculate accuracy
        correct = sum(p == t for p, t in zip(recent_preds, recent_truth))
        accuracy = correct / len(recent_preds)
        
        # Compare to baseline
        baseline_accuracy = self.baseline_stats.get('training_accuracy', 0)
        accuracy_drop = baseline_accuracy - accuracy
        
        # Detect degradation
        is_degraded = accuracy_drop > self.accuracy_drop_threshold
        
        return {
            'current_accuracy': round(accuracy, 4),
            'baseline_accuracy': round(baseline_accuracy, 4),
            'accuracy_drop': round(accuracy_drop, 4),
            'accuracy_drop_percent': round(accuracy_drop * 100, 2),
            'is_degraded': is_degraded,
            'sample_count': len(recent_preds),
            'time_window_minutes': time_window_minutes,
        }

    def detect_feature_drift(
        self,
        feature_index: int,
        confidence: float = 0.95
    ) -> Dict[str, Any]:
        """
        Detect distribution drift in a feature using Kolmogorov-Smirnov test
        
        Args:
            feature_index: Index of feature to check
            confidence: Confidence level for drift detection
            
        Returns:
            Drift detection results
        """
        if not self.features:
            return {'error': 'No feature data available'}
        
        # Extract feature values
        feature_values = [f[feature_index] for f in self.features if len(f) > feature_index]
        
        if len(feature_values) < 30:
            return {
                'error': 'Insufficient samples for drift detection',
                'sample_count': len(feature_values),
            }
        
        # Split into reference and current
        split_point = len(feature_values) // 2
        reference = feature_values[:split_point]
        current = feature_values[split_point:]
        
        # Kolmogorov-Smirnov test
        ks_statistic, p_value = stats.ks_2samp(reference, current)
        
        # Drift detected if p-value < threshold
        drift_detected = p_value < self.drift_threshold
        
        # Calculate distribution stats
        ref_mean = np.mean(reference)
        ref_std = np.std(reference)
        curr_mean = np.mean(current)
        curr_std = np.std(current)
        
        mean_shift = abs(curr_mean - ref_mean) / (ref_std + 1e-6)
        
        return {
            'feature_index': feature_index,
            'drift_detected': drift_detected,
            'ks_statistic': round(ks_statistic, 4),
            'p_value': round(p_value, 4),
            'threshold': self.drift_threshold,
            'reference_mean': round(ref_mean, 4),
            'reference_std': round(ref_std, 4),
            'current_mean': round(curr_mean, 4),
            'current_std': round(curr_std, 4),
            'mean_shift': round(mean_shift, 4),
            'sample_count': len(feature_values),
        }

    def detect_all_features_drift(self) -> Dict[str, Any]:
        """
        Check for drift across all features
        
        Returns:
            Drift detection results for all features
        """
        if not self.features:
            return {'error': 'No feature data available'}
        
        num_features = len(self.features[0])
        
        drift_results = {}
        drifted_features = []
        
        for i in range(num_features):
            result = self.detect_feature_drift(i)
            
            if result.get('drift_detected'):
                drifted_features.append(i)
            
            drift_results[f'feature_{i}'] = result
        
        return {
            'total_features': num_features,
            'drifted_features': drifted_features,
            'drift_count': len(drifted_features),
            'drift_percentage': round(len(drifted_features) / num_features * 100, 2) if num_features > 0 else 0,
            'feature_results': drift_results,
        }

    def get_latency_stats(self) -> Dict[str, Any]:
        """
        Get model latency statistics
        
        Returns:
            Latency metrics
        """
        if not self.latencies:
            return {'error': 'No latency data available'}
        
        latencies_arr = np.array(list(self.latencies))
        
        mean_latency = np.mean(latencies_arr)
        median_latency = np.median(latencies_arr)
        p95_latency = np.percentile(latencies_arr, 95)
        p99_latency = np.percentile(latencies_arr, 99)
        max_latency = np.max(latencies_arr)
        
        # Check if exceeds threshold
        exceeds_threshold = p95_latency > self.latency_threshold_ms
        
        return {
            'mean_ms': round(mean_latency, 2),
            'median_ms': round(median_latency, 2),
            'p95_ms': round(p95_latency, 2),
            'p99_ms': round(p99_latency, 2),
            'max_ms': round(max_latency, 2),
            'threshold_ms': self.latency_threshold_ms,
            'exceeds_threshold': exceeds_threshold,
            'sample_count': len(self.latencies),
        }

    def get_error_rates(self) -> Dict[str, Any]:
        """
        Calculate false positive and false negative rates
        
        Returns:
            Error rate metrics
        """
        if not self.predictions or not self.ground_truth:
            return {'error': 'Insufficient data for error rate calculation'}
        
        # Only use samples with ground truth
        pred_list = list(self.predictions)[:len(self.ground_truth)]
        truth_list = list(self.ground_truth)
        
        # Calculate confusion matrix components
        true_positives = sum(1 for p, t in zip(pred_list, truth_list) if p == 1 and t == 1)
        true_negatives = sum(1 for p, t in zip(pred_list, truth_list) if p == 0 and t == 0)
        false_positives = sum(1 for p, t in zip(pred_list, truth_list) if p == 1 and t == 0)
        false_negatives = sum(1 for p, t in zip(pred_list, truth_list) if p == 0 and t == 1)
        
        total = len(pred_list)
        
        # Calculate rates
        fpr = false_positives / (false_positives + true_negatives) if (false_positives + true_negatives) > 0 else 0
        fnr = false_negatives / (false_negatives + true_positives) if (false_negatives + true_positives) > 0 else 0
        
        accuracy = (true_positives + true_negatives) / total if total > 0 else 0
        
        return {
            'false_positive_rate': round(fpr, 4),
            'false_negative_rate': round(fnr, 4),
            'accuracy': round(accuracy, 4),
            'true_positives': true_positives,
            'true_negatives': true_negatives,
            'false_positives': false_positives,
            'false_negatives': false_negatives,
            'total_samples': total,
        }

    def should_trigger_retraining(self) -> Tuple[bool, List[str]]:
        """
        Determine if model should be retrained
        
        Returns:
            (should_retrain, reasons)
        """
        reasons = []
        
        # Check accuracy degradation
        accuracy_trend = self.get_accuracy_trend(time_window_minutes=60)
        if accuracy_trend.get('is_degraded'):
            drop_pct = accuracy_trend.get('accuracy_drop_percent', 0)
            reasons.append(f"Accuracy dropped {drop_pct}% (threshold: {self.accuracy_drop_threshold * 100}%)")
        
        # Check feature drift
        drift_results = self.detect_all_features_drift()
        drift_pct = drift_results.get('drift_percentage', 0)
        if drift_pct > 30:  # More than 30% of features drifted
            reasons.append(f"{drift_pct}% of features showing drift (threshold: 30%)")
        
        # Check latency
        latency_stats = self.get_latency_stats()
        if latency_stats.get('exceeds_threshold'):
            p95 = latency_stats.get('p95_ms', 0)
            reasons.append(f"P95 latency {p95}ms exceeds {self.latency_threshold_ms}ms")
        
        should_retrain = len(reasons) > 0
        
        return should_retrain, reasons

    def get_monitoring_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive monitoring report
        
        Returns:
            Full monitoring report
        """
        report = {
            'model_name': self.model_name,
            'report_timestamp': datetime.now().isoformat(),
            'monitoring_window': self.window_size,
            'baseline_stats': self.baseline_stats,
            'accuracy_trend': self.get_accuracy_trend(time_window_minutes=60),
            'drift_detection': self.detect_all_features_drift(),
            'latency_stats': self.get_latency_stats(),
            'error_rates': self.get_error_rates(),
        }
        
        # Retraining decision
        should_retrain, reasons = self.should_trigger_retraining()
        report['retraining_recommendation'] = {
            'should_retrain': should_retrain,
            'reasons': reasons,
        }
        
        return report

    def save_report(self, report: Optional[Dict[str, Any]] = None):
        """
        Save monitoring report to disk
        
        Args:
            report: Report to save (generates new if None)
        """
        if report is None:
            report = self.get_monitoring_report()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = self.monitoring_dir / f"{self.model_name}_report_{timestamp}.json"
        
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Monitoring report saved: {report_file}")

    def print_report(self):
        """Print monitoring report to console"""
        report = self.get_monitoring_report()
        
        print("\n" + "=" * 80)
        print(f"MODEL MONITORING REPORT: {self.model_name}")
        print("=" * 80)
        
        # Baseline
        print(f"\nBaseline (from training):")
        print(f"  Training date: {report['baseline_stats'].get('training_date', 'N/A')}")
        print(f"  Training samples: {report['baseline_stats'].get('training_samples', 'N/A'):,}")
        
        # Accuracy
        acc = report['accuracy_trend']
        if 'error' not in acc:
            print(f"\nAccuracy Trend (last 60 min):")
            print(f"  Current: {acc['current_accuracy']:.4f}")
            print(f"  Baseline: {acc['baseline_accuracy']:.4f}")
            print(f"  Drop: {acc['accuracy_drop_percent']:.2f}%")
            if acc['is_degraded']:
                print(f"  ⚠ DEGRADATION DETECTED")
        
        # Drift
        drift = report['drift_detection']
        if 'error' not in drift:
            print(f"\nFeature Drift:")
            print(f"  Total features: {drift['total_features']}")
            print(f"  Drifted features: {drift['drift_count']} ({drift['drift_percentage']:.1f}%)")
            if drift['drift_count'] > 0:
                print(f"  Drifted indices: {drift['drifted_features']}")
        
        # Latency
        latency = report['latency_stats']
        if 'error' not in latency:
            print(f"\nLatency:")
            print(f"  Mean: {latency['mean_ms']:.2f}ms")
            print(f"  P95: {latency['p95_ms']:.2f}ms")
            print(f"  P99: {latency['p99_ms']:.2f}ms")
            if latency['exceeds_threshold']:
                print(f"  ⚠ EXCEEDS THRESHOLD ({latency['threshold_ms']}ms)")
        
        # Error rates
        errors = report['error_rates']
        if 'error' not in errors:
            print(f"\nError Rates:")
            print(f"  Accuracy: {errors['accuracy']:.4f}")
            print(f"  False Positive Rate: {errors['false_positive_rate']:.4f}")
            print(f"  False Negative Rate: {errors['false_negative_rate']:.4f}")
        
        # Retraining recommendation
        retrain = report['retraining_recommendation']
        print(f"\nRetraining Recommendation:")
        if retrain['should_retrain']:
            print(f"  ⚠ RETRAINING RECOMMENDED")
            print(f"  Reasons:")
            for reason in retrain['reasons']:
                print(f"    - {reason}")
        else:
            print(f"  ✓ Model performing within acceptable parameters")
        
        print("\n" + "=" * 80)


def main():
    """Example usage"""
    # Create monitor for fraud detection model
    monitor = ModelMonitor('fraud_detection', window_size=100)
    
    # Simulate predictions
    logger.info("Simulating predictions...")
    
    np.random.seed(42)
    
    for i in range(100):
        # Simulate prediction
        prediction = np.random.choice([0, 1], p=[0.9, 0.1])
        ground_truth = np.random.choice([0, 1], p=[0.9, 0.1])
        features = np.random.randn(10)
        latency_ms = np.random.gamma(2, 50)  # Gamma distribution for latency
        
        monitor.log_prediction(
            prediction=prediction,
            ground_truth=ground_truth,
            features=features,
            latency_ms=latency_ms
        )
    
    # Generate and print report
    monitor.print_report()
    
    # Save report
    monitor.save_report()


if __name__ == "__main__":
    main()
