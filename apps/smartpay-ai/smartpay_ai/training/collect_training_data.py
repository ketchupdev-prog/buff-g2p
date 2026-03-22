"""
Production Data Collection for ML Model Training

Location: smartpay_ai/training/collect_training_data.py
Purpose: Extract real production data from Neon PostgreSQL for ML model retraining
Target: 50K+ transactions with proper class balancing
Output: smartpay_ai/data/training/production_data.parquet
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional

import asyncpg
import pandas as pd
import numpy as np
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProductionDataCollector:
    """Collect training data from production Neon PostgreSQL database"""

    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize data collector
        
        Args:
            database_url: Neon PostgreSQL connection string (defaults to DATABASE_URL env var)
        """
        self.database_url = database_url or os.getenv("DATABASE_URL")
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        self.output_dir = Path(__file__).parent.parent.parent / "data" / "training"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Production data will be saved to: {self.output_dir}")

    async def collect_transactions_for_fraud_detection(
        self,
        months_back: int = 6,
        target_rows: int = 50000
    ) -> pd.DataFrame:
        """
        Collect transaction data for fraud detection model training
        
        Args:
            months_back: Number of months of historical data to collect
            target_rows: Target number of rows to collect
            
        Returns:
            DataFrame with transaction features and fraud labels
        """
        logger.info(f"Collecting transactions from last {months_back} months for fraud detection...")
        
        conn = await asyncpg.connect(self.database_url)
        
        try:
            cutoff_date = datetime.now() - timedelta(days=months_back * 30)
            
            query = """
                SELECT 
                    t.id as transaction_id,
                    t.source_user_id as user_id,
                    t.amount,
                    t.type as transaction_type,
                    t.created_at as timestamp,
                    t.source_wallet_id as wallet_id,
                    t.destination_wallet_id,
                    t.status,
                    t.metadata,
                    
                    -- User context
                    u.kyc_tier,
                    u.created_at as user_created_at,
                    u.metadata as user_metadata,
                    
                    -- Fraud labels from monitoring alerts
                    tma.id as alert_id,
                    tma.resolution_category,
                    tma.risk_score,
                    tma.alert_type,
                    tma.detection_method,
                    
                    -- Fraud detection rules triggered
                    fdr.rule_type,
                    fdr.rule_name
                    
                FROM transactions t
                LEFT JOIN users u ON t.source_user_id = u.id
                LEFT JOIN transaction_monitoring_alerts tma ON t.id = tma.transaction_id
                LEFT JOIN fraud_rule_triggers frt ON t.id = frt.transaction_id
                LEFT JOIN fraud_detection_rules fdr ON frt.rule_id = fdr.id
                WHERE t.created_at >= $1
                    AND t.amount > 0
                    AND t.source_user_id IS NOT NULL
                ORDER BY t.created_at DESC
                LIMIT $2
            """
            
            rows = await conn.fetch(query, cutoff_date, target_rows)
            
            if not rows:
                logger.warning("No transactions found in database")
                return pd.DataFrame()
            
            df = pd.DataFrame([dict(row) for row in rows])
            
            # Create fraud label
            df['is_fraud'] = df['resolution_category'].apply(
                lambda x: True if x == 'confirmed_fraud' 
                else (False if x in ['false_positive', 'legitimate_activity'] 
                else None)
            )
            
            # Count fraud cases
            fraud_count = df['is_fraud'].sum()
            fraud_rate = fraud_count / len(df) * 100 if len(df) > 0 else 0
            
            logger.info(f"Collected {len(df)} transactions")
            logger.info(f"  Fraud cases: {fraud_count} ({fraud_rate:.2f}%)")
            logger.info(f"  Legitimate: {len(df) - fraud_count}")
            logger.info(f"  Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
            
            return df
            
        finally:
            await conn.close()

    async def collect_users_for_credit_scoring(
        self,
        min_transactions: int = 5,
        target_rows: int = 10000
    ) -> pd.DataFrame:
        """
        Collect user data for credit scoring model training
        
        Args:
            min_transactions: Minimum number of transactions required per user
            target_rows: Target number of users to collect
            
        Returns:
            DataFrame with user credit features
        """
        logger.info(f"Collecting users with {min_transactions}+ transactions for credit scoring...")
        
        conn = await asyncpg.connect(self.database_url)
        
        try:
            query = """
            WITH user_transaction_stats AS (
                SELECT
                    t.source_user_id as user_id,
                    COUNT(*) as total_transactions,
                    AVG(t.amount) as avg_transaction_amount,
                    STDDEV(t.amount) as std_transaction_amount,
                    SUM(t.amount) as total_spending,
                    MIN(t.created_at) as first_transaction,
                    MAX(t.created_at) as last_transaction,
                    COUNT(DISTINCT t.type) as transaction_type_diversity,
                    COUNT(DISTINCT DATE_TRUNC('month', t.created_at)) as active_months
                FROM transactions t
                WHERE t.amount > 0
                    AND t.source_user_id IS NOT NULL
                    AND t.status = 'completed'
                GROUP BY t.source_user_id
                HAVING COUNT(*) >= $1
            ),
            user_loan_stats AS (
                SELECT
                    l.user_id,
                    COUNT(*) as total_loans,
                    SUM(CASE WHEN l.status = 'repaid' THEN 1 ELSE 0 END) as loans_repaid,
                    SUM(CASE WHEN l.status = 'defaulted' THEN 1 ELSE 0 END) as loans_defaulted,
                    SUM(l.amount) as total_borrowed,
                    AVG(l.amount) as avg_loan_amount
                FROM loans l
                GROUP BY l.user_id
            ),
            user_wallet_stats AS (
                SELECT
                    w.user_id,
                    AVG(w.balance) as avg_balance,
                    MAX(w.balance) as max_balance
                FROM wallets w
                GROUP BY w.user_id
            )
            SELECT
                u.id as user_id,
                u.kyc_tier,
                u.created_at as account_created_at,
                u.phone,
                u.metadata,
                
                -- Transaction stats
                COALESCE(uts.total_transactions, 0) as total_transactions,
                COALESCE(uts.avg_transaction_amount, 0) as avg_transaction_amount,
                COALESCE(uts.std_transaction_amount, 0) as std_transaction_amount,
                COALESCE(uts.total_spending, 0) as total_spending,
                COALESCE(uts.active_months, 0) as active_months,
                COALESCE(uts.transaction_type_diversity, 0) as transaction_diversity,
                
                -- Loan stats
                COALESCE(uls.total_loans, 0) as total_loans,
                COALESCE(uls.loans_repaid, 0) as loans_repaid,
                COALESCE(uls.loans_defaulted, 0) as loans_defaulted,
                COALESCE(uls.total_borrowed, 0) as total_borrowed,
                COALESCE(uls.avg_loan_amount, 0) as avg_loan_amount,
                
                -- Wallet stats
                COALESCE(uws.avg_balance, 0) as avg_balance,
                COALESCE(uws.max_balance, 0) as max_balance
                
            FROM users u
            INNER JOIN user_transaction_stats uts ON u.id = uts.user_id
            LEFT JOIN user_loan_stats uls ON u.id = uls.user_id
            LEFT JOIN user_wallet_stats uws ON u.id = uws.user_id
            ORDER BY uts.total_transactions DESC
            LIMIT $2
            """
            
            rows = await conn.fetch(query, min_transactions, target_rows)
            
            if not rows:
                logger.warning("No users found meeting criteria")
                return pd.DataFrame()
            
            df = pd.DataFrame([dict(row) for row in rows])
            
            # Create credit score label (based on loan repayment history)
            df['credit_score_label'] = df.apply(
                lambda row: 'good' if row['total_loans'] == 0 or 
                    (row['loans_repaid'] / row['total_loans'] >= 0.9 if row['total_loans'] > 0 else True)
                else 'bad',
                axis=1
            )
            
            good_count = (df['credit_score_label'] == 'good').sum()
            
            logger.info(f"Collected {len(df)} users")
            logger.info(f"  Good credit: {good_count} ({good_count/len(df)*100:.1f}%)")
            logger.info(f"  Bad credit: {len(df) - good_count}")
            logger.info(f"  Avg transactions per user: {df['total_transactions'].mean():.1f}")
            
            return df
            
        finally:
            await conn.close()

    async def collect_spending_patterns(
        self,
        min_monthly_transactions: int = 5,
        target_rows: int = 25000
    ) -> pd.DataFrame:
        """
        Collect spending pattern data for clustering/segmentation
        
        Args:
            min_monthly_transactions: Minimum transactions per user-month
            target_rows: Target number of user-month records
            
        Returns:
            DataFrame with spending analysis features
        """
        logger.info(f"Collecting spending patterns (user-months)...")
        
        conn = await asyncpg.connect(self.database_url)
        
        try:
            query = """
            WITH user_monthly_spending AS (
                SELECT
                    t.source_user_id as user_id,
                    DATE_TRUNC('month', t.created_at) as month,
                    SUM(t.amount) as monthly_spending,
                    COUNT(*) as transaction_count,
                    AVG(t.amount) as avg_transaction_size,
                    STDDEV(t.amount) as std_transaction_size,
                    COUNT(DISTINCT t.type) as category_diversity_raw,
                    
                    -- Weekend vs weekday
                    COUNT(*) FILTER (WHERE EXTRACT(DOW FROM t.created_at) IN (0, 6)) as weekend_txs,
                    COUNT(*) FILTER (WHERE EXTRACT(DOW FROM t.created_at) NOT IN (0, 6)) as weekday_txs,
                    
                    -- Category breakdowns (type-based proxy)
                    SUM(CASE WHEN t.type ILIKE '%grocery%' OR t.type ILIKE '%food%' THEN t.amount ELSE 0 END) as groceries_amount,
                    SUM(CASE WHEN t.type ILIKE '%transport%' OR t.type ILIKE '%fuel%' THEN t.amount ELSE 0 END) as transport_amount,
                    SUM(CASE WHEN t.type ILIKE '%utility%' OR t.type ILIKE '%bill%' THEN t.amount ELSE 0 END) as utilities_amount,
                    SUM(CASE WHEN t.type ILIKE '%entertainment%' OR t.type ILIKE '%movie%' THEN t.amount ELSE 0 END) as entertainment_amount
                    
                FROM transactions t
                WHERE t.amount > 0
                    AND t.source_user_id IS NOT NULL
                    AND t.status = 'completed'
                GROUP BY t.source_user_id, DATE_TRUNC('month', t.created_at)
                HAVING COUNT(*) >= $1
            ),
            user_wallet_balances AS (
                SELECT
                    w.user_id,
                    AVG(w.balance) as avg_balance
                FROM wallets w
                GROUP BY w.user_id
            )
            SELECT
                ums.user_id,
                ums.month,
                ums.monthly_spending,
                ums.transaction_count,
                ums.category_diversity_raw,
                ums.avg_transaction_size,
                COALESCE(ums.std_transaction_size, 0) as std_transaction_size,
                ums.weekend_txs,
                ums.weekday_txs,
                ums.groceries_amount,
                ums.transport_amount,
                ums.utilities_amount,
                ums.entertainment_amount,
                COALESCE(uwb.avg_balance, 0) as avg_balance
            FROM user_monthly_spending ums
            LEFT JOIN user_wallet_balances uwb ON ums.user_id = uwb.user_id
            ORDER BY ums.month DESC, ums.monthly_spending DESC
            LIMIT $2
            """
            
            rows = await conn.fetch(query, min_monthly_transactions, target_rows)
            
            if not rows:
                logger.warning("No spending patterns found")
                return pd.DataFrame()
            
            df = pd.DataFrame([dict(row) for row in rows])
            
            logger.info(f"Collected {len(df)} user-month spending patterns")
            logger.info(f"  Unique users: {df['user_id'].nunique()}")
            logger.info(f"  Avg monthly spending: N${df['monthly_spending'].mean():.2f}")
            logger.info(f"  Avg transactions/month: {df['transaction_count'].mean():.1f}")
            
            return df
            
        finally:
            await conn.close()

    async def balance_fraud_dataset(
        self,
        df: pd.DataFrame,
        target_fraud_ratio: float = 0.15
    ) -> pd.DataFrame:
        """
        Balance fraud dataset to avoid extreme class imbalance
        
        Args:
            df: DataFrame with is_fraud column
            target_fraud_ratio: Target ratio of fraud cases (e.g., 0.15 = 15% fraud)
            
        Returns:
            Balanced DataFrame
        """
        if 'is_fraud' not in df.columns:
            return df
        
        # Remove rows with unknown fraud status
        df_clean = df[df['is_fraud'].notna()].copy()
        
        fraud_cases = df_clean[df_clean['is_fraud'] == True]
        legitimate_cases = df_clean[df_clean['is_fraud'] == False]
        
        fraud_count = len(fraud_cases)
        legit_count = len(legitimate_cases)
        
        logger.info(f"Original distribution: {fraud_count} fraud, {legit_count} legitimate")
        
        if fraud_count == 0:
            logger.warning("No fraud cases found - cannot balance dataset")
            return df_clean
        
        # Calculate target counts
        target_legit_count = int(fraud_count * (1 - target_fraud_ratio) / target_fraud_ratio)
        
        if legit_count > target_legit_count:
            # Undersample legitimate cases
            legitimate_cases = legitimate_cases.sample(n=target_legit_count, random_state=42)
            logger.info(f"Undersampled legitimate cases to {target_legit_count}")
        else:
            logger.info(f"No undersampling needed (have {legit_count}, need {target_legit_count})")
        
        # Combine and shuffle
        balanced_df = pd.concat([fraud_cases, legitimate_cases], ignore_index=True)
        balanced_df = balanced_df.sample(frac=1, random_state=42).reset_index(drop=True)
        
        new_fraud_ratio = len(fraud_cases) / len(balanced_df)
        logger.info(f"Balanced distribution: {len(fraud_cases)} fraud, {len(legitimate_cases)} legitimate")
        logger.info(f"Fraud ratio: {new_fraud_ratio:.2%}")
        
        return balanced_df

    async def collect_all_training_data(self) -> Dict[str, pd.DataFrame]:
        """
        Collect all training datasets
        
        Returns:
            Dict with DataFrames for each model type
        """
        logger.info("=" * 80)
        logger.info("Starting production data collection from Neon PostgreSQL")
        logger.info("=" * 80)
        
        datasets = {}
        
        # 1. Fraud detection data
        logger.info("\n[1/3] Collecting fraud detection data...")
        fraud_df = await self.collect_transactions_for_fraud_detection(
            months_back=6,
            target_rows=50000
        )
        
        if not fraud_df.empty:
            fraud_df_balanced = await self.balance_fraud_dataset(fraud_df, target_fraud_ratio=0.15)
            datasets['fraud_detection'] = fraud_df_balanced
            
            # Save to parquet
            fraud_path = self.output_dir / "fraud_detection_production.parquet"
            fraud_df_balanced.to_parquet(fraud_path, index=False)
            logger.info(f"✓ Saved to: {fraud_path}")
        
        # 2. Credit scoring data
        logger.info("\n[2/3] Collecting credit scoring data...")
        credit_df = await self.collect_users_for_credit_scoring(
            min_transactions=5,
            target_rows=10000
        )
        
        if not credit_df.empty:
            datasets['credit_scoring'] = credit_df
            
            # Save to parquet
            credit_path = self.output_dir / "credit_scoring_production.parquet"
            credit_df.to_parquet(credit_path, index=False)
            logger.info(f"✓ Saved to: {credit_path}")
        
        # 3. Spending analysis data
        logger.info("\n[3/3] Collecting spending analysis data...")
        spending_df = await self.collect_spending_patterns(
            min_monthly_transactions=5,
            target_rows=25000
        )
        
        if not spending_df.empty:
            datasets['spending_analysis'] = spending_df
            
            # Save to parquet
            spending_path = self.output_dir / "spending_analysis_production.parquet"
            spending_df.to_parquet(spending_path, index=False)
            logger.info(f"✓ Saved to: {spending_path}")
        
        # Summary
        logger.info("\n" + "=" * 80)
        logger.info("Data collection complete!")
        logger.info("=" * 80)
        for name, df in datasets.items():
            logger.info(f"  {name}: {len(df):,} rows")
        
        return datasets

    async def get_data_summary_stats(self) -> Dict[str, Any]:
        """Get summary statistics from production database"""
        conn = await asyncpg.connect(self.database_url)
        
        try:
            stats = {}
            
            # Transaction stats
            tx_query = """
            SELECT
                COUNT(*) as total_transactions,
                COUNT(DISTINCT source_user_id) as total_users,
                MIN(created_at) as earliest_transaction,
                MAX(created_at) as latest_transaction,
                SUM(amount) as total_volume
            FROM transactions
            WHERE amount > 0
            """
            tx_row = await conn.fetchrow(tx_query)
            stats['transactions'] = dict(tx_row) if tx_row else {}
            
            # Fraud alert stats
            fraud_query = """
            SELECT
                COUNT(*) as total_alerts,
                COUNT(CASE WHEN resolution_category = 'confirmed_fraud' THEN 1 END) as confirmed_fraud,
                COUNT(CASE WHEN resolution_category = 'false_positive' THEN 1 END) as false_positives,
                COUNT(CASE WHEN resolution_category = 'legitimate_activity' THEN 1 END) as legitimate
            FROM transaction_monitoring_alerts
            """
            fraud_row = await conn.fetchrow(fraud_query)
            stats['fraud_alerts'] = dict(fraud_row) if fraud_row else {}
            
            # Loan stats
            loan_query = """
            SELECT
                COUNT(*) as total_loans,
                COUNT(DISTINCT user_id) as total_borrowers,
                SUM(CASE WHEN status = 'repaid' THEN 1 ELSE 0 END) as loans_repaid,
                SUM(CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END) as loans_defaulted
            FROM loans
            """
            loan_row = await conn.fetchrow(loan_query)
            stats['loans'] = dict(loan_row) if loan_row else {}
            
            return stats
            
        finally:
            await conn.close()


async def main():
    """Main execution"""
    collector = ProductionDataCollector()
    
    # Show database summary
    logger.info("Checking production database...")
    stats = await collector.get_data_summary_stats()
    
    logger.info("\nProduction Database Summary:")
    logger.info(f"  Transactions: {stats.get('transactions', {}).get('total_transactions', 0):,}")
    logger.info(f"  Users: {stats.get('transactions', {}).get('total_users', 0):,}")
    logger.info(f"  Fraud alerts: {stats.get('fraud_alerts', {}).get('total_alerts', 0):,}")
    logger.info(f"  Confirmed fraud: {stats.get('fraud_alerts', {}).get('confirmed_fraud', 0):,}")
    logger.info(f"  Total loans: {stats.get('loans', {}).get('total_loans', 0):,}")
    
    # Collect training data
    datasets = await collector.collect_all_training_data()
    
    logger.info("\n✅ Production data collection complete!")
    logger.info(f"Output directory: {collector.output_dir}")


if __name__ == "__main__":
    asyncio.run(main())
