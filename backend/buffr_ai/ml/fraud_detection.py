"""
Fraud Detection Ensemble - Guardian Agent

4-model ensemble for real-time transaction fraud detection:
1. Logistic Regression (baseline, fast, explainable)
2. Neural Network (deep learning, high accuracy)
3. Random Forest (ensemble, feature importance)
4. GMM Anomaly Detection (unsupervised, novel fraud patterns)

Target Performance:
- Precision: >95% (minimize false positives)
- Recall: >90% (catch most fraud)
- F1-Score: >92%
- Inference Time: <10ms per transaction
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import joblib
import logging

# Scikit-learn
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report
)

# PyTorch for Neural Network
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

logger = logging.getLogger(__name__)


@dataclass
class FraudFeatures:
    """
    Feature vector for fraud detection

    29 features total (enhanced with agent network):
    - Transaction amount (normalized)
    - Time features (hour, day_of_week, cyclical)
    - Merchant features (category, risk score)
    - Location features (distance from home)
    - User behavior features (velocity, deviation)
    - Device features (fingerprint match)
    - Historical features (merchant fraud rate)
    - Agent network features (9 features): is_agent_transaction, agent_type, agent_status,
      agent_liquidity_normalized, agent_cash_on_hand_normalized, agent_has_sufficient_liquidity,
      agent_transaction_type, agent_commission_rate, agent_risk_score
    """
    # Transaction features
    amount_normalized: float
    amount_log: float
    amount_deviation_from_avg: float

    # Time features
    hour_sin: float
    hour_cos: float
    day_of_week: int
    is_weekend: int
    is_unusual_hour: int  # 11pm-6am

    # Merchant features
    merchant_category_encoded: int
    merchant_fraud_rate: float

    # Location features
    distance_from_home_km: float
    is_foreign_transaction: int

    # User behavior
    transactions_last_hour: int
    transactions_last_day: int
    velocity_score: float  # transactions per hour trend

    # Device & verification
    device_fingerprint_match: int
    card_not_present: int

    # Additional features
    round_number_flag: int  # amount is round number
    beneficiary_account_age_days: int
    user_kyc_level: int  # 0=unverified, 1=basic, 2=full
    
    # Agent network features (9 features)
    is_agent_transaction: int = 0  # Binary flag for agent transactions
    agent_type_encoded: int = -1  # -1=none, 0=small, 1=medium, 2=large
    agent_status_encoded: int = -1  # -1=suspended, 0=inactive, 1=active
    agent_liquidity_normalized: float = 0.0  # Normalized liquidity balance
    agent_cash_on_hand_normalized: float = 0.0  # Normalized cash on hand
    agent_has_sufficient_liquidity: int = 0  # Binary liquidity sufficiency flag
    agent_transaction_type_encoded: int = 0  # 0=none, 1=cash_out, 2=cash_in, 3=commission
    agent_commission_rate: float = 0.0  # Commission percentage
    agent_risk_score: float = 0.5  # Calculated agent risk score (0.0-1.0)

    def to_array(self) -> np.ndarray:
        """Convert features to numpy array (29 features total)"""
        return np.array([
            self.amount_normalized,
            self.amount_log,
            self.amount_deviation_from_avg,
            self.hour_sin,
            self.hour_cos,
            self.day_of_week,
            self.is_weekend,
            self.is_unusual_hour,
            self.merchant_category_encoded,
            self.merchant_fraud_rate,
            self.distance_from_home_km,
            self.is_foreign_transaction,
            self.transactions_last_hour,
            self.transactions_last_day,
            self.velocity_score,
            self.device_fingerprint_match,
            self.card_not_present,
            self.round_number_flag,
            self.beneficiary_account_age_days,
            self.user_kyc_level,
            # Agent network features (9 features)
            self.is_agent_transaction,
            self.agent_type_encoded,
            self.agent_status_encoded,
            self.agent_liquidity_normalized,
            self.agent_cash_on_hand_normalized,
            self.agent_has_sufficient_liquidity,
            self.agent_transaction_type_encoded,
            self.agent_commission_rate,
            self.agent_risk_score
        ])


class FraudDetectionNN(nn.Module):
    """
    Neural Network for fraud detection

    Architecture:
    - Input: 29 features (20 original + 9 agent network features)
    - Hidden1: 64 neurons, ReLU, Dropout(0.3)
    - Hidden2: 32 neurons, ReLU, Dropout(0.2)
    - Hidden3: 16 neurons, ReLU
    - Output: 1 neuron, Sigmoid
    """

    def __init__(self, input_dim: int = 29):
        super(FraudDetectionNN, self).__init__()

        self.network = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Dropout(0.3),

            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(0.2),

            nn.Linear(32, 16),
            nn.ReLU(),

            nn.Linear(16, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.network(x)


class FraudDetectionEnsemble:
    """
    Ensemble fraud detection system combining 4 ML models
    """

    def __init__(self):
        # Models
        self.logistic_model: Optional[LogisticRegression] = None
        self.nn_model: Optional[FraudDetectionNN] = None
        self.rf_model: Optional[RandomForestClassifier] = None
        self.gmm_model: Optional[GaussianMixture] = None

        # Preprocessing
        self.scaler = StandardScaler()

        # Ensemble weights (tuned on validation set)
        self.ensemble_weights = {
            'logistic': 0.25,
            'neural_network': 0.35,
            'random_forest': 0.30,
            'gmm': 0.10
        }

        # Model metadata
        self.is_trained = False
        self.feature_names = [
            'amount_normalized', 'amount_log', 'amount_deviation_from_avg',
            'hour_sin', 'hour_cos', 'day_of_week', 'is_weekend', 'is_unusual_hour',
            'merchant_category_encoded', 'merchant_fraud_rate',
            'distance_from_home_km', 'is_foreign_transaction',
            'transactions_last_hour', 'transactions_last_day', 'velocity_score',
            'device_fingerprint_match', 'card_not_present',
            'round_number_flag', 'beneficiary_account_age_days', 'user_kyc_level',
            # Agent network features (9 features)
            'is_agent_transaction', 'agent_type_encoded', 'agent_status_encoded',
            'agent_liquidity_normalized', 'agent_cash_on_hand_normalized',
            'agent_has_sufficient_liquidity', 'agent_transaction_type_encoded',
            'agent_commission_rate', 'agent_risk_score'
        ]
        
        # ML Best Practice: Training history tracking
        self.training_history: Optional[Dict[str, Any]] = None

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None,
        epochs: int = 50,
        batch_size: int = 32,
        early_stopping: bool = True,
        patience: int = 10
    ) -> Dict[str, float]:
        """
        Train all 4 models in the ensemble

        Args:
            X_train: Training features (n_samples, 29) - 20 original + 9 agent features
            y_train: Training labels (n_samples,) - 1=fraud, 0=legitimate
            X_val: Validation features (optional)
            y_val: Validation labels (optional)
            epochs: Training epochs for NN
            batch_size: Batch size for NN

        Returns:
            Dictionary of performance metrics for each model
        """
        logger.info("Training Fraud Detection Ensemble...")

        # Fit scaler on training data
        X_train_scaled = self.scaler.fit_transform(X_train)

        if X_val is not None:
            X_val_scaled = self.scaler.transform(X_val)

        # 1. Train Logistic Regression
        logger.info("Training Logistic Regression...")
        self.logistic_model = LogisticRegression(
            penalty='l2',
            C=1.0,
            solver='lbfgs',
            max_iter=1000,
            class_weight='balanced',
            random_state=42
        )
        self.logistic_model.fit(X_train_scaled, y_train)

        # 2. Train Neural Network
        logger.info("Training Neural Network...")
        self.nn_model = FraudDetectionNN(input_dim=X_train.shape[1])
        self._train_neural_network(
            X_train_scaled, y_train,
            X_val_scaled if X_val is not None else None,
            y_val,
            epochs=epochs,
            batch_size=batch_size,
            early_stopping=early_stopping,
            patience=patience
        )

        # 3. Train Random Forest
        logger.info("Training Random Forest...")
        self.rf_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=20,
            min_samples_leaf=10,
            max_features='sqrt',
            class_weight='balanced_subsample',
            n_jobs=-1,
            random_state=42
        )
        self.rf_model.fit(X_train_scaled, y_train)

        # 4. Train GMM (on normal transactions only)
        logger.info("Training GMM Anomaly Detector...")
        normal_transactions = X_train_scaled[y_train == 0]
        self.gmm_model = GaussianMixture(
            n_components=5,
            covariance_type='full',
            max_iter=100,
            random_state=42
        )
        self.gmm_model.fit(normal_transactions)

        self.is_trained = True

        # Evaluate on validation set if provided
        if X_val is not None and y_val is not None:
            metrics = self.evaluate(X_val, y_val)
            logger.info(f"Validation Metrics: {metrics}")
            return metrics

        return {}

    def _train_neural_network(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray],
        y_val: Optional[np.ndarray],
        epochs: int = 50,
        batch_size: int = 32,
        early_stopping: bool = True,
        patience: int = 10
    ):
        """
        Train the neural network component with ML best practices:
        - Early stopping to prevent overfitting
        - Learning rate scheduling
        - Validation monitoring
        
        Args:
            X_train: Training features
            y_train: Training labels
            X_val: Validation features (optional)
            y_val: Validation labels (optional)
            epochs: Maximum epochs
            batch_size: Batch size
            early_stopping: Enable early stopping
            patience: Early stopping patience (epochs without improvement)
        """
        # Convert to PyTorch tensors
        X_tensor = torch.FloatTensor(X_train)
        y_tensor = torch.FloatTensor(y_train).unsqueeze(1)

        dataset = TensorDataset(X_tensor, y_tensor)
        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

        # Loss and optimizer
        criterion = nn.BCELoss()
        optimizer = optim.Adam(self.nn_model.parameters(), lr=0.001)
        
        # ML Best Practice: Learning rate scheduler
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode='min', factor=0.5, patience=5, verbose=True
        )

        # ML Best Practice: Early stopping
        best_val_loss = float('inf')
        patience_counter = 0
        train_losses = []
        val_losses = []

        # Training loop
        self.nn_model.train()
        for epoch in range(epochs):
            epoch_loss = 0.0
            for batch_X, batch_y in dataloader:
                optimizer.zero_grad()
                outputs = self.nn_model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                
                # ML Best Practice: Gradient clipping to prevent exploding gradients
                torch.nn.utils.clip_grad_norm_(self.nn_model.parameters(), max_norm=1.0)
                
                optimizer.step()
                epoch_loss += loss.item()

            avg_train_loss = epoch_loss / len(dataloader)
            train_losses.append(avg_train_loss)

            # ML Best Practice: Validation monitoring
            if X_val is not None and y_val is not None:
                self.nn_model.eval()
                with torch.no_grad():
                    X_val_tensor = torch.FloatTensor(X_val)
                    y_val_tensor = torch.FloatTensor(y_val).unsqueeze(1)
                    val_outputs = self.nn_model(X_val_tensor)
                    val_loss = criterion(val_outputs, y_val_tensor).item()
                    val_losses.append(val_loss)
                
                scheduler.step(val_loss)
                
                # Early stopping check
                if early_stopping:
                    if val_loss < best_val_loss:
                        best_val_loss = val_loss
                        patience_counter = 0
                        # Save best model state
                        best_model_state = self.nn_model.state_dict().copy()
                    else:
                        patience_counter += 1
                    
                    if patience_counter >= patience:
                        logger.info(f"Early stopping at epoch {epoch+1} (patience: {patience})")
                        # Restore best model
                        self.nn_model.load_state_dict(best_model_state)
                        break
                
                if (epoch + 1) % 10 == 0:
                    logger.info(
                        f"Epoch [{epoch+1}/{epochs}], "
                        f"Train Loss: {avg_train_loss:.4f}, "
                        f"Val Loss: {val_loss:.4f}"
                    )
            else:
                if (epoch + 1) % 10 == 0:
                    logger.info(f"Epoch [{epoch+1}/{epochs}], Loss: {avg_train_loss:.4f}")

        self.nn_model.eval()
        
        # Store training history for analysis
        self.training_history = {
            'train_losses': train_losses,
            'val_losses': val_losses if X_val is not None else None,
            'epochs_trained': epoch + 1
        }

    def predict_ensemble(
        self,
        features: np.ndarray,
        return_breakdown: bool = True
    ) -> Dict[str, Any]:
        """
        Make fraud prediction using ensemble of all models

        Args:
            features: Feature vector (29,) or batch (n, 29) - 20 original + 9 agent features
            return_breakdown: Whether to return individual model scores

        Returns:
            {
                'fraud_probability': float (0-1),
                'is_fraud': bool,
                'confidence': float,
                'model_scores': dict (if return_breakdown=True)
            }
        """
        if not self.is_trained:
            raise ValueError("Models must be trained before prediction")

        # Handle single sample vs batch
        if features.ndim == 1:
            features = features.reshape(1, -1)

        # Scale features
        features_scaled = self.scaler.transform(features)

        # Get predictions from each model
        p_logistic = self.logistic_model.predict_proba(features_scaled)[:, 1]

        # Neural network prediction
        self.nn_model.eval()
        with torch.no_grad():
            features_tensor = torch.FloatTensor(features_scaled)
            p_nn = self.nn_model(features_tensor).numpy().flatten()

        p_rf = self.rf_model.predict_proba(features_scaled)[:, 1]

        # GMM anomaly score (convert log likelihood to probability)
        gmm_score = self.gmm_model.score_samples(features_scaled)
        gmm_threshold = -10  # Tuned threshold
        p_gmm = (gmm_score < gmm_threshold).astype(float)

        # Weighted ensemble
        ensemble_prob = (
            self.ensemble_weights['logistic'] * p_logistic +
            self.ensemble_weights['neural_network'] * p_nn +
            self.ensemble_weights['random_forest'] * p_rf +
            self.ensemble_weights['gmm'] * p_gmm
        )

        result = {
            'fraud_probability': float(ensemble_prob[0]),
            'is_fraud': bool(ensemble_prob[0] > 0.5),
            'confidence': float(max(ensemble_prob[0], 1 - ensemble_prob[0]))
        }

        if return_breakdown:
            result['model_scores'] = {
                'logistic_regression': float(p_logistic[0]),
                'neural_network': float(p_nn[0]),
                'random_forest': float(p_rf[0]),
                'gmm_anomaly': float(p_gmm[0])
            }

        return result

    def explain_prediction(
        self,
        features: np.ndarray,
        model_scores: Dict[str, float]
    ) -> str:
        """
        Generate human-readable explanation for fraud prediction

        Uses logistic regression coefficients for feature importance
        """
        if features.ndim == 1:
            features_scaled = self.scaler.transform(features.reshape(1, -1))[0]
        else:
            features_scaled = self.scaler.transform(features)[0]

        # Get logistic regression coefficients
        coefficients = self.logistic_model.coef_[0]

        # Calculate feature contributions
        contributions = []
        for i, (feature_name, coef, value) in enumerate(
            zip(self.feature_names, coefficients, features_scaled)
        ):
            contribution = coef * value
            contributions.append({
                'feature': feature_name,
                'contribution': contribution,
                'raw_value': features[i] if features.ndim == 1 else features[0][i]
            })

        # Sort by absolute contribution
        contributions.sort(key=lambda x: abs(x['contribution']), reverse=True)

        # Build explanation
        top_factors = contributions[:5]

        explanation_parts = []
        for factor in top_factors:
            impact = "increases" if factor['contribution'] > 0 else "decreases"
            explanation_parts.append(
                f"- {factor['feature']}: {impact} fraud risk"
            )

        # Model consensus
        fraud_models = sum(1 for score in model_scores.values() if score > 0.5)
        consensus = f"{fraud_models}/4 models detected fraud"

        explanation = f"Top risk factors:\n" + "\n".join(explanation_parts)
        explanation += f"\n\nModel Consensus: {consensus}"

        return explanation

    def evaluate(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, float]:
        """
        Evaluate ensemble performance on test set

        Returns:
            Dictionary of metrics: precision, recall, f1, roc_auc, etc.
        """
        X_test_scaled = self.scaler.transform(X_test)

        # Get ensemble predictions
        predictions = []
        for i in range(len(X_test)):
            result = self.predict_ensemble(X_test[i], return_breakdown=False)
            predictions.append(result['is_fraud'])

        y_pred = np.array(predictions)

        # Calculate metrics
        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()

        metrics = {
            'accuracy': (tp + tn) / (tp + tn + fp + fn),
            'precision': precision_score(y_test, y_pred),
            'recall': recall_score(y_test, y_pred),
            'f1_score': f1_score(y_test, y_pred),
            'false_positive_rate': fp / (fp + tn),
            'true_positives': int(tp),
            'false_positives': int(fp),
            'true_negatives': int(tn),
            'false_negatives': int(fn)
        }

        # Get probability predictions for ROC-AUC
        probs = []
        for i in range(len(X_test)):
            result = self.predict_ensemble(X_test[i], return_breakdown=False)
            probs.append(result['fraud_probability'])

        metrics['roc_auc'] = roc_auc_score(y_test, probs)
        
        # ML Best Practice: Feature importance from Random Forest
        if self.rf_model is not None:
            feature_importance = self.rf_model.feature_importances_
            metrics['feature_importance'] = {
                name: float(importance)
                for name, importance in zip(self.feature_names, feature_importance)
            }
            # Top 5 most important features
            top_features = sorted(
                zip(self.feature_names, feature_importance),
                key=lambda x: x[1],
                reverse=True
            )[:5]
            metrics['top_features'] = [
                {'feature': name, 'importance': float(imp)}
                for name, imp in top_features
            ]

        return metrics

    def save(self, directory: Path):
        """Save all models to directory"""
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)

        # Save sklearn models
        joblib.dump(self.logistic_model, directory / 'logistic_model.pkl')
        joblib.dump(self.rf_model, directory / 'random_forest_model.pkl')
        joblib.dump(self.gmm_model, directory / 'gmm_model.pkl')
        joblib.dump(self.scaler, directory / 'scaler.pkl')

        # Save PyTorch model
        torch.save(self.nn_model.state_dict(), directory / 'nn_model.pt')

        # Save metadata
        metadata = {
            'ensemble_weights': self.ensemble_weights,
            'feature_names': self.feature_names,
            'is_trained': self.is_trained,
            'training_history': self.training_history
        }
        joblib.dump(metadata, directory / 'metadata.pkl')

        logger.info(f"Models saved to {directory}")

    def load(self, directory: Path):
        """Load all models from directory"""
        directory = Path(directory)

        # Load sklearn models
        self.logistic_model = joblib.load(directory / 'logistic_model.pkl')
        self.rf_model = joblib.load(directory / 'random_forest_model.pkl')
        self.gmm_model = joblib.load(directory / 'gmm_model.pkl')
        self.scaler = joblib.load(directory / 'scaler.pkl')

        # Load PyTorch model
        self.nn_model = FraudDetectionNN()
        self.nn_model.load_state_dict(torch.load(directory / 'nn_model.pt'))
        self.nn_model.eval()

        # Load metadata
        metadata = joblib.load(directory / 'metadata.pkl')
        self.ensemble_weights = metadata['ensemble_weights']
        self.feature_names = metadata['feature_names']
        self.is_trained = metadata['is_trained']
        self.training_history = metadata.get('training_history')

        logger.info(f"Models loaded from {directory}")


def extract_fraud_features(transaction_data: Dict[str, Any]) -> np.ndarray:
    """
    Extract fraud detection features from transaction data

    Args:
        transaction_data: Dictionary with transaction information

    Returns:
        Feature vector (20,) as numpy array
    """
    # This is a simplified version - in production, you'd fetch user history,
    # compute actual statistics, etc.

    import math
    from datetime import datetime

    # Parse transaction time
    txn_time = transaction_data.get('timestamp', datetime.now())
    if isinstance(txn_time, str):
        txn_time = datetime.fromisoformat(txn_time)

    hour = txn_time.hour
    day_of_week = txn_time.weekday()

    # Amount features
    amount = float(transaction_data.get('amount', 0))
    user_avg_amount = float(transaction_data.get('user_avg_amount', amount))

    features = FraudFeatures(
        amount_normalized=amount / 10000,  # Normalize to [0, 1] assuming max 10k NAD
        amount_log=math.log(amount + 1),
        amount_deviation_from_avg=(amount - user_avg_amount) / max(user_avg_amount, 1),

        # Time features (cyclical encoding)
        hour_sin=math.sin(2 * math.pi * hour / 24),
        hour_cos=math.cos(2 * math.pi * hour / 24),
        day_of_week=day_of_week,
        is_weekend=int(day_of_week >= 5),
        is_unusual_hour=int(hour >= 23 or hour <= 6),

        # Merchant features
        merchant_category_encoded=transaction_data.get('merchant_category_code', 0),
        merchant_fraud_rate=transaction_data.get('merchant_fraud_rate', 0.01),

        # Location features
        distance_from_home_km=transaction_data.get('distance_from_home', 0),
        is_foreign_transaction=int(transaction_data.get('is_foreign', False)),

        # User behavior
        transactions_last_hour=transaction_data.get('transactions_last_hour', 0),
        transactions_last_day=transaction_data.get('transactions_last_day', 1),
        velocity_score=transaction_data.get('velocity_score', 0),

        # Device
        device_fingerprint_match=int(transaction_data.get('device_match', True)),
        card_not_present=int(not transaction_data.get('card_present', False)),

        # Additional
        round_number_flag=int(amount % 100 == 0),
        beneficiary_account_age_days=transaction_data.get('beneficiary_account_age', 365),
        user_kyc_level=transaction_data.get('kyc_level', 0)
    )

    return features.to_array()


async def load_fraud_models() -> FraudDetectionEnsemble:
    """
    Load pre-trained fraud detection models

    Returns:
        Trained FraudDetectionEnsemble instance
    """
    import os

    model_dir = Path(os.getenv('MODEL_DIR', 'buffr_ai/models/fraud_detection'))

    ensemble = FraudDetectionEnsemble()

    if model_dir.exists():
        try:
            ensemble.load(model_dir)
            logger.info("Fraud detection models loaded successfully")
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
    n_samples = 10000
    n_fraud = int(n_samples * 0.05)  # 5% fraud rate

    # Legitimate transactions
    X_legit = np.random.randn(n_samples - n_fraud, 29)  # 20 original + 9 agent features
    y_legit = np.zeros(n_samples - n_fraud)

    # Fraudulent transactions (different distribution)
    X_fraud = np.random.randn(n_fraud, 29) * 1.5 + 2  # Shifted and scaled (29 features)
    y_fraud = np.ones(n_fraud)

    # Combine
    X = np.vstack([X_legit, X_fraud])
    y = np.hstack([y_legit, y_fraud])

    # Shuffle
    shuffle_idx = np.random.permutation(n_samples)
    X = X[shuffle_idx]
    y = y[shuffle_idx]

    # Split
    split = int(0.8 * n_samples)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    # Train ensemble
    ensemble = FraudDetectionEnsemble()
    metrics = ensemble.train(X_train, y_train, X_test, y_test, epochs=20)

    # Evaluate
    test_metrics = ensemble.evaluate(X_test, y_test)
    print("\nTest Metrics:")
    for metric, value in test_metrics.items():
        print(f"{metric}: {value:.4f}")

    # Test single prediction
    sample = X_test[0]
    result = ensemble.predict_ensemble(sample)
    print(f"\nSample Prediction:")
    print(f"Fraud Probability: {result['fraud_probability']:.4f}")
    print(f"Is Fraud: {result['is_fraud']}")
    print(f"Model Scores: {result['model_scores']}")
