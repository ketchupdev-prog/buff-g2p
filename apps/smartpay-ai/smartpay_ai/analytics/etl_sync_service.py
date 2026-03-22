"""
ETL Sync Service with Data Quality Checks

Location: smartpay_ai/analytics/etl_sync_service.py
Purpose: Automated hourly sync from PostgreSQL → DuckDB with quality validation
Features:
  - Incremental sync with last_sync_timestamp tracking
  - Data quality checks (row count, date range validation)
  - Sync failure alerts
  - Performance monitoring
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

import asyncpg
import duckdb
from pathlib import Path

from .etl_pipeline import ETLPipeline
from .duckdb_manager import DuckDBManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataQualityChecker:
    """Validate data quality after ETL sync"""

    def __init__(self, pg_conn_string: str, duckdb_conn: duckdb.DuckDBPyConnection):
        self.pg_conn_string = pg_conn_string
        self.duckdb_conn = duckdb_conn

    async def check_row_count_parity(
        self,
        table_name: str,
        tolerance_percent: float = 5.0
    ) -> Dict[str, Any]:
        """
        Validate row counts between PostgreSQL and DuckDB
        
        Args:
            table_name: Table to check
            tolerance_percent: Acceptable difference percentage
            
        Returns:
            Validation result
        """
        logger.info(f"Checking row count parity for {table_name}...")
        
        # Get PostgreSQL count
        pg_conn = await asyncpg.connect(self.pg_conn_string)
        try:
            pg_count = await pg_conn.fetchval(f"SELECT COUNT(*) FROM {table_name}")
        finally:
            await pg_conn.close()
        
        # Get DuckDB count
        duck_count = self.duckdb_conn.execute(
            f"SELECT COUNT(*) FROM {table_name}"
        ).fetchone()[0]
        
        # Calculate difference
        diff = abs(pg_count - duck_count)
        diff_percent = (diff / pg_count * 100) if pg_count > 0 else 0
        
        passed = diff_percent <= tolerance_percent
        
        result = {
            'table': table_name,
            'check': 'row_count_parity',
            'passed': passed,
            'pg_count': pg_count,
            'duck_count': duck_count,
            'difference': diff,
            'difference_percent': round(diff_percent, 2),
            'tolerance_percent': tolerance_percent,
        }
        
        if passed:
            logger.info(f"  ✓ Row count parity OK: PG={pg_count}, Duck={duck_count} (diff={diff_percent:.2f}%)")
        else:
            logger.warning(f"  ✗ Row count mismatch: PG={pg_count}, Duck={duck_count} (diff={diff_percent:.2f}%)")
        
        return result

    async def check_date_range_coverage(
        self,
        table_name: str,
        date_column: str = "created_at",
        max_gap_hours: int = 48
    ) -> Dict[str, Any]:
        """
        Check for gaps in date coverage
        
        Args:
            table_name: Table to check
            date_column: Date column name
            max_gap_hours: Maximum acceptable gap in hours
            
        Returns:
            Validation result
        """
        logger.info(f"Checking date range coverage for {table_name}...")
        
        # Get date range from DuckDB
        query = f"""
        SELECT 
            MIN({date_column}) as min_date,
            MAX({date_column}) as max_date,
            COUNT(*) as total_rows
        FROM {table_name}
        WHERE {date_column} IS NOT NULL
        """
        
        result_row = self.duckdb_conn.execute(query).fetchone()
        
        if not result_row or result_row[0] is None:
            return {
                'table': table_name,
                'check': 'date_range_coverage',
                'passed': False,
                'error': 'No date data found',
            }
        
        min_date, max_date, total_rows = result_row
        
        # Check if data is recent (within max_gap_hours of now)
        now = datetime.now()
        gap_hours = (now - max_date).total_seconds() / 3600
        
        passed = gap_hours <= max_gap_hours
        
        result = {
            'table': table_name,
            'check': 'date_range_coverage',
            'passed': passed,
            'min_date': min_date.isoformat() if hasattr(min_date, 'isoformat') else str(min_date),
            'max_date': max_date.isoformat() if hasattr(max_date, 'isoformat') else str(max_date),
            'gap_hours': round(gap_hours, 2),
            'max_gap_hours': max_gap_hours,
            'total_rows': total_rows,
        }
        
        if passed:
            logger.info(f"  ✓ Date coverage OK: {min_date} to {max_date} (gap={gap_hours:.1f}h)")
        else:
            logger.warning(f"  ✗ Data gap detected: Last data {gap_hours:.1f}h old (max={max_gap_hours}h)")
        
        return result

    async def check_null_percentages(
        self,
        table_name: str,
        critical_columns: List[str],
        max_null_percent: float = 10.0
    ) -> Dict[str, Any]:
        """
        Check null percentages in critical columns
        
        Args:
            table_name: Table to check
            critical_columns: Columns that should have minimal nulls
            max_null_percent: Maximum acceptable null percentage
            
        Returns:
            Validation result
        """
        logger.info(f"Checking null percentages for {table_name}...")
        
        # Get total rows
        total_rows = self.duckdb_conn.execute(
            f"SELECT COUNT(*) FROM {table_name}"
        ).fetchone()[0]
        
        if total_rows == 0:
            return {
                'table': table_name,
                'check': 'null_percentages',
                'passed': False,
                'error': 'Table is empty',
            }
        
        column_results = {}
        all_passed = True
        
        for column in critical_columns:
            null_count = self.duckdb_conn.execute(
                f"SELECT COUNT(*) FROM {table_name} WHERE {column} IS NULL"
            ).fetchone()[0]
            
            null_percent = (null_count / total_rows * 100)
            passed = null_percent <= max_null_percent
            
            column_results[column] = {
                'null_count': null_count,
                'null_percent': round(null_percent, 2),
                'passed': passed,
            }
            
            if not passed:
                all_passed = False
                logger.warning(f"  ✗ High null rate in {column}: {null_percent:.2f}%")
            else:
                logger.info(f"  ✓ {column}: {null_percent:.2f}% nulls")
        
        return {
            'table': table_name,
            'check': 'null_percentages',
            'passed': all_passed,
            'total_rows': total_rows,
            'columns': column_results,
            'max_null_percent': max_null_percent,
        }

    async def run_all_checks(
        self,
        table_configs: Dict[str, Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Run all data quality checks
        
        Args:
            table_configs: Dict of table_name -> config with check parameters
            
        Returns:
            All check results
        """
        logger.info("\n" + "=" * 80)
        logger.info("Running Data Quality Checks")
        logger.info("=" * 80)
        
        all_results = {}
        
        for table_name, config in table_configs.items():
            logger.info(f"\nChecking table: {table_name}")
            
            table_results = []
            
            # Row count check
            if config.get('check_row_count', True):
                result = await self.check_row_count_parity(
                    table_name,
                    tolerance_percent=config.get('row_count_tolerance', 5.0)
                )
                table_results.append(result)
            
            # Date range check
            if config.get('check_date_range', True):
                result = await self.check_date_range_coverage(
                    table_name,
                    date_column=config.get('date_column', 'created_at'),
                    max_gap_hours=config.get('max_gap_hours', 48)
                )
                table_results.append(result)
            
            # Null checks
            if config.get('critical_columns'):
                result = await self.check_null_percentages(
                    table_name,
                    critical_columns=config['critical_columns'],
                    max_null_percent=config.get('max_null_percent', 10.0)
                )
                table_results.append(result)
            
            all_results[table_name] = table_results
        
        # Summary
        total_checks = sum(len(results) for results in all_results.values())
        passed_checks = sum(
            1 for results in all_results.values()
            for result in results
            if result.get('passed', False)
        )
        
        logger.info("\n" + "=" * 80)
        logger.info(f"Quality Checks Complete: {passed_checks}/{total_checks} passed")
        logger.info("=" * 80)
        
        return all_results


class ETLSyncService:
    """
    Automated ETL sync service with data quality validation
    
    Runs incremental syncs on schedule and validates data quality
    """

    def __init__(
        self,
        pg_conn_string: str,
        duckdb_path: Optional[str] = None
    ):
        """
        Initialize ETL sync service
        
        Args:
            pg_conn_string: PostgreSQL connection string
            duckdb_path: Path to DuckDB database
        """
        self.pg_conn_string = pg_conn_string
        
        if duckdb_path is None:
            project_root = Path(__file__).parent.parent.parent
            duckdb_path = str(project_root / "data" / "analytics.duckdb")
        
        self.duckdb_path = duckdb_path
        self.duckdb_manager = DuckDBManager(duckdb_path)
        self.etl_pipeline = ETLPipeline(pg_conn_string, self.duckdb_manager)
        
        logger.info(f"ETL Sync Service initialized")
        logger.info(f"  PostgreSQL: {pg_conn_string[:50]}...")
        logger.info(f"  DuckDB: {duckdb_path}")

    async def sync_with_quality_checks(
        self,
        sync_type: str = "incremental",
        days_back: int = 1
    ) -> Dict[str, Any]:
        """
        Run ETL sync with data quality validation
        
        Args:
            sync_type: 'full' or 'incremental'
            days_back: Days to look back for incremental sync
            
        Returns:
            Sync results with quality check results
        """
        logger.info("\n" + "=" * 80)
        logger.info(f"Starting ETL Sync: {sync_type}")
        logger.info("=" * 80)
        
        start_time = datetime.now()
        
        # Run ETL sync
        if sync_type == "full":
            sync_results = await self.etl_pipeline.full_sync()
        else:
            sync_results = await self.etl_pipeline.incremental_sync(days_back=days_back)
        
        # Check if sync succeeded
        success_count = sync_results.get('success_count', 0)
        total_tables = sync_results.get('total_tables', 0)
        
        if success_count < total_tables:
            logger.warning(f"⚠ Partial sync failure: {success_count}/{total_tables} succeeded")
            return {
                **sync_results,
                'quality_checks': None,
                'quality_checks_status': 'skipped_due_to_sync_failure'
            }
        
        # Run data quality checks
        logger.info("\nRunning data quality checks...")
        
        table_configs = {
            'transactions': {
                'check_row_count': True,
                'row_count_tolerance': 5.0,
                'check_date_range': True,
                'date_column': 'timestamp',
                'max_gap_hours': 24,
                'critical_columns': ['user_id', 'amount', 'timestamp'],
                'max_null_percent': 5.0,
            },
            'fraud_events': {
                'check_row_count': True,
                'row_count_tolerance': 10.0,
                'check_date_range': True,
                'date_column': 'timestamp',
                'max_gap_hours': 48,
                'critical_columns': ['transaction_id', 'is_fraud'],
                'max_null_percent': 10.0,
            },
            'groups': {
                'check_row_count': True,
                'row_count_tolerance': 5.0,
                'check_date_range': True,
                'date_column': 'created_at',
                'max_gap_hours': 168,  # 1 week
                'critical_columns': ['name', 'created_by'],
                'max_null_percent': 5.0,
            },
        }
        
        quality_checker = DataQualityChecker(
            self.pg_conn_string,
            self.duckdb_manager.conn
        )
        
        quality_results = await quality_checker.run_all_checks(table_configs)
        
        # Calculate quality score
        total_quality_checks = sum(len(results) for results in quality_results.values())
        passed_quality_checks = sum(
            1 for results in quality_results.values()
            for result in results
            if result.get('passed', False)
        )
        
        quality_score = (passed_quality_checks / total_quality_checks * 100) if total_quality_checks > 0 else 0
        
        duration = (datetime.now() - start_time).total_seconds()
        
        final_results = {
            **sync_results,
            'quality_checks': quality_results,
            'quality_checks_passed': passed_quality_checks,
            'quality_checks_total': total_quality_checks,
            'quality_score': round(quality_score, 2),
            'total_duration_seconds': round(duration, 2),
        }
        
        # Alert on quality issues
        if quality_score < 90:
            logger.warning(f"⚠ Data quality below 90%: {quality_score:.1f}%")
            self._send_quality_alert(final_results)
        else:
            logger.info(f"✓ Data quality: {quality_score:.1f}%")
        
        return final_results

    def _send_quality_alert(self, results: Dict[str, Any]):
        """
        Send alert on data quality issues
        
        Args:
            results: Sync and quality check results
        """
        logger.error("\n" + "!" * 80)
        logger.error("DATA QUALITY ALERT")
        logger.error("!" * 80)
        
        quality_score = results.get('quality_score', 0)
        logger.error(f"Quality Score: {quality_score:.1f}% (threshold: 90%)")
        
        # List failed checks
        logger.error("\nFailed checks:")
        for table_name, checks in results.get('quality_checks', {}).items():
            for check in checks:
                if not check.get('passed', False):
                    check_type = check.get('check', 'unknown')
                    logger.error(f"  - {table_name}.{check_type}: {check}")
        
        logger.error("!" * 80)
        
        # In production, send email/Slack notification here

    async def run_hourly_sync(self):
        """Run hourly incremental sync (to be called by cron)"""
        return await self.sync_with_quality_checks(
            sync_type="incremental",
            days_back=1
        )

    async def run_daily_sync(self):
        """Run daily full sync (to be called by cron)"""
        return await self.sync_with_quality_checks(
            sync_type="full"
        )

    def close(self):
        """Close connections"""
        self.duckdb_manager.close()


async def main():
    """Example usage"""
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    pg_conn_string = os.getenv("DATABASE_URL")
    if not pg_conn_string:
        logger.error("DATABASE_URL not set")
        return
    
    service = ETLSyncService(pg_conn_string)
    
    try:
        # Run incremental sync with quality checks
        results = await service.run_hourly_sync()
        
        logger.info("\n" + "=" * 80)
        logger.info("SYNC COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Sync type: {results.get('sync_type')}")
        logger.info(f"Tables synced: {results.get('success_count')}/{results.get('total_tables')}")
        logger.info(f"Quality score: {results.get('quality_score')}%")
        logger.info(f"Duration: {results.get('total_duration_seconds')}s")
        
    finally:
        service.close()


if __name__ == "__main__":
    asyncio.run(main())
