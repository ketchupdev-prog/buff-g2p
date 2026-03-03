"""
Credit Scoring Ensemble - Guardian Agent (Production)

4-model ensemble for merchant credit risk assessment:
1. Logistic Regression (regulatory compliant, explainable)
2. Decision Trees (rule-based, transparent)
3. Random Forest (production model, robust)
4. Gradient Boosting (highest accuracy)

Target Performance:
- ROC-AUC: >0.75 (industry standard)
- Gini Coefficient: >0.50
- Brier Score: <0.15 (well-calibrated)
- Default Rate: <5% for approved loans
- Explainable for regulatory compliance
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import joblib
import logging

from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier
)
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    roc_auc_score,
    brier_score_loss,
    classification_report,
    confusion_matrix
)

logger = logging.getLogger(__name__)


@dataclass
class CreditFeatures:
    """
    Feature vector for credit scoring

    30 features covering:
    - Transaction-based features (revenue, volume, volatility)
    - Merchant profile features (age, category, location)
    - Alternative data features (social, stability)
    - Loan history features (if applicable)
    """
    # Transaction-based features
    monthly_avg_revenue: float
    monthly_transaction_count: float
    revenue_volatility: float  # Standard deviation
    revenue_trend_3month: float  # Slope
    weekend_weekday_ratio: float
    peak_transaction_consistency: float

    # Merchant profile
    business_age_months: int
    merchant_category_risk: float  # Risk score by category
    avg_transaction_amount: float
    unique_customer_count_monthly: float
    customer_retention_rate: float
    transaction_decline_rate: float

    # Alternative data
    has_social_media_presence: int
    business_registration_verified: int
    location_stability_score: float
    operating_hours_consistency: float
    seasonal_pattern_strength: float
    cross_border_ratio: float

    # Loan history (if applicable)
    has_previous_loans: int
    previous_loan_repayment_rate: float
    max_loan_handled: float
    default_history_flag: int
    debt_to_revenue_ratio: float
    current_outstanding_loans: int

    # Financial health
    revenue_growth_rate: float
    transaction_growth_rate: float
    merchant_tenure_score: float
    payment_consistency_score: float

    def to_array(self) -> np.ndarray:
        """Convert features to numpy array"""
        return np.array([
            self.monthly_avg_revenue,
            self.monthly_transaction_count,
            self.revenue_volatility,
            self.revenue_trend_3month,
            self.weekend_weekday_ratio,
            self.peak_transaction_consistency,
            self.business_age_months,
            self.merchant_category_risk,
            self.avg_transaction_amount,
            self.unique_customer_count_monthly,
            self.customer_retention_rate,
            self.transaction_decline_rate,
            self.has_social_media_presence,
            self.business_registration_verified,
            self.location_stability_score,
            self.operating_hours_consistency,
            self.seasonal_pattern_strength,
            self.cross_border_ratio,
            self.has_previous_loans,
            self.previous_loan_repayment_rate,
            self.max_loan_handled,
            self.default_history_flag,
            self.debt_to_revenue_ratio,
            self.current_outstanding_loans,
            self.revenue_growth_rate,
            self.transaction_growth_rate,
            self.merchant_tenure_score,
            self.payment_consistency_score
        ])


class CreditScoringEnsemble:
    """
    Ensemble credit scoring system for merchant lending

    Buffr Lend progressive lending: NAD 500 - 10,000
    Credit tiers: EXCELLENT, GOOD, FAIR, POOR, DECLINED
    """

    def __init__(self):
        # Models
        self.logistic_model: Optional[LogisticRegression] = None
        self.decision_tree: Optional[DecisionTreeClassifier] = None
        self.rf_model: Optional[RandomForestClassifier] = None
        self.gb_model: Optional[GradientBoostingClassifier] = None

        # Preprocessing
        self.scaler = StandardScaler()

        # Ensemble weights (GB highest due to accuracy)
        self.ensemble_weights = {
            'logistic': 0.25,
            'decision_tree': 0.10,
            'random_forest': 0.30,
            'gradient_boosting': 0.35
        }

        # Credit tier thresholds (credit score)
        self.tier_thresholds = {
            'EXCELLENT': 700,  # NAD 10,000 max
            'GOOD': 650,       # NAD 5,000 max
            'FAIR': 600,       # NAD 2,000 max
            'POOR': 550,       # NAD 500 max
            'DECLINED': 0      # No loan
        }

        # Interest rates by tier
        self.interest_rates = {
            'EXCELLENT': 0.08,  # 8% APR
            'GOOD': 0.12,       # 12% APR
            'FAIR': 0.16,       # 16% APR
            'POOR': 0.20,       # 20% APR
            'DECLINED': 0.0
        }

        self.is_trained = False
        self.feature_names = [
            'monthly_avg_revenue', 'monthly_transaction_count',
            'revenue_volatility', 'revenue_trend_3month',
            'weekend_weekday_ratio', 'peak_transaction_consistency',
            'business_age_months', 'merchant_category_risk',
            'avg_transaction_amount', 'unique_customer_count_monthly',
            'customer_retention_rate', 'transaction_decline_rate',
            'has_social_media_presence', 'business_registration_verified',
            'location_stability_score', 'operating_hours_consistency',
            'seasonal_pattern_strength', 'cross_border_ratio',
            'has_previous_loans', 'previous_loan_repayment_rate',
            'max_loan_handled', 'default_history_flag',
            'debt_to_revenue_ratio', 'current_outstanding_loans',
            'revenue_growth_rate', 'transaction_growth_rate',
            'merchant_tenure_score', 'payment_consistency_score'
        ]

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None
    ) -> Dict[str, float]:
        """
        Train all 4 credit scoring models

        Args:
            X_train: Training features (n_samples, 30)
            y_train: Training labels - 1=default, 0=repaid
            X_val: Validation features (optional)
            y_val: Validation labels (optional)

        Returns:
            Performance metrics
        """
        logger.info("Training Credit Scoring Ensemble...")

        # Fit scaler
        X_train_scaled = self.scaler.fit_transform(X_train)

        if X_val is not None:
            X_val_scaled = self.scaler.transform(X_val)

        # 1. Logistic Regression (explainable, compliant)
        logger.info("Training Logistic Regression...")
        self.logistic_model = LogisticRegression(
            penalty='l2',
            C=0.5,  # Strong regularization for stability
            solver='lbfgs',
            max_iter=1000,
            class_weight='balanced',
            random_state=42
        )
        self.logistic_model.fit(X_train_scaled, y_train)

        # 2. Decision Tree (rule-based, transparent)
        logger.info("Training Decision Tree...")
        self.decision_tree = DecisionTreeClassifier(
            max_depth=5,  # Limit depth for interpretability
            min_samples_split=50,
            min_samples_leaf=20,
            criterion='gini',
            random_state=42
        )
        self.decision_tree.fit(X_train_scaled, y_train)

        # 3. Random Forest (robust, production)
        logger.info("Training Random Forest...")
        self.rf_model = RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            min_samples_split=30,
            min_samples_leaf=15,
            max_features='sqrt',
            class_weight='balanced',
            n_jobs=-1,
            random_state=42
        )
        self.rf_model.fit(X_train_scaled, y_train)

        # 4. Gradient Boosting (highest accuracy)
        logger.info("Training Gradient Boosting...")
        self.gb_model = GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=3,
            min_samples_split=30,
            min_samples_leaf=15,
            subsample=0.8,
            random_state=42
        )
        self.gb_model.fit(X_train_scaled, y_train)

        self.is_trained = True

        # Evaluate on validation set
        if X_val is not None and y_val is not None:
            metrics = self.evaluate(X_val, y_val)
            logger.info(f"Validation Metrics: {metrics}")
            return metrics

        return {}

    def assess_credit(
        self,
        features: np.ndarray
    ) -> Dict[str, Any]:
        """
        Comprehensive credit assessment

        Args:
            features: Feature vector (30,)

        Returns:
            {
                'credit_score': int (300-850),
                'default_probability': float (0-1),
                'tier': str,
                'max_loan_amount': float,
                'interest_rate': float,
                'model_scores': dict
            }
        """
        if not self.is_trained:
            raise ValueError("Models must be trained before assessment")

        # Handle single sample
        if features.ndim == 1:
            features = features.reshape(1, -1)

        # Scale features
        features_scaled = self.scaler.transform(features)

        # Get predictions from each model
        p_logistic = self.logistic_model.predict_proba(features_scaled)[:, 1]
        p_dt = self.decision_tree.predict_proba(features_scaled)[:, 1]
        p_rf = self.rf_model.predict_proba(features_scaled)[:, 1]
        p_gb = self.gb_model.predict_proba(features_scaled)[:, 1]

        # Weighted ensemble for default probability
        p_default = (
            self.ensemble_weights['logistic'] * p_logistic +
            self.ensemble_weights['decision_tree'] * p_dt +
            self.ensemble_weights['random_forest'] * p_rf +
            self.ensemble_weights['gradient_boosting'] * p_gb
        )[0]

        # Convert to credit score (300-850 scale)
        credit_score = int(300 + 550 * (1 - p_default))

        # Determine tier and loan details
        tier_info = self._determine_loan_tier(credit_score)

        return {
            'credit_score': credit_score,
            'default_probability': float(p_default),
            'tier': tier_info['tier'],
            'max_loan_amount': tier_info['max_loan'],
            'interest_rate': tier_info['interest_rate'],
            'model_scores': {
                'logistic_regression': float(p_logistic[0]),
                'decision_tree': float(p_dt[0]),
                'random_forest': float(p_rf[0]),
                'gradient_boosting': float(p_gb[0])
            },
            'recommendation': tier_info['recommendation']
        }

    def _determine_loan_tier(self, credit_score: int) -> Dict[str, Any]:
        """Determine loan tier based on credit score"""
        if credit_score >= self.tier_thresholds['EXCELLENT']:
            return {
                'tier': 'EXCELLENT',
                'max_loan': 10000.0,
                'interest_rate': self.interest_rates['EXCELLENT'],
                'recommendation': 'Approved for maximum loan amount with best rates'
            }
        elif credit_score >= self.tier_thresholds['GOOD']:
            return {
                'tier': 'GOOD',
                'max_loan': 5000.0,
                'interest_rate': self.interest_rates['GOOD'],
                'recommendation': 'Approved with standard terms'
            }
        elif credit_score >= self.tier_thresholds['FAIR']:
            return {
                'tier': 'FAIR',
                'max_loan': 2000.0,
                'interest_rate': self.interest_rates['FAIR'],
                'recommendation': 'Approved for starter loan'
            }
        elif credit_score >= self.tier_thresholds['POOR']:
            return {
                'tier': 'POOR',
                'max_loan': 500.0,
                'interest_rate': self.interest_rates['POOR'],
                'recommendation': 'Approved for minimum loan only'
            }
        else:
            return {
                'tier': 'DECLINED',
                'max_loan': 0.0,
                'interest_rate': 0.0,
                'recommendation': 'Not approved at this time. Build transaction history and reapply.'
            }

    def explain_credit_decision(
        self,
        features: np.ndarray,
        model_scores: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """
        Generate explanation for credit decision using feature importance

        Returns top 5 factors influencing the score
        """
        if features.ndim == 1:
            features_scaled = self.scaler.transform(features.reshape(1, -1))[0]
        else:
            features_scaled = self.scaler.transform(features)[0]

        # Use logistic regression coefficients for explainability
        coefficients = self.logistic_model.coef_[0]

        # Calculate contributions
        contributions = []
        for i, (feature_name, coef, value) in enumerate(
            zip(self.feature_names, coefficients, features_scaled)
        ):
            contribution = coef * value
            contributions.append({
                'feature': feature_name,
                'coefficient': float(coef),
                'normalized_value': float(value),
                'raw_value': float(features[i] if features.ndim == 1 else features[0][i]),
                'contribution': float(contribution),
                'impact': 'increases_risk' if contribution > 0 else 'decreases_risk'
            })

        # Sort by absolute contribution
        contributions.sort(key=lambda x: abs(x['contribution']), reverse=True)

        return contributions[:5]

    def get_decision_rules(self) -> str:
        """
        Extract human-readable decision rules from decision tree

        For regulatory transparency
        """
        if self.decision_tree is None:
            return "Decision tree not trained"

        rules = export_text(
            self.decision_tree,
            feature_names=self.feature_names,
            max_depth=5
        )
        return rules

    def evaluate(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, float]:
        """
        Evaluate ensemble performance

        Returns ROC-AUC, Gini, Brier Score, etc.
        """
        X_test_scaled = self.scaler.transform(X_test)

        # Get probability predictions
        probs = []
        for i in range(len(X_test)):
            assessment = self.assess_credit(X_test[i])
            probs.append(assessment['default_probability'])

        probs = np.array(probs)
        y_pred = (probs > 0.5).astype(int)

        # Calculate metrics
        roc_auc = roc_auc_score(y_test, probs)
        gini = 2 * roc_auc - 1
        brier = brier_score_loss(y_test, probs)

        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()

        metrics = {
            'roc_auc': float(roc_auc),
            'gini_coefficient': float(gini),
            'brier_score': float(brier),
            'accuracy': float((tp + tn) / (tp + tn + fp + fn)),
            'precision': float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0,
            'recall': float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0,
            'true_positives': int(tp),
            'false_positives': int(fp),
            'true_negatives': int(tn),
            'false_negatives': int(fn)
        }
        
        # ML Best Practice: Feature importance from multiple models
        feature_importance = {}
        
        # From Random Forest
        if self.rf_model is not None:
            rf_importance = self.rf_model.feature_importances_
            feature_importance['random_forest'] = {
                name: float(imp)
                for name, imp in zip(self.feature_names, rf_importance)
            }
        
        # From Gradient Boosting
        if self.gb_model is not None:
            gb_importance = self.gb_model.feature_importances_
            feature_importance['gradient_boosting'] = {
                name: float(imp)
                for name, imp in zip(self.feature_names, gb_importance)
            }
        
        # From Logistic Regression (coefficients)
        if self.logistic_model is not None:
            lr_coefs = np.abs(self.logistic_model.coef_[0])
            # Normalize to sum to 1 for comparison
            lr_coefs_norm = lr_coefs / lr_coefs.sum()
            feature_importance['logistic_regression'] = {
                name: float(coef)
                for name, coef in zip(self.feature_names, lr_coefs_norm)
            }
        
        metrics['feature_importance'] = feature_importance
        
        # Top 5 most important features (average across models)
        if feature_importance:
            avg_importance = {}
            for name in self.feature_names:
                importances = [
                    imp.get(name, 0)
                    for imp in feature_importance.values()
                ]
                avg_importance[name] = np.mean(importances)
            
            top_features = sorted(
                avg_importance.items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]
            metrics['top_features'] = [
                {'feature': name, 'importance': float(imp)}
                for name, imp in top_features
            ]

        return metrics

    def save(self, directory: Path):
        """Save all models"""
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)

        joblib.dump(self.logistic_model, directory / 'logistic_model.pkl')
        joblib.dump(self.decision_tree, directory / 'decision_tree.pkl')
        joblib.dump(self.rf_model, directory / 'random_forest_model.pkl')
        joblib.dump(self.gb_model, directory / 'gradient_boosting_model.pkl')
        joblib.dump(self.scaler, directory / 'scaler.pkl')

        metadata = {
            'ensemble_weights': self.ensemble_weights,
            'feature_names': self.feature_names,
            'tier_thresholds': self.tier_thresholds,
            'interest_rates': self.interest_rates,
            'is_trained': self.is_trained
        }
        joblib.dump(metadata, directory / 'metadata.pkl')

        logger.info(f"Credit scoring models saved to {directory}")

    def load(self, directory: Path):
        """Load all models"""
        directory = Path(directory)

        self.logistic_model = joblib.load(directory / 'logistic_model.pkl')
        self.decision_tree = joblib.load(directory / 'decision_tree.pkl')
        self.rf_model = joblib.load(directory / 'random_forest_model.pkl')
        self.gb_model = joblib.load(directory / 'gradient_boosting_model.pkl')
        self.scaler = joblib.load(directory / 'scaler.pkl')

        metadata = joblib.load(directory / 'metadata.pkl')
        self.ensemble_weights = metadata['ensemble_weights']
        self.feature_names = metadata['feature_names']
        self.tier_thresholds = metadata['tier_thresholds']
        self.interest_rates = metadata['interest_rates']
        self.is_trained = metadata['is_trained']

        logger.info(f"Credit scoring models loaded from {directory}")


def extract_credit_features(merchant_data: Dict[str, Any]) -> np.ndarray:
    """
    Extract credit scoring features from merchant data

    In production, this fetches real transaction history, business data, etc.

    Args:
        merchant_data: Dictionary with merchant information and transaction history

    Returns:
        Feature vector (30,) as numpy array
    """
    # Extract from merchant profile
    profile = merchant_data.get('profile', {})
    transactions = merchant_data.get('transactions', [])

    # Calculate transaction-based features
    if transactions:
        amounts = [t.get('amount', 0) for t in transactions]
        monthly_revenue = np.mean(amounts) * 30  # Approximate monthly
        revenue_volatility = np.std(amounts)
        transaction_count = len(transactions)
    else:
        monthly_revenue = 0
        revenue_volatility = 0
        transaction_count = 0

    features = CreditFeatures(
        monthly_avg_revenue=monthly_revenue,
        monthly_transaction_count=transaction_count,
        revenue_volatility=revenue_volatility,
        revenue_trend_3month=merchant_data.get('revenue_trend', 0),
        weekend_weekday_ratio=merchant_data.get('weekend_ratio', 0.3),
        peak_transaction_consistency=merchant_data.get('consistency_score', 0.5),

        business_age_months=profile.get('business_age_months', 0),
        merchant_category_risk=merchant_data.get('category_risk', 0.5),
        avg_transaction_amount=np.mean(amounts) if amounts else 0,
        unique_customer_count_monthly=merchant_data.get('unique_customers', 10),
        customer_retention_rate=merchant_data.get('retention_rate', 0.5),
        transaction_decline_rate=merchant_data.get('decline_rate', 0.05),

        has_social_media_presence=int(merchant_data.get('has_social_media', False)),
        business_registration_verified=int(profile.get('business_registration_number') is not None),
        location_stability_score=merchant_data.get('location_stability', 0.8),
        operating_hours_consistency=merchant_data.get('hours_consistency', 0.7),
        seasonal_pattern_strength=merchant_data.get('seasonality', 0.3),
        cross_border_ratio=merchant_data.get('cross_border_ratio', 0.0),

        has_previous_loans=int(merchant_data.get('previous_loans', 0) > 0),
        previous_loan_repayment_rate=merchant_data.get('repayment_rate', 1.0),
        max_loan_handled=merchant_data.get('max_loan', 0),
        default_history_flag=int(merchant_data.get('has_defaulted', False)),
        debt_to_revenue_ratio=merchant_data.get('debt_to_revenue', 0),
        current_outstanding_loans=merchant_data.get('outstanding_loans', 0),

        revenue_growth_rate=merchant_data.get('revenue_growth', 0),
        transaction_growth_rate=merchant_data.get('transaction_growth', 0),
        merchant_tenure_score=min(profile.get('business_age_months', 0) / 24, 1.0),
        payment_consistency_score=merchant_data.get('payment_consistency', 0.8)
    )

    return features.to_array()


async def load_credit_models() -> CreditScoringEnsemble:
    """Load pre-trained credit scoring models"""
    import os

    model_dir = Path(os.getenv('MODEL_DIR', 'buffr_ai/models/credit_scoring'))

    ensemble = CreditScoringEnsemble()

    if model_dir.exists():
        try:
            ensemble.load(model_dir)
            logger.info("Credit scoring models loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load models: {e}. Using untrained ensemble.")
    else:
        logger.warning(f"Model directory {model_dir} does not exist. Models need training.")

    return ensemble


if __name__ == '__main__':
    # Example usage and testing
    logging.basicConfig(level=logging.INFO)

    # Generate synthetic training data
    np.random.seed(42)
    n_samples = 5000
    n_default = int(n_samples * 0.10)  # 10% default rate

    # Good merchants (will repay)
    X_good = np.random.randn(n_samples - n_default, 30) + np.array([5000, 100, 500] + [0] * 27)
    y_good = np.zeros(n_samples - n_default)

    # Bad merchants (will default)
    X_bad = np.random.randn(n_default, 30) * 0.8
    y_bad = np.ones(n_default)

    X = np.vstack([X_good, X_bad])
    y = np.hstack([y_good, y_bad])

    # Shuffle
    shuffle_idx = np.random.permutation(n_samples)
    X = X[shuffle_idx]
    y = y[shuffle_idx]

    # Split
    split = int(0.8 * n_samples)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    # Train
    ensemble = CreditScoringEnsemble()
    metrics = ensemble.train(X_train, y_train, X_test, y_test)

    # Evaluate
    test_metrics = ensemble.evaluate(X_test, y_test)
    print("\nTest Metrics:")
    for metric, value in test_metrics.items():
        print(f"{metric}: {value:.4f}")

    # Test assessment
    sample = X_test[0]
    assessment = ensemble.assess_credit(sample)
    print(f"\nSample Credit Assessment:")
    print(f"Credit Score: {assessment['credit_score']}")
    print(f"Tier: {assessment['tier']}")
    print(f"Max Loan: NAD {assessment['max_loan_amount']:,.2f}")
    print(f"Interest Rate: {assessment['interest_rate']:.2%}")

    # Get decision rules
    print(f"\nDecision Tree Rules:\n{ensemble.get_decision_rules()}")
