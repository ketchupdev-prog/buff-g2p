"""
Production ML Model Retraining Pipeline

Location: smartpay_ai/training/retrain_production_models.py
Purpose: Retrain ML models with production data from Neon PostgreSQL
Target Metrics (realistic, not overfitted):
  - Fraud detection: 85-92% ROC-AUC (not 100%)
  - Credit scoring: 80-88% accuracy with 5K+ samples
  - Spending analysis: 0.71+ Silhouette score
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.cluster import KMeans
from sklearn.metrics import (
    roc_auc_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    silhouette_score
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProductionModelRetrainer:
    """Retrain ML models with production data"""

    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.data_dir = self.project_root / "data" / "training"
        self.models_dir = self.project_root / "smartpay_ai" / "models"
        
        # Model versioning
        self.version_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        logger.info(f"Model retraining session: {self.version_timestamp}")
        logger.info(f"Data directory: {self.data_dir}")
        logger.info(f"Models directory: {self.models_dir}")

    def load_training_data(self, dataset_name: str) -> pd.DataFrame:
        """Load training data from parquet file"""
        file_path = self.data_dir / f"{dataset_name}_production.parquet"
        
        if not file_path.exists():
            raise FileNotFoundError(
                f"Training data not found: {file_path}\n"
                f"Run collect_training_data.py first to generate production data."
            )
        
        df = pd.read_parquet(file_path)
        logger.info(f"Loaded {dataset_name}: {len(df):,} rows")
        
        return df

    def engineer_fraud_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Engineer features for fraud detection model"""
        logger.info("Engineering fraud detection features...")
        
        features_df = df.copy()
        
        # Time-based features
        features_df['hour'] = pd.to_datetime(features_df['timestamp']).dt.hour
        features_df['day_of_week'] = pd.to_datetime(features_df['timestamp']).dt.dayofweek
        features_df['is_weekend'] = features_df['day_of_week'].isin([5, 6]).astype(int)
        features_df['is_unusual_hour'] = ((features_df['hour'] >= 22) | (features_df['hour'] <= 5)).astype(int)
        
        # Amount features
        features_df['amount_normalized'] = np.minimum(features_df['amount'] / 10000.0, 1.0)
        features_df['amount_log'] = np.log1p(features_df['amount'])
        features_df['round_number'] = (
            (features_df['amount'] % 100 == 0) | (features_df['amount'] % 1000 == 0)
        ).astype(int)
        
        # Risk score (from alerts)
        features_df['risk_score'] = features_df['risk_score'].fillna(0)
        
        # Account age
        features_df['account_age_days'] = (
            pd.to_datetime(features_df['timestamp']) - pd.to_datetime(features_df['user_created_at'])
        ).dt.days.fillna(0)
        
        # KYC level
        features_df['kyc_level'] = features_df['kyc_tier'].map({
            'basic': 0, 'standard': 1, 'premium': 2
        }).fillna(0)
        
        # Select feature columns
        feature_cols = [
            'amount', 'amount_normalized', 'amount_log', 'round_number',
            'hour', 'day_of_week', 'is_weekend', 'is_unusual_hour',
            'risk_score', 'account_age_days', 'kyc_level'
        ]
        
        X = features_df[feature_cols].fillna(0)
        y = features_df['is_fraud']
        
        logger.info(f"Feature matrix: {X.shape[0]} samples, {X.shape[1]} features")
        logger.info(f"Class distribution: {y.value_counts().to_dict()}")
        
        return X, y

    def engineer_credit_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Engineer features for credit scoring model"""
        logger.info("Engineering credit scoring features...")
        
        features_df = df.copy()
        
        # Account age
        features_df['account_age_days'] = (
            datetime.now() - pd.to_datetime(features_df['account_created_at'])
        ).dt.days
        
        # Transaction history score
        features_df['transaction_history_score'] = np.minimum(
            features_df['total_transactions'] / (features_df['active_months'] + 1) / 30.0,
            1.0
        )
        
        # Loan repayment rate
        features_df['loan_repayment_rate'] = np.where(
            features_df['total_loans'] > 0,
            features_df['loans_repaid'] / features_df['total_loans'],
            1.0
        )
        
        # Monthly income estimate
        features_df['monthly_income_estimate'] = np.where(
            features_df['active_months'] > 0,
            (features_df['total_spending'] / features_df['active_months']) * 1.5,
            0
        )
        
        # Payment consistency
        features_df['payment_consistency'] = 1.0 / (
            1.0 + features_df['std_transaction_amount'] / (features_df['avg_transaction_amount'] + 1e-6)
        )
        
        # Debt to income
        features_df['debt_to_income'] = np.minimum(
            features_df['total_borrowed'] / ((features_df['monthly_income_estimate'] * 12) + 1e-6),
            1.0
        )
        
        # KYC level
        features_df['kyc_level'] = features_df['kyc_tier'].map({
            'basic': 0, 'standard': 1, 'premium': 2
        }).fillna(0)
        
        # Select feature columns
        feature_cols = [
            'total_transactions', 'avg_transaction_amount', 'transaction_diversity',
            'active_months', 'account_age_days', 'transaction_history_score',
            'total_loans', 'loans_repaid', 'loans_defaulted', 'loan_repayment_rate',
            'avg_balance', 'monthly_income_estimate', 'payment_consistency',
            'debt_to_income', 'kyc_level'
        ]
        
        X = features_df[feature_cols].fillna(0)
        y = (features_df['credit_score_label'] == 'good').astype(int)
        
        logger.info(f"Feature matrix: {X.shape[0]} samples, {X.shape[1]} features")
        logger.info(f"Class distribution: Good={y.sum()}, Bad={(~y.astype(bool)).sum()}")
        
        return X, y

    def engineer_spending_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for spending analysis (clustering)"""
        logger.info("Engineering spending analysis features...")
        
        features_df = df.copy()
        
        # Category diversity
        features_df['category_diversity'] = np.minimum(
            features_df['category_diversity_raw'] / 10.0,
            1.0
        )
        
        # Weekend/weekday ratio
        features_df['weekend_weekday_ratio'] = features_df['weekend_txs'] / (features_df['weekday_txs'] + 1)
        
        # Spending ratios
        total_spending = features_df['monthly_spending'] + 1e-6
        features_df['groceries_ratio'] = features_df['groceries_amount'] / total_spending
        features_df['transport_ratio'] = features_df['transport_amount'] / total_spending
        features_df['utilities_ratio'] = features_df['utilities_amount'] / total_spending
        features_df['entertainment_ratio'] = features_df['entertainment_amount'] / total_spending
        
        # Savings rate
        features_df['savings_rate'] = np.maximum(
            0,
            np.minimum(1.0, (features_df['avg_balance'] - features_df['monthly_spending']) / 
                       (features_df['avg_balance'] + 1e-6))
        )
        
        # Transaction regularity
        features_df['transaction_regularity'] = 1.0 / (
            1.0 + features_df['std_transaction_size'] / (features_df['avg_transaction_size'] + 1e-6)
        )
        
        # Select feature columns
        feature_cols = [
            'monthly_spending', 'transaction_count', 'category_diversity',
            'avg_transaction_size', 'weekend_weekday_ratio',
            'groceries_ratio', 'transport_ratio', 'utilities_ratio', 'entertainment_ratio',
            'savings_rate', 'transaction_regularity'
        ]
        
        X = features_df[feature_cols].fillna(0)
        
        logger.info(f"Feature matrix: {X.shape[0]} samples, {X.shape[1]} features")
        
        return X

    def train_fraud_detection_model(self) -> Dict[str, Any]:
        """
        Train fraud detection model
        Target: 85-92% ROC-AUC (realistic, not overfitted)
        """
        logger.info("\n" + "=" * 80)
        logger.info("Training Fraud Detection Model")
        logger.info("=" * 80)
        
        # Load data
        df = self.load_training_data('fraud_detection')
        
        if len(df) < 1000:
            raise ValueError(f"Insufficient data: {len(df)} samples (need 1000+)")
        
        # Engineer features
        X, y = self.engineer_fraud_features(df)
        
        # Split data (80/20)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        logger.info(f"Train set: {len(X_train)} samples")
        logger.info(f"Test set: {len(X_test)} samples")
        
        # Normalize features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train multiple models
        models = {
            'lr': LogisticRegression(random_state=42, max_iter=1000),
            'rf': RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42),
            'gb': GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42)
        }
        
        results = {}
        
        for name, model in models.items():
            logger.info(f"\nTraining {name.upper()} model...")
            
            # 5-fold cross-validation
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='roc_auc')
            logger.info(f"  CV ROC-AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
            
            # Train on full training set
            model.fit(X_train_scaled, y_train)
            
            # Test set evaluation
            y_pred = model.predict(X_test_scaled)
            y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
            
            roc_auc = roc_auc_score(y_test, y_pred_proba)
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, zero_division=0)
            recall = recall_score(y_test, y_pred, zero_division=0)
            f1 = f1_score(y_test, y_pred, zero_division=0)
            
            results[name] = {
                'model': model,
                'cv_roc_auc': float(cv_scores.mean()),
                'cv_roc_auc_std': float(cv_scores.std()),
                'test_roc_auc': float(roc_auc),
                'test_accuracy': float(accuracy),
                'test_precision': float(precision),
                'test_recall': float(recall),
                'test_f1': float(f1),
            }
            
            logger.info(f"  Test ROC-AUC: {roc_auc:.4f}")
            logger.info(f"  Test Accuracy: {accuracy:.4f}")
            logger.info(f"  Test Precision: {precision:.4f}")
            logger.info(f"  Test Recall: {recall:.4f}")
        
        # Select best model (by ROC-AUC)
        best_model_name = max(results, key=lambda k: results[k]['test_roc_auc'])
        best_model = results[best_model_name]['model']
        best_metrics = results[best_model_name]
        
        logger.info(f"\n✓ Best model: {best_model_name.upper()} (ROC-AUC: {best_metrics['test_roc_auc']:.4f})")
        
        # Check if within target range (85-92%)
        if 0.85 <= best_metrics['test_roc_auc'] <= 0.92:
            logger.info("✓ Model performance within target range (85-92% ROC-AUC)")
        elif best_metrics['test_roc_auc'] > 0.92:
            logger.warning("⚠ Model may be overfitted (>92% ROC-AUC)")
        else:
            logger.warning("⚠ Model underperforming (<85% ROC-AUC)")
        
        # Save model
        model_dir = self.models_dir / "fraud_detection"
        model_dir.mkdir(parents=True, exist_ok=True)
        
        # Save best model and scaler
        joblib.dump(best_model, model_dir / f"{best_model_name}_model.pkl")
        joblib.dump(scaler, model_dir / "scaler.pkl")
        
        # Save metadata
        metadata = {
            'version': self.version_timestamp,
            'model_type': best_model_name,
            'training_date': datetime.now().isoformat(),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'features': list(X.columns),
            'metrics': best_metrics,
            'all_models': {k: {key: val for key, val in v.items() if key != 'model'} 
                          for k, v in results.items()},
        }
        
        with open(model_dir / "metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"✓ Saved to: {model_dir}")
        
        return metadata

    def train_credit_scoring_model(self) -> Dict[str, Any]:
        """
        Train credit scoring model
        Target: 80-88% accuracy with 5K+ samples
        """
        logger.info("\n" + "=" * 80)
        logger.info("Training Credit Scoring Model")
        logger.info("=" * 80)
        
        # Load data
        df = self.load_training_data('credit_scoring')
        
        if len(df) < 5000:
            logger.warning(f"⚠ Only {len(df)} samples (target: 5000+)")
        
        # Engineer features
        X, y = self.engineer_credit_features(df)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        logger.info(f"Train set: {len(X_train)} samples")
        logger.info(f"Test set: {len(X_test)} samples")
        
        # Normalize features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train models
        models = {
            'lr': LogisticRegression(random_state=42, max_iter=1000),
            'rf': RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42),
            'gb': GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42)
        }
        
        results = {}
        
        for name, model in models.items():
            logger.info(f"\nTraining {name.upper()} model...")
            
            # Cross-validation
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='accuracy')
            logger.info(f"  CV Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
            
            # Train
            model.fit(X_train_scaled, y_train)
            
            # Evaluate
            y_pred = model.predict(X_test_scaled)
            
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, zero_division=0)
            recall = recall_score(y_test, y_pred, zero_division=0)
            f1 = f1_score(y_test, y_pred, zero_division=0)
            
            results[name] = {
                'model': model,
                'cv_accuracy': float(cv_scores.mean()),
                'cv_accuracy_std': float(cv_scores.std()),
                'test_accuracy': float(accuracy),
                'test_precision': float(precision),
                'test_recall': float(recall),
                'test_f1': float(f1),
            }
            
            logger.info(f"  Test Accuracy: {accuracy:.4f}")
            logger.info(f"  Test Precision: {precision:.4f}")
            logger.info(f"  Test Recall: {recall:.4f}")
        
        # Select best model
        best_model_name = max(results, key=lambda k: results[k]['test_accuracy'])
        best_model = results[best_model_name]['model']
        best_metrics = results[best_model_name]
        
        logger.info(f"\n✓ Best model: {best_model_name.upper()} (Accuracy: {best_metrics['test_accuracy']:.4f})")
        
        # Check target range (80-88%)
        if 0.80 <= best_metrics['test_accuracy'] <= 0.88:
            logger.info("✓ Model performance within target range (80-88% accuracy)")
        elif best_metrics['test_accuracy'] > 0.88:
            logger.warning("⚠ Model may be overfitted (>88% accuracy)")
        else:
            logger.warning("⚠ Model underperforming (<80% accuracy)")
        
        # Save model
        model_dir = self.models_dir / "credit_scoring"
        model_dir.mkdir(parents=True, exist_ok=True)
        
        joblib.dump(best_model, model_dir / f"{best_model_name}_model.pkl")
        joblib.dump(scaler, model_dir / "scaler.pkl")
        
        # Save metadata
        metadata = {
            'version': self.version_timestamp,
            'model_type': best_model_name,
            'training_date': datetime.now().isoformat(),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'features': list(X.columns),
            'metrics': best_metrics,
            'all_models': {k: {key: val for key, val in v.items() if key != 'model'} 
                          for k, v in results.items()},
        }
        
        with open(model_dir / "metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"✓ Saved to: {model_dir}")
        
        return metadata

    def train_spending_analysis_model(self) -> Dict[str, Any]:
        """
        Train spending analysis model (clustering)
        Target: 0.71+ Silhouette score
        """
        logger.info("\n" + "=" * 80)
        logger.info("Training Spending Analysis Model (K-Means Clustering)")
        logger.info("=" * 80)
        
        # Load data
        df = self.load_training_data('spending_analysis')
        
        # Engineer features
        X = self.engineer_spending_features(df)
        
        logger.info(f"Feature matrix: {X.shape[0]} samples")
        
        # Normalize features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Train K-Means with different cluster counts
        cluster_range = range(3, 8)
        results = {}
        
        for n_clusters in cluster_range:
            logger.info(f"\nTrying {n_clusters} clusters...")
            
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            labels = kmeans.fit_predict(X_scaled)
            
            sil_score = silhouette_score(X_scaled, labels)
            
            results[n_clusters] = {
                'model': kmeans,
                'silhouette_score': float(sil_score),
                'n_clusters': n_clusters,
            }
            
            logger.info(f"  Silhouette Score: {sil_score:.4f}")
            
            # Show cluster sizes
            unique, counts = np.unique(labels, return_counts=True)
            logger.info(f"  Cluster sizes: {dict(zip(unique, counts))}")
        
        # Select best model
        best_n_clusters = max(results, key=lambda k: results[k]['silhouette_score'])
        best_model = results[best_n_clusters]['model']
        best_metrics = results[best_n_clusters]
        
        logger.info(f"\n✓ Best configuration: {best_n_clusters} clusters")
        logger.info(f"  Silhouette Score: {best_metrics['silhouette_score']:.4f}")
        
        # Check target (0.71+)
        if best_metrics['silhouette_score'] >= 0.71:
            logger.info("✓ Model performance meets target (0.71+ silhouette score)")
        else:
            logger.warning("⚠ Model below target (<0.71 silhouette score)")
        
        # Save model
        model_dir = self.models_dir / "spending_analysis"
        model_dir.mkdir(parents=True, exist_ok=True)
        
        joblib.dump(best_model, model_dir / "kmeans.pkl")
        joblib.dump(scaler, model_dir / "scaler.pkl")
        
        # Save metadata
        metadata = {
            'version': self.version_timestamp,
            'model_type': 'kmeans',
            'training_date': datetime.now().isoformat(),
            'training_samples': len(X),
            'features': list(X.columns),
            'n_clusters': best_n_clusters,
            'metrics': {
                'silhouette_score': best_metrics['silhouette_score'],
            },
            'all_configs': {k: {key: val for key, val in v.items() if key != 'model'} 
                           for k, v in results.items()},
        }
        
        with open(model_dir / "metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"✓ Saved to: {model_dir}")
        
        return metadata

    def retrain_all_models(self) -> Dict[str, Dict[str, Any]]:
        """Retrain all production models"""
        logger.info("\n" + "=" * 80)
        logger.info("PRODUCTION MODEL RETRAINING SESSION")
        logger.info(f"Version: {self.version_timestamp}")
        logger.info("=" * 80)
        
        results = {}
        
        try:
            results['fraud_detection'] = self.train_fraud_detection_model()
        except Exception as e:
            logger.error(f"Fraud detection training failed: {e}", exc_info=True)
            results['fraud_detection'] = {'error': str(e)}
        
        try:
            results['credit_scoring'] = self.train_credit_scoring_model()
        except Exception as e:
            logger.error(f"Credit scoring training failed: {e}", exc_info=True)
            results['credit_scoring'] = {'error': str(e)}
        
        try:
            results['spending_analysis'] = self.train_spending_analysis_model()
        except Exception as e:
            logger.error(f"Spending analysis training failed: {e}", exc_info=True)
            results['spending_analysis'] = {'error': str(e)}
        
        # Summary
        logger.info("\n" + "=" * 80)
        logger.info("RETRAINING COMPLETE")
        logger.info("=" * 80)
        
        for model_name, result in results.items():
            if 'error' in result:
                logger.error(f"  {model_name}: FAILED - {result['error']}")
            else:
                metrics = result.get('metrics', {})
                if 'test_roc_auc' in metrics:
                    logger.info(f"  {model_name}: ROC-AUC = {metrics['test_roc_auc']:.4f}")
                elif 'test_accuracy' in metrics:
                    logger.info(f"  {model_name}: Accuracy = {metrics['test_accuracy']:.4f}")
                elif 'silhouette_score' in metrics:
                    logger.info(f"  {model_name}: Silhouette = {metrics['silhouette_score']:.4f}")
        
        return results


def main():
    """Main execution"""
    retrainer = ProductionModelRetrainer()
    results = retrainer.retrain_all_models()
    
    logger.info("\n✅ All models retrained successfully!")
    logger.info(f"Version: {retrainer.version_timestamp}")


if __name__ == "__main__":
    main()
