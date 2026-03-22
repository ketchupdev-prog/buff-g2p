#!/usr/bin/env python3
"""
Populate DuckDB with Test Data for Analytics Tests

Location: backend_python/scripts/populate_test_data.py
Purpose: Generate and insert realistic test data for analytics testing
Usage: python3 scripts/populate_test_data.py [--count COUNT]
"""

import sys
import random
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import duckdb
import pandas as pd
from smartpay_ai.analytics.duckdb_manager import DuckDBManager


def generate_sample_transactions(count: int = 150) -> pd.DataFrame:
    """
    Generate realistic sample transactions
    
    Args:
        count: Number of transactions to generate
        
    Returns:
        DataFrame with transaction data
    """
    base_time = datetime.now() - timedelta(days=30)
    
    # Categories with typical price ranges
    categories = {
        "groceries": (50, 800),
        "transport": (20, 300),
        "entertainment": (100, 1500),
        "bills": (200, 2000),
        "dining": (80, 600),
        "shopping": (150, 5000),
        "healthcare": (200, 3000),
        "education": (500, 10000),
        "fuel": (300, 1200),
        "utilities": (400, 1500)
    }
    
    merchants = [
        "Shoprite", "Pick n Pay", "Woermann Brock", "Spar",
        "Engen", "Shell", "Puma Energy", "Total",
        "KFC", "Nandos", "Hungry Lion", "Ocean Basket",
        "Edgars", "Jet", "Mr Price", "Clicks",
        "NamPower", "City of Windhoek", "MTC", "TN Mobile",
        "Mediclinic", "Rhino Park Hospital",
        "UNAM", "IUM", "NUST"
    ]
    
    locations = [
        "Windhoek CBD", "Klein Windhoek", "Khomasdal", "Katutura",
        "Eros", "Olympia", "Pioneerspark", "Academia",
        "Walvis Bay", "Swakopmund", "Oshakati", "Rundu"
    ]
    
    statuses = ["completed"] * 85 + ["pending"] * 10 + ["failed"] * 5
    
    transactions = []
    
    for i in range(count):
        category = random.choice(list(categories.keys()))
        min_amount, max_amount = categories[category]
        
        # Generate realistic amount with some randomness
        amount = round(random.uniform(min_amount, max_amount), 2)
        
        # Time: spread over last 30 days with clustering (more recent transactions)
        days_ago = int(random.triangular(0, 30, 5))  # More transactions in last 5 days
        hours = random.randint(6, 23)  # Business hours mostly
        minutes = random.randint(0, 59)
        
        timestamp = base_time + timedelta(days=days_ago, hours=hours, minutes=minutes)
        
        transactions.append({
            "id": f"txn-test-{i:05d}",
            "user_id": f"user-{(i % 20):03d}",  # 20 different users
            "amount": amount,
            "category": category,
            "merchant": random.choice(merchants),
            "merchant_location": random.choice(locations),
            "timestamp": timestamp,
            "wallet_id": f"wallet-{(i % 8):03d}",  # 8 different wallets
            "status": random.choice(statuses),
            "device_id": f"device-{(i % 5):03d}",  # 5 different devices
            "ip_address": f"192.168.{random.randint(1, 254)}.{random.randint(1, 254)}",
            "currency": "NAD"
        })
    
    return pd.DataFrame(transactions)


def generate_fraud_events(transaction_ids: list, count: int = 30) -> pd.DataFrame:
    """
    Generate sample fraud events
    
    Args:
        transaction_ids: List of transaction IDs to use
        count: Number of fraud events to generate
        
    Returns:
        DataFrame with fraud event data
    """
    base_time = datetime.now() - timedelta(days=7)
    
    flagged_reasons = [
        "velocity", "large_amount", "unusual_time", 
        "new_merchant", "location_mismatch", "device_change"
    ]
    
    events = []
    
    # Use a subset of transaction IDs
    selected_txns = random.sample(transaction_ids, min(count, len(transaction_ids)))
    
    for i, txn_id in enumerate(selected_txns):
        # Risk score: mostly low-medium, some high
        if i % 5 == 0:
            risk_score = round(random.uniform(70, 95), 2)  # High risk
            is_fraud = True
        elif i % 3 == 0:
            risk_score = round(random.uniform(50, 69), 2)  # Medium risk
            is_fraud = random.choice([True, False])
        else:
            risk_score = round(random.uniform(20, 49), 2)  # Low risk
            is_fraud = False
        
        reviewed = i % 4 == 0  # 25% reviewed
        
        events.append({
            "transaction_id": txn_id,
            "is_fraud": is_fraud,
            "risk_score": risk_score,
            "flagged_reason": random.choice(flagged_reasons),
            "timestamp": base_time + timedelta(hours=i * 5, minutes=random.randint(0, 59)),
            "reviewed": reviewed,
            "reviewed_by": "admin" if reviewed else None,
            "reviewed_at": base_time + timedelta(hours=i * 5 + 2) if reviewed else None
        })
    
    return pd.DataFrame(events)


def generate_groups_and_members(user_ids: list) -> tuple:
    """
    Generate sample groups and members
    
    Args:
        user_ids: List of user IDs to use
        
    Returns:
        Tuple of (groups DataFrame, members DataFrame)
    """
    base_time = datetime.now() - timedelta(days=60)
    
    groups = []
    members = []
    
    group_names = [
        "Family Budget", "Weekend Squad", "Office Lunch",
        "Road Trip Gang", "Study Group", "Gym Buddies"
    ]
    
    for i, name in enumerate(group_names):
        group_id = f"group-{i:03d}"
        creator = random.choice(user_ids)
        
        groups.append({
            "id": group_id,
            "name": name,
            "created_by": creator,
            "created_at": base_time + timedelta(days=i * 10),
            "status": "active" if i < 5 else "inactive"
        })
        
        # Add 3-6 members per group
        num_members = random.randint(3, 6)
        group_users = random.sample(user_ids, num_members)
        
        for j, user_id in enumerate(group_users):
            members.append({
                "group_id": group_id,
                "user_id": user_id,
                "joined_at": base_time + timedelta(days=i * 10, hours=j),
                "role": "admin" if j == 0 else "member",
                "status": "active"
            })
    
    return pd.DataFrame(groups), pd.DataFrame(members)


def generate_budget_limits(user_ids: list) -> pd.DataFrame:
    """
    Generate sample budget limits
    
    Args:
        user_ids: List of user IDs to use
        
    Returns:
        DataFrame with budget limits
    """
    categories = ["groceries", "transport", "entertainment", "bills", "dining", "shopping"]
    
    budget_limits = []
    
    # Create budgets for half of the users
    for user_id in user_ids[::2]:  # Every other user
        for category in random.sample(categories, 3):  # 3 random categories
            budget_limits.append({
                "user_id": user_id,
                "category": category,
                "monthly_limit": round(random.uniform(500, 5000), 2),
                "currency": "NAD"
            })
    
    return pd.DataFrame(budget_limits)


def populate_database(db_path: str, transaction_count: int = 150):
    """
    Populate DuckDB with test data
    
    Args:
        db_path: Path to DuckDB database
        transaction_count: Number of transactions to generate
    """
    print("=" * 70)
    print("DuckDB Test Data Population")
    print("=" * 70)
    print()
    
    # Connect to database
    print(f"[1/7] Connecting to database: {db_path}")
    conn = duckdb.connect(db_path)
    print("  ✓ Connected")
    print()
    
    # Check current state
    print("[2/7] Checking current data...")
    current_count = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
    print(f"  Current transactions: {current_count}")
    
    if current_count > 0:
        response = input(f"  Database has {current_count} transactions. Clear and repopulate? (y/N): ")
        if response.lower() == 'y':
            print("  Clearing existing data...")
            conn.execute("DELETE FROM transactions")
            conn.execute("DELETE FROM fraud_events")
            conn.execute("DELETE FROM groups")
            conn.execute("DELETE FROM group_members")
            conn.execute("DELETE FROM budget_limits")
            conn.execute("DELETE FROM daily_transaction_summary")
            print("  ✓ Data cleared")
    print()
    
    # Generate transactions
    print(f"[3/7] Generating {transaction_count} transactions...")
    transactions_df = generate_sample_transactions(transaction_count)
    print(f"  ✓ Generated {len(transactions_df)} transactions")
    print(f"    - Users: {transactions_df['user_id'].nunique()}")
    print(f"    - Categories: {transactions_df['category'].nunique()}")
    print(f"    - Date range: {transactions_df['timestamp'].min()} to {transactions_df['timestamp'].max()}")
    print()
    
    # Insert transactions
    print("[4/7] Inserting transactions...")
    conn.execute("""
        INSERT INTO transactions 
        SELECT * FROM transactions_df
    """)
    inserted_count = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
    print(f"  ✓ Inserted {inserted_count} transactions")
    print()
    
    # Generate and insert fraud events
    print("[5/7] Generating fraud events...")
    transaction_ids = transactions_df['id'].tolist()
    fraud_events_df = generate_fraud_events(transaction_ids, count=30)
    print(f"  ✓ Generated {len(fraud_events_df)} fraud events")
    
    conn.execute("""
        INSERT INTO fraud_events 
        SELECT * FROM fraud_events_df
    """)
    fraud_count = conn.execute("SELECT COUNT(*) FROM fraud_events").fetchone()[0]
    print(f"  ✓ Inserted {fraud_count} fraud events")
    print()
    
    # Generate and insert groups/members
    print("[6/7] Generating groups and members...")
    user_ids = transactions_df['user_id'].unique().tolist()
    groups_df, members_df = generate_groups_and_members(user_ids)
    
    conn.execute("INSERT INTO groups SELECT * FROM groups_df")
    conn.execute("INSERT INTO group_members SELECT * FROM members_df")
    
    groups_count = conn.execute("SELECT COUNT(*) FROM groups").fetchone()[0]
    members_count = conn.execute("SELECT COUNT(*) FROM group_members").fetchone()[0]
    print(f"  ✓ Inserted {groups_count} groups with {members_count} members")
    print()
    
    # Generate and insert budget limits
    print("[7/7] Generating budget limits...")
    budget_limits_df = generate_budget_limits(user_ids)
    
    conn.execute("INSERT INTO budget_limits SELECT * FROM budget_limits_df")
    budget_count = conn.execute("SELECT COUNT(*) FROM budget_limits").fetchone()[0]
    print(f"  ✓ Inserted {budget_count} budget limits")
    print()
    
    # Summary statistics
    print("=" * 70)
    print("Data Population Summary")
    print("=" * 70)
    print()
    
    # Transaction breakdown
    print("Transaction Statistics:")
    stats = conn.execute("""
        SELECT 
            status,
            COUNT(*) as count,
            ROUND(SUM(amount), 2) as total_amount,
            ROUND(AVG(amount), 2) as avg_amount
        FROM transactions
        GROUP BY status
        ORDER BY count DESC
    """).fetchall()
    
    for stat in stats:
        print(f"  {stat[0]:12s}: {stat[1]:4d} transactions, NAD {stat[2]:10,.2f} total, NAD {stat[3]:7,.2f} avg")
    
    print()
    
    # Category breakdown
    print("Top 5 Categories by Transaction Count:")
    categories = conn.execute("""
        SELECT 
            category,
            COUNT(*) as count,
            ROUND(SUM(amount), 2) as total
        FROM transactions
        WHERE status = 'completed'
        GROUP BY category
        ORDER BY count DESC
        LIMIT 5
    """).fetchall()
    
    for cat in categories:
        print(f"  {cat[0]:15s}: {cat[1]:4d} transactions, NAD {cat[2]:10,.2f}")
    
    print()
    
    # Fraud statistics
    print("Fraud Event Statistics:")
    fraud_stats = conn.execute("""
        SELECT 
            SUM(CASE WHEN is_fraud THEN 1 ELSE 0 END) as confirmed_fraud,
            SUM(CASE WHEN risk_score >= 70 THEN 1 ELSE 0 END) as high_risk,
            SUM(CASE WHEN reviewed THEN 1 ELSE 0 END) as reviewed,
            ROUND(AVG(risk_score), 2) as avg_risk_score
        FROM fraud_events
    """).fetchone()
    
    print(f"  Confirmed fraud:  {fraud_stats[0]}")
    print(f"  High risk (≥70):  {fraud_stats[1]}")
    print(f"  Reviewed:         {fraud_stats[2]}")
    print(f"  Avg risk score:   {fraud_stats[3]}")
    print()
    
    print("=" * 70)
    print("✓ Test data population complete!")
    print("=" * 70)
    print()
    print("Next steps:")
    print("  1. Run analytics tests: python -m pytest -v -m analytics --tb=short")
    print("  2. Start API server: uvicorn smartpay_ai.api.main:app --reload")
    print()
    
    conn.close()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Populate DuckDB with test data")
    parser.add_argument(
        "--count",
        type=int,
        default=150,
        help="Number of transactions to generate (default: 150)"
    )
    parser.add_argument(
        "--db-path",
        type=str,
        default=None,
        help="Path to DuckDB file (default: data/analytics.duckdb)"
    )
    
    args = parser.parse_args()
    
    # Determine database path
    if args.db_path:
        db_path = args.db_path
    else:
        project_root = Path(__file__).parent.parent
        db_path = str(project_root / "data" / "analytics.duckdb")
    
    try:
        populate_database(db_path, args.count)
        return 0
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
