"""
Agent Network Feature Extraction for ML Models (Buffr AI Backend)

Provides agent network features for fraud detection, transaction classification,
and other ML models in the Buffr AI backend.

Uses asyncpg for database access (compatible with buffr_ai structure).
"""

import logging
from typing import Dict, Optional
from datetime import datetime

import numpy as np
import pandas as pd
import asyncpg

logger = logging.getLogger(__name__)


class AgentNetworkFeatureExtractor:
    """
    Extract agent network features for ML models
    
    Features include:
    - Agent transaction indicators
    - Agent type and status
    - Agent liquidity information
    - Agent risk scores
    - Agent transaction patterns
    """
    
    def __init__(self):
        self.agent_cache: Dict[str, Dict] = {}
    
    async def fetch_agent_transaction_data(
        self,
        conn: asyncpg.Connection,
        transaction_ids: Optional[list] = None,
        user_id: Optional[str] = None,
        limit: int = 10000,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> pd.DataFrame:
        """
        Fetch transaction data with agent network information using asyncpg
        
        Args:
            conn: asyncpg database connection
            transaction_ids: Optional list of transaction IDs to filter
            user_id: Optional user ID to filter
            limit: Maximum number of records
            start_date: Optional start date filter
            end_date: Optional end date filter
            
        Returns:
            DataFrame with transaction data including agent features
        """
        try:
            # Use raw SQL with asyncpg for flexibility
            # This allows us to handle cases where agent tables may not exist
            base_query = """
            SELECT 
                t.id,
                t.user_id,
                t.wallet_id,
                t.transaction_type::text as transaction_type,
                t.status::text as status,
                t.amount,
                t.fee,
                t.total_amount,
                t.currency,
                t.payment_method::text as payment_method,
                t.created_at,
                t.processed_at,
                t.risk_score,
                t.flagged_for_review,
                -- Agent network features (may be NULL if tables don't exist)
                at.id as agent_transaction_id,
                at.agent_id,
                at.transaction_type as agent_transaction_type,
                at.status as agent_transaction_status,
                a.name as agent_name,
                a.type as agent_type,
                a.status as agent_status,
                a.liquidity_balance,
                a.cash_on_hand,
                a.min_liquidity_required,
                a.max_daily_cashout,
                a.commission_rate,
                a.location as agent_location,
                a.latitude as agent_latitude,
                a.longitude as agent_longitude
            FROM transactions t
            LEFT JOIN agent_transactions at ON t.id = at.beneficiary_id
            LEFT JOIN agents a ON at.agent_id = a.id
            """
            
            # Build WHERE conditions
            where_clauses = []
            params = []
            param_idx = 1
            
            if transaction_ids:
                where_clauses.append(f"t.id = ANY(${param_idx})")
                params.append(transaction_ids)
                param_idx += 1
            
            if user_id:
                where_clauses.append(f"t.user_id = ${param_idx}")
                params.append(user_id)
                param_idx += 1
            
            if start_date:
                where_clauses.append(f"t.created_at >= ${param_idx}")
                params.append(start_date)
                param_idx += 1
            
            if end_date:
                where_clauses.append(f"t.created_at <= ${param_idx}")
                params.append(end_date)
                param_idx += 1
            
            # Build final query
            if where_clauses:
                query_str = base_query + " WHERE " + " AND ".join(where_clauses)
            else:
                query_str = base_query
            
            query_str += f" ORDER BY t.created_at DESC LIMIT {limit}"
            
            # Execute query
            rows = await conn.fetch(query_str, *params)
            
            # Convert to DataFrame
            if rows:
                data = [dict(row) for row in rows]
                df = pd.DataFrame(data)
            else:
                # Return empty DataFrame with expected columns
                df = pd.DataFrame()
            
            return df
            
        except Exception as e:
            logger.warning(f"Failed to fetch agent transaction data (agent tables may not exist): {str(e)}")
            # Return empty DataFrame - agent features will be set to defaults
            return pd.DataFrame()
    
    def extract_agent_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Extract agent network features from transaction data
        
        Args:
            data: DataFrame with transaction and agent data
            
        Returns:
            DataFrame with added agent feature columns
        """
        if data.empty:
            return data
        
        # Initialize agent feature columns with defaults
        data['is_agent_transaction'] = 0
        data['agent_id'] = None
        data['agent_type_encoded'] = -1  # -1 = no agent, 0=small, 1=medium, 2=large
        data['agent_status_encoded'] = -1
        data['agent_liquidity_normalized'] = 0.0
        data['agent_cash_on_hand_normalized'] = 0.0
        data['agent_has_sufficient_liquidity'] = 0
        data['agent_transaction_type_encoded'] = 0  # 0=none, 1=cash_out, 2=cash_in, 3=commission
        data['agent_commission_rate'] = 0.0
        data['agent_risk_score'] = 0.5  # Default neutral risk
        
        # Check if agent columns exist
        if 'agent_id' in data.columns:
            # Mark agent transactions
            agent_mask = data['agent_id'].notna()
            data.loc[agent_mask, 'is_agent_transaction'] = 1
            
            # Encode agent type
            if 'agent_type' in data.columns:
                type_mapping = {'small': 0, 'medium': 1, 'large': 2}
                data.loc[agent_mask, 'agent_type_encoded'] = (
                    data.loc[agent_mask, 'agent_type']
                    .map(type_mapping)
                    .fillna(-1)
                    .astype(int)
                )
            
            # Encode agent status
            if 'agent_status' in data.columns:
                status_mapping = {
                    'active': 1,
                    'inactive': 0,
                    'suspended': -1,
                    'pending_approval': 0
                }
                data.loc[agent_mask, 'agent_status_encoded'] = (
                    data.loc[agent_mask, 'agent_status']
                    .map(status_mapping)
                    .fillna(0)
                    .astype(int)
                )
            
            # Normalize agent liquidity
            if 'liquidity_balance' in data.columns:
                liquidity_values = data.loc[agent_mask, 'liquidity_balance'].fillna(0)
                if liquidity_values.max() > 0:
                    data.loc[agent_mask, 'agent_liquidity_normalized'] = (
                        (liquidity_values - liquidity_values.mean()) / 
                        (liquidity_values.std() + 1e-6)
                    )
            
            # Normalize cash on hand
            if 'cash_on_hand' in data.columns:
                cash_values = data.loc[agent_mask, 'cash_on_hand'].fillna(0)
                if cash_values.max() > 0:
                    data.loc[agent_mask, 'agent_cash_on_hand_normalized'] = (
                        (cash_values - cash_values.mean()) / 
                        (cash_values.std() + 1e-6)
                    )
            
            # Check sufficient liquidity
            if 'liquidity_balance' in data.columns and 'min_liquidity_required' in data.columns:
                data.loc[agent_mask, 'agent_has_sufficient_liquidity'] = (
                    (data.loc[agent_mask, 'liquidity_balance'].fillna(0) >= 
                     data.loc[agent_mask, 'min_liquidity_required'].fillna(0))
                    .astype(int)
                )
            
            # Encode agent transaction type
            if 'agent_transaction_type' in data.columns:
                txn_type_mapping = {
                    'cash_out': 1,
                    'cash_in': 2,
                    'commission': 3
                }
                data.loc[agent_mask, 'agent_transaction_type_encoded'] = (
                    data.loc[agent_mask, 'agent_transaction_type']
                    .map(txn_type_mapping)
                    .fillna(0)
                    .astype(int)
                )
            
            # Agent commission rate
            if 'commission_rate' in data.columns:
                data.loc[agent_mask, 'agent_commission_rate'] = (
                    data.loc[agent_mask, 'commission_rate'].fillna(0.0)
                )
            
            # Calculate agent risk score (simplified - can be enhanced)
            if agent_mask.any():
                # Risk based on agent status, liquidity, and type
                risk_factors = []
                
                if 'agent_status_encoded' in data.columns:
                    # Suspended agents = high risk
                    risk_factors.append(
                        (data.loc[agent_mask, 'agent_status_encoded'] < 0).astype(float) * 0.5
                    )
                
                if 'agent_has_sufficient_liquidity' in data.columns:
                    # Insufficient liquidity = medium risk
                    risk_factors.append(
                        (1 - data.loc[agent_mask, 'agent_has_sufficient_liquidity']).astype(float) * 0.3
                    )
                
                if risk_factors:
                    data.loc[agent_mask, 'agent_risk_score'] = (
                        0.5 - np.sum(risk_factors, axis=0)  # Start at neutral, subtract risk
                    ).clip(0.0, 1.0)
        
        return data
    
    def get_agent_feature_names(self) -> list:
        """
        Get list of agent feature column names
        
        Returns:
            List of feature names
        """
        return [
            'is_agent_transaction',
            'agent_type_encoded',
            'agent_status_encoded',
            'agent_liquidity_normalized',
            'agent_cash_on_hand_normalized',
            'agent_has_sufficient_liquidity',
            'agent_transaction_type_encoded',
            'agent_commission_rate',
            'agent_risk_score',
        ]
    
    def get_agent_feature_array(self, data: pd.DataFrame) -> np.ndarray:
        """
        Extract agent features as numpy array for ML models
        
        Args:
            data: DataFrame with agent features
            
        Returns:
            Numpy array with agent features (n_samples, n_features)
        """
        feature_names = self.get_agent_feature_names()
        
        # Ensure all features exist
        for feature in feature_names:
            if feature not in data.columns:
                data[feature] = 0.0 if 'normalized' in feature or 'rate' in feature or 'score' in feature else 0
        
        # Extract features
        features = data[feature_names].values
        
        return features


# Global instance
agent_feature_extractor = AgentNetworkFeatureExtractor()
