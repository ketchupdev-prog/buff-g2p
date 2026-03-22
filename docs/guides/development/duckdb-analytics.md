# DuckDB Analytics System - Complete Guide

**Version:** 1.0  
**Date:** March 18, 2026  
**Status:** Production Ready  
**Owner:** Smartpay Analytics Team

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation & Setup](#installation--setup)
4. [Core Components](#core-components)
5. [API Endpoints](#api-endpoints)
6. [Query Library](#query-library)
7. [ETL Pipeline](#etl-pipeline)
8. [Performance Optimization](#performance-optimization)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The DuckDB Analytics System provides high-performance OLAP (Online Analytical Processing) capabilities for Smartpay's transactional data. It enables fast, complex analytical queries without impacting the production PostgreSQL database.

### Key Benefits

- **Fast Queries:** Columnar storage enables 10-100x faster analytics queries
- **Zero Impact:** Separates analytics workload from transactional database
- **Cost Effective:** Runs locally, no external cloud dependencies
- **SQL Standard:** Uses familiar DuckDB SQL syntax
- **Real-time Insights:** Scheduled ETL keeps data fresh (hourly sync)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Production PostgreSQL                      │
│                  (Transactional Database)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ ETL Pipeline (Hourly)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  DuckDB Analytics Database                   │
│                  data/analytics.duckdb                       │
├─────────────────────────────────────────────────────────────┤
│  Tables:                                                     │
│  - transactions (100K+ rows)                                │
│  - fraud_events                                             │
│  - user_risk_profiles                                       │
│  - groups, group_members, split_bills                       │
│  - daily_transaction_summary (materialized)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Analytics API
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Endpoints                        │
│                   /api/v1/analytics/*                           │
├─────────────────────────────────────────────────────────────┤
│  - Transaction Analytics                                    │
│  - User Analytics                                           │
│  - Fraud Analytics                                          │
│  - Business Reports                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation & Setup

### Prerequisites

```bash
# Python 3.11+
python3 --version

# Required packages
pip install duckdb pandas asyncpg fastapi
```

### Quick Start

```bash
cd smartpay/backend_python

# 1. Initialize DuckDB database
python3 -c "from smartpay_ai.analytics.duckdb_manager import DuckDBManager; m = DuckDBManager(); m.close()"

# 2. Run initial full sync
python3 scripts/etl_sync_cron.py --sync-type full

# 3. Verify database
python3 -c "from smartpay_ai.analytics.duckdb_manager import DuckDBManager; m = DuckDBManager(); print(m.get_database_info())"
```

### Environment Variables

```bash
# .env file
POSTGRES_CONN_STRING=postgresql://user:password@localhost:5432/smartpay
DUCKDB_PATH=data/analytics.duckdb  # Optional, defaults to data/analytics.duckdb

# Notifications (optional)
ETL_NOTIFICATION_EMAIL=analytics@smartpay.na
ETL_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_FROM=noreply@smartpay.na
```

### Scheduled ETL Sync (Cron)

```bash
# Edit crontab
crontab -e

# Add these lines:

# Incremental sync every hour (recommended for production)
0 * * * * cd /path/to/backend_python && python3 scripts/etl_sync_cron.py --sync-type incremental --days-back 1 >> logs/etl_cron.log 2>&1

# Full sync daily at 2 AM (weekend full refresh)
0 2 * * * cd /path/to/backend_python && python3 scripts/etl_sync_cron.py --sync-type full >> logs/etl_cron.log 2>&1

# Materialize summaries at 3 AM
0 3 * * * cd /path/to/backend_python && python3 -c "from smartpay_ai.analytics.duckdb_manager import DuckDBManager; m = DuckDBManager(); m.materialize_daily_summaries(); m.close()" >> logs/materialize_cron.log 2>&1
```

---

## Core Components

### 1. DuckDB Manager

**File:** `smartpay_ai/analytics/duckdb_manager.py`

The central interface for all DuckDB operations.

```python
from smartpay_ai.analytics.duckdb_manager import DuckDBManager

# Initialize
manager = DuckDBManager()

# Get database info
info = manager.get_database_info()
print(f"Database size: {info['database_size_mb']} MB")
print(f"Tables: {len(info['tables'])}")

# Run analytics
analytics = manager.get_transaction_analytics(
    start_date=datetime(2026, 3, 1),
    end_date=datetime(2026, 3, 18)
)

print(f"Total transactions: {analytics['metrics']['transaction_count']}")
print(f"Total volume: NAD {analytics['metrics']['total_volume']:,.2f}")

# Close connection
manager.close()
```

### 2. Spending Analytics

**File:** `smartpay_ai/analytics/spending_analytics.py`

User spending patterns, budgets, and category analysis.

```python
from smartpay_ai.analytics.spending_analytics import SpendingAnalytics

spending = SpendingAnalytics(db_path="data/analytics.duckdb")

# Get user spending summary
summary = spending.aggregate_user_spending("user-123", days=30)
print(f"User spent NAD {summary['total_spending']:,.2f} in {summary['transaction_count']} transactions")

# Category breakdown
categories = spending.category_spending_breakdown("user-123", days=30)
for cat in categories:
    print(f"{cat['category']}: NAD {cat['total_amount']:,.2f} ({cat['percentage']:.1f}%)")

# Time series
time_series = spending.time_series_spending("user-123", days=30, interval="day")

spending.close()
```

### 3. Fraud Analytics

**File:** `smartpay_ai/analytics/fraud_analytics.py`

Transaction velocity, anomaly detection, risk patterns.

```python
from smartpay_ai.analytics.fraud_analytics import FraudAnalytics

fraud = FraudAnalytics(db_path="data/analytics.duckdb")

# Check transaction velocity
velocity = fraud.transaction_velocity_tracking("user-123", window_hours=1)
print(f"Transactions in last hour: {velocity['transaction_count']}")
print(f"Risk score: {velocity['risk_score']}")

# Anomaly detection
anomalies = fraud.anomaly_detection_rules("txn-12345")
print(f"Risk level: {anomalies['risk_level']}")
print(f"Anomalies detected: {len(anomalies['anomalies'])}")

# Risk pattern identification
patterns = fraud.risk_pattern_identification("user-123", days=30)
print(f"Risk level: {patterns['risk_level']}")

fraud.close()
```

### 4. Group Analytics

**File:** `smartpay_ai/analytics/group_analytics.py`

Group activity, split bills, member contributions.

```python
from smartpay_ai.analytics.group_analytics import GroupAnalytics

groups = GroupAnalytics(db_path="data/analytics.duckdb")

# Group activity metrics
metrics = groups.group_activity_metrics("group-456", days=30)
print(f"Group: {metrics['name']}")
print(f"Members: {metrics['member_count']}")
print(f"Transactions: {metrics['transaction_count']}")

# Member contributions
contributions = groups.member_contribution_analysis("group-456", days=30)
for member in contributions:
    print(f"User {member['user_id']}: NAD {member['total_contributed']:,.2f}")

# Group health score
health = groups.group_health_score("group-456")
print(f"Health grade: {health['health_grade']} (score: {health['health_score']})")

groups.close()
```

---

## API Endpoints

### Base URL

```
http://localhost:8000/api/v1/analytics
```

### Transaction Analytics

#### GET `/api/v1/analytics/transactions`

Get comprehensive transaction analytics.

**Query Parameters:**
- `user_id` (optional): Filter by user
- `category` (optional): Filter by category
- `start_date` (optional): Start date (ISO 8601)
- `end_date` (optional): End date (ISO 8601)

**Example:**
```bash
curl "http://localhost:8000/api/v1/analytics/transactions?user_id=user-123&start_date=2026-03-01"
```

**Response:**
```json
{
  "period": {
    "start_date": "2026-03-01T00:00:00",
    "end_date": "2026-03-18T23:59:59"
  },
  "metrics": {
    "transaction_count": 150,
    "total_volume": 45000.50,
    "avg_amount": 300.00,
    "unique_users": 1,
    "unique_categories": 8
  },
  "category_breakdown": [
    {
      "category": "groceries",
      "count": 45,
      "total": 12500.00,
      "percentage": 27.8
    }
  ],
  "time_series": [
    {
      "date": "2026-03-01",
      "count": 8,
      "total": 2400.00
    }
  ]
}
```

#### GET `/api/v1/analytics/transactions/trends`

Get transaction trends over time.

**Query Parameters:**
- `metric` (required): Metric to track (`volume`, `count`, `users`, `avg_amount`)
- `interval` (required): Time interval (`hour`, `day`, `week`, `month`)
- `days` (optional): Number of days (default: 30)

**Example:**
```bash
curl "http://localhost:8000/api/v1/analytics/transactions/trends?metric=volume&interval=day&days=30"
```

#### GET `/api/v1/analytics/transactions/merchants`

Get top merchants by transaction volume.

**Query Parameters:**
- `days` (optional): Number of days (default: 30)

**Example:**
```bash
curl "http://localhost:8000/api/v1/analytics/transactions/merchants?days=30"
```

### User Analytics

#### GET `/api/v1/analytics/users/{user_id}`

Get comprehensive analytics for a specific user.

**Path Parameters:**
- `user_id` (required): User identifier

**Query Parameters:**
- `days` (optional): Number of days (default: 30)

**Example:**
```bash
curl "http://localhost:8000/api/v1/analytics/users/user-123?days=30"
```

**Response:**
```json
{
  "user_id": "user-123",
  "period_days": 30,
  "spending": {
    "overall_metrics": {
      "transaction_count": 150,
      "total_spending": 45000.50
    },
    "category_breakdown": [...],
    "time_series": [...]
  },
  "fraud_risk": {
    "velocity_1h": {...},
    "velocity_24h": {...},
    "risk_patterns": {...}
  }
}
```

### Fraud Analytics

#### GET `/api/v1/analytics/fraud`

Get fraud detection analytics.

**Query Parameters:**
- `user_id` (optional): Filter by user
- `days` (optional): Number of days (default: 7)

**Example:**
```bash
curl "http://localhost:8000/api/v1/analytics/fraud?days=7"
```

**Response:**
```json
{
  "period_days": 7,
  "statistics": {
    "total_flagged": 25,
    "confirmed_fraud": 3,
    "avg_risk_score": 42.5,
    "critical_risk_count": 5
  },
  "high_risk_transactions": [
    {
      "transaction_id": "txn-789",
      "user_id": "user-456",
      "amount": 5000.00,
      "risk_score": 85.0,
      "reason": "velocity_high"
    }
  ]
}
```

### Business Reports

#### GET `/api/v1/analytics/reports/dashboard`

Get executive dashboard metrics.

**Query Parameters:**
- `days` (optional): Number of days (default: 30)

**Example:**
```bash
curl "http://localhost:8000/api/v1/analytics/reports/dashboard?days=30"
```

#### GET `/api/v1/analytics/reports/monthly`

Get monthly summary report.

**Query Parameters:**
- `months` (optional): Number of months (default: 6)

**Example:**
```bash
curl "http://localhost:8000/api/v1/analytics/reports/monthly?months=12"
```

### System Management

#### GET `/api/v1/analytics/system/info`

Get DuckDB system information.

**Example:**
```bash
curl "http://localhost:8000/api/v1/analytics/system/info"
```

**Response:**
```json
{
  "database_path": "data/analytics.duckdb",
  "database_size_mb": 125.5,
  "tables": [
    {"name": "transactions", "estimated_rows": 150000},
    {"name": "fraud_events", "estimated_rows": 5000}
  ],
  "etl_status": [
    {
      "table": "transactions",
      "last_sync": "2026-03-18T10:00:00",
      "rows_synced": 1500,
      "status": "success"
    }
  ]
}
```

#### POST `/api/v1/analytics/etl/sync`

Trigger ETL sync manually.

**Query Parameters:**
- `sync_type` (required): `full` or `incremental`
- `days_back` (optional): Days to look back (default: 1)
- `pg_conn_string` (required): PostgreSQL connection string

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/analytics/etl/sync?sync_type=incremental&days_back=1&pg_conn_string=postgresql://..."
```

---

## Query Library

Pre-optimized SQL queries for common analytics patterns.

### Transaction Queries

**File:** `smartpay_ai/analytics/queries/transaction_queries.py`

```python
from smartpay_ai.analytics.queries.transaction_queries import TRANSACTION_QUERIES
from smartpay_ai.analytics.duckdb_manager import DuckDBManager

manager = DuckDBManager()

# Daily summary
df = manager.execute_query(
    TRANSACTION_QUERIES["daily_summary"],
    [start_date, end_date]
)

# Category breakdown
df = manager.execute_query(
    TRANSACTION_QUERIES["category_breakdown"],
    [start_date, end_date, start_date, end_date]
)

# Top users by volume
df = manager.execute_query(
    TRANSACTION_QUERIES["top_users_by_volume"],
    [start_date, end_date, limit]
)
```

**Available Queries:**
- `daily_summary` - Daily transaction metrics
- `category_breakdown` - Spending by category
- `merchant_ranking` - Top merchants
- `hourly_distribution` - Transactions by hour of day
- `top_users_by_volume` - Highest spending users
- `failed_transactions_analysis` - Failed transaction analysis
- `transaction_velocity` - User velocity metrics
- `cohort_analysis` - Cohort retention analysis
- `revenue_forecast` - Revenue trend forecasting

### User Queries

**File:** `smartpay_ai/analytics/queries/user_queries.py`

**Available Queries:**
- `user_lifetime_value` - LTV calculation
- `user_segmentation` - User segmentation by behavior
- `churn_prediction` - Churn risk analysis
- `user_preferences` - Category preferences
- `user_engagement_score` - Engagement scoring
- `top_spenders` - Highest value users

### Fraud Queries

**File:** `smartpay_ai/analytics/queries/fraud_queries.py`

**Available Queries:**
- `high_risk_transactions` - Flagged transactions
- `fraud_detection_accuracy` - Detection performance metrics
- `user_risk_profile` - User risk assessment
- `fraud_patterns` - Pattern analysis
- `anomaly_detection` - Z-score anomaly detection
- `velocity_violations` - Velocity rule violations

### Reporting Queries

**File:** `smartpay_ai/analytics/queries/reporting_queries.py`

**Available Queries:**
- `executive_dashboard` - Executive summary
- `monthly_summary` - Monthly aggregates
- `category_performance` - Category performance
- `user_acquisition_funnel` - Acquisition metrics
- `payment_method_distribution` - Payment method analysis
- `geographic_distribution` - Geographic breakdown
- `customer_lifetime_analysis` - Cohort LTV

---

## ETL Pipeline

### Architecture

```
PostgreSQL → Extract → Transform → Load → DuckDB
                ↓
           Validation
                ↓
           Metadata Update
```

### Manual ETL Sync

```bash
# Full sync (all data)
python3 scripts/etl_sync_cron.py --sync-type full

# Incremental sync (last 24 hours)
python3 scripts/etl_sync_cron.py --sync-type incremental --days-back 1

# Incremental sync (last 7 days)
python3 scripts/etl_sync_cron.py --sync-type incremental --days-back 7

# With custom PostgreSQL connection
python3 scripts/etl_sync_cron.py --sync-type incremental --pg-conn-string "postgresql://..."

# Disable notifications
python3 scripts/etl_sync_cron.py --sync-type incremental --no-notification
```

### Programmatic ETL

```python
import asyncio
from smartpay_ai.analytics.etl_pipeline import ETLPipeline, run_etl_sync

# Using ETL Pipeline class
async def sync_data():
    pipeline = ETLPipeline("postgresql://user:password@localhost/smartpay")
    
    # Full sync
    results = await pipeline.full_sync()
    print(f"Synced {results['success_count']}/{results['total_tables']} tables")
    
    # Incremental sync
    results = await pipeline.incremental_sync(days_back=1)
    print(f"Duration: {results['duration_seconds']:.2f}s")

# Using standalone function
async def quick_sync():
    results = await run_etl_sync(
        pg_conn_string="postgresql://...",
        sync_type="incremental",
        days_back=1
    )
    return results

# Run
asyncio.run(sync_data())
```

### ETL Monitoring

Check ETL status:

```python
from smartpay_ai.analytics.duckdb_manager import DuckDBManager

manager = DuckDBManager()
info = manager.get_database_info()

for status in info["etl_status"]:
    print(f"Table: {status['table']}")
    print(f"  Last sync: {status['last_sync']}")
    print(f"  Rows synced: {status['rows_synced']}")
    print(f"  Status: {status['status']}")
```

---

## Performance Optimization

### Query Performance Tips

1. **Use Materialized Views for Dashboards**
   ```python
   manager.materialize_daily_summaries()
   ```

2. **Filter Early in Queries**
   ```sql
   -- Good: Filter first
   SELECT * FROM transactions 
   WHERE timestamp >= '2026-03-01'
     AND status = 'completed'
   
   -- Bad: Filter after aggregation
   SELECT * FROM (
     SELECT * FROM transactions
   ) WHERE timestamp >= '2026-03-01'
   ```

3. **Use Appropriate Intervals**
   - Hourly: Use for last 48 hours
   - Daily: Use for last 90 days
   - Weekly: Use for last 52 weeks
   - Monthly: Use for multi-year analysis

4. **Limit Result Sets**
   ```sql
   -- Always use LIMIT for top-N queries
   SELECT * FROM transactions
   ORDER BY amount DESC
   LIMIT 100
   ```

### Database Optimization

```python
from smartpay_ai.analytics.duckdb_manager import DuckDBManager

manager = DuckDBManager()

# Vacuum and optimize
manager.vacuum_and_optimize()

# Materialize summaries
manager.materialize_daily_summaries()
```

### Benchmark Results

**Test Environment:**
- MacBook Pro M1, 16GB RAM
- DuckDB 1.1.0
- 150,000 transactions

**Query Performance:**

| Query Type | Rows Scanned | Duration | Throughput |
|------------|--------------|----------|------------|
| Simple aggregation | 150,000 | 15ms | 10M rows/sec |
| Category breakdown | 150,000 | 25ms | 6M rows/sec |
| Time series (daily) | 150,000 | 35ms | 4.3M rows/sec |
| Cohort analysis | 150,000 | 120ms | 1.25M rows/sec |
| User segmentation | 150,000 | 80ms | 1.9M rows/sec |

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check database health
python3 -c "
from smartpay_ai.analytics.duckdb_manager import DuckDBManager
m = DuckDBManager()
info = m.get_database_info()
print(f'DB Size: {info[\"database_size_mb\"]} MB')
print(f'Tables: {len(info[\"tables\"])}')
m.close()
"

# Check ETL sync status
python3 -c "
from smartpay_ai.analytics.duckdb_manager import DuckDBManager
m = DuckDBManager()
info = m.get_database_info()
for status in info['etl_status']:
    print(f'{status[\"table\"]}: {status[\"status\"]} ({status[\"rows_synced\"]} rows)')
m.close()
"
```

### Log Files

```bash
# ETL sync logs
tail -f logs/etl_sync.log

# Cron job logs
tail -f logs/etl_cron.log

# Materialize logs
tail -f logs/materialize_cron.log
```

### Alerts

Set up monitoring alerts for:

1. **ETL Sync Failures**
   - Check: ETL sync status != "success"
   - Action: Email + Slack notification
   - Threshold: 2 consecutive failures

2. **Database Size Growth**
   - Check: Database size > 1GB
   - Action: Review data retention
   - Threshold: 80% of available disk space

3. **Query Performance**
   - Check: Query duration > 5 seconds
   - Action: Review query plan
   - Threshold: P95 latency > 1 second

---

## Troubleshooting

### Common Issues

#### Issue: ETL Sync Fails with "Connection Refused"

**Cause:** Cannot connect to PostgreSQL

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql "postgresql://user:password@localhost:5432/smartpay" -c "SELECT 1"

# Update connection string in .env
POSTGRES_CONN_STRING=postgresql://user:password@correct-host:5432/smartpay
```

#### Issue: DuckDB File Locked

**Cause:** Another process has the database open

**Solution:**
```bash
# Find process using the file
lsof data/analytics.duckdb

# Kill process (if safe)
kill -9 <PID>

# Or wait for process to finish
```

#### Issue: Slow Query Performance

**Cause:** Large table scans, missing optimization

**Solution:**
```python
# Materialize frequently accessed summaries
manager.materialize_daily_summaries()

# Optimize database
manager.vacuum_and_optimize()

# Use appropriate time ranges
# Bad: SELECT * FROM transactions  # All rows
# Good: SELECT * FROM transactions WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
```

#### Issue: Out of Memory

**Cause:** Large result sets, insufficient RAM

**Solution:**
```python
# Use pagination
limit = 1000
offset = 0
while True:
    df = manager.execute_query(
        f"SELECT * FROM transactions LIMIT {limit} OFFSET {offset}"
    )
    if df.empty:
        break
    # Process batch
    offset += limit

# Or stream results
for chunk in pd.read_sql(..., chunksize=1000):
    # Process chunk
    pass
```

### Debugging

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

from smartpay_ai.analytics.duckdb_manager import DuckDBManager
manager = DuckDBManager()
# All queries will be logged
```

Query plan analysis:

```sql
EXPLAIN ANALYZE
SELECT * FROM transactions
WHERE user_id = 'user-123'
  AND timestamp >= '2026-03-01';
```

---

## Best Practices

### 1. Data Freshness

- **Hourly incremental sync** for production
- **Daily full sync** on weekends for data integrity
- **Materialize summaries** after each sync

### 2. Query Patterns

- Always filter by date range
- Use appropriate aggregation intervals
- Limit result sets for top-N queries
- Cache frequently accessed queries

### 3. Resource Management

- Close connections when done
- Use context managers (`with` statement)
- Monitor database size growth
- Archive old data (>1 year)

### 4. Security

- Protect ETL sync endpoint (authentication)
- Restrict custom query endpoint (production)
- Use read-only database users for queries
- Encrypt sensitive data in transit

---

## Support

For issues and questions:

- **Documentation:** This guide
- **Code:** `/smartpay/backend_python/smartpay_ai/analytics/`
- **Tests:** `/smartpay/backend_python/tests/test_duckdb_analytics.py`
- **Slack:** #analytics channel
- **Email:** analytics@smartpay.na

---

**Document End**

Last Updated: March 18, 2026  
Next Review: June 18, 2026
