#!/usr/bin/env python3
"""
Comprehensive Integration Validation Script

Purpose: Validate knowledge base ingestion, RAG functionality, and test coverage
Location: fintech/validate_integration.py

Tests:
1. LanceDB knowledge base ingestion
2. Vector search functionality
3. RAG retrieval accuracy
4. DuckDB analytics (if exists)
5. BuffrConnect integration coverage
"""

import asyncio
import json
import time
import sys
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime

# Add smartpay_ai to path
sys.path.insert(0, str(Path(__file__).parent / "smartpay" / "backend_python"))

try:
    from smartpay_ai.db_utils import get_lancedb, get_or_create_knowledge_table, generate_embedding
    from smartpay_ai.knowledge_base.retrieve import retrieve, list_documents
    from smartpay_ai.knowledge_base.ingest import ingest_documents
    HAS_SMARTPAY = True
except ImportError as e:
    print(f"Warning: Could not import smartpay_ai modules: {e}")
    HAS_SMARTPAY = False


class IntegrationValidator:
    """Validates integration components."""
    
    def __init__(self):
        self.results: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "tests": {},
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "skipped": 0,
            }
        }
    
    def log_test(self, name: str, status: str, details: Any = None, error: str = None):
        """Log test result."""
        self.results["tests"][name] = {
            "status": status,
            "details": details,
            "error": error,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.results["summary"]["total"] += 1
        if status == "passed":
            self.results["summary"]["passed"] += 1
            print(f"✓ {name}")
        elif status == "failed":
            self.results["summary"]["failed"] += 1
            print(f"✗ {name}: {error}")
        elif status == "skipped":
            self.results["summary"]["skipped"] += 1
            print(f"○ {name} (skipped)")
    
    async def test_lancedb_connection(self) -> bool:
        """Test LanceDB connection and table existence."""
        try:
            db = get_lancedb()
            table_names = db.table_names()
            
            has_kb_table = "knowledge_base" in table_names
            
            if has_kb_table:
                table = db.open_table("knowledge_base")
                row_count = table.count_rows()
                schema = str(table.schema)
                
                self.log_test(
                    "LanceDB Connection",
                    "passed",
                    {
                        "tables": table_names,
                        "knowledge_base_rows": row_count,
                        "schema": schema[:200],
                    }
                )
                return row_count > 0
            else:
                self.log_test(
                    "LanceDB Connection",
                    "failed",
                    {"tables": table_names},
                    "knowledge_base table not found"
                )
                return False
                
        except Exception as e:
            self.log_test("LanceDB Connection", "failed", error=str(e))
            return False
    
    async def test_knowledge_base_ingestion(self) -> bool:
        """Test knowledge base ingestion with sample documents."""
        try:
            sample_docs = [
                {
                    "title": "Test: Voucher Redemption Process",
                    "content": "To redeem a voucher, the agent scans the QR code and validates the voucher code. The system checks expiration and balance.",
                    "metadata": {"category": "test", "tags": ["voucher", "g2p"]}
                },
                {
                    "title": "Test: Wallet Management Guide",
                    "content": "Users can create multiple wallets for different purposes. Each wallet has its own balance and transaction history.",
                    "metadata": {"category": "test", "tags": ["wallet", "money-management"]}
                }
            ]
            
            stats = await ingest_documents(sample_docs, scope="global")
            
            success = stats["added"] > 0 or stats["skipped"] == len(sample_docs)
            
            self.log_test(
                "Knowledge Base Ingestion",
                "passed" if success else "failed",
                stats,
                None if success else "Failed to ingest documents"
            )
            return success
            
        except Exception as e:
            self.log_test("Knowledge Base Ingestion", "failed", error=str(e))
            return False
    
    async def test_vector_search(self) -> bool:
        """Test vector search functionality."""
        try:
            test_queries = [
                "How do I redeem a voucher?",
                "What are wallet features?",
                "PSD-1 compliance requirements",
            ]
            
            results_summary = []
            
            for query in test_queries:
                start_time = time.time()
                results = await retrieve(query, limit=3, score_threshold=0.5)
                latency_ms = (time.time() - start_time) * 1000
                
                results_summary.append({
                    "query": query,
                    "result_count": len(results),
                    "latency_ms": round(latency_ms, 2),
                    "top_result": results[0] if results else None
                })
            
            success = any(r["result_count"] > 0 for r in results_summary)
            
            self.log_test(
                "Vector Search",
                "passed" if success else "failed",
                results_summary,
                None if success else "No results returned for any query"
            )
            return success
            
        except Exception as e:
            self.log_test("Vector Search", "failed", error=str(e))
            return False
    
    async def test_rag_accuracy(self) -> bool:
        """Test RAG retrieval accuracy and relevance."""
        try:
            test_cases = [
                {
                    "query": "voucher redemption",
                    "expected_keywords": ["voucher", "redeem", "agent"],
                },
                {
                    "query": "wallet management",
                    "expected_keywords": ["wallet", "balance", "transaction"],
                },
            ]
            
            accuracy_results = []
            
            for test in test_cases:
                results = await retrieve(test["query"], limit=3, score_threshold=0.6)
                
                if results:
                    # Check if expected keywords are in results
                    result_text = " ".join([r["title"] + " " + r["snippet"] for r in results]).lower()
                    keyword_matches = sum(1 for kw in test["expected_keywords"] if kw.lower() in result_text)
                    accuracy = keyword_matches / len(test["expected_keywords"])
                    
                    accuracy_results.append({
                        "query": test["query"],
                        "accuracy": round(accuracy, 2),
                        "matched_keywords": keyword_matches,
                        "total_keywords": len(test["expected_keywords"]),
                        "top_score": results[0]["score"] if results else 0
                    })
                else:
                    accuracy_results.append({
                        "query": test["query"],
                        "accuracy": 0,
                        "error": "No results"
                    })
            
            avg_accuracy = sum(r.get("accuracy", 0) for r in accuracy_results) / len(accuracy_results)
            success = avg_accuracy > 0.5
            
            self.log_test(
                "RAG Accuracy",
                "passed" if success else "failed",
                {
                    "average_accuracy": round(avg_accuracy, 2),
                    "test_cases": accuracy_results
                },
                None if success else f"Average accuracy {avg_accuracy:.2f} below threshold 0.5"
            )
            return success
            
        except Exception as e:
            self.log_test("RAG Accuracy", "failed", error=str(e))
            return False
    
    async def test_duckdb_analytics(self) -> bool:
        """Test DuckDB analytics functionality."""
        try:
            import duckdb
            
            # Check for DuckDB files
            duckdb_paths = [
                Path("smartpay/backend_python/data/analytics.db"),
                Path("smartpay/backend_python/data/smartpay.db"),
                Path("smartpay/backend_python/data/transactions.db"),
            ]
            
            existing_dbs = [p for p in duckdb_paths if p.exists()]
            
            if not existing_dbs:
                self.log_test(
                    "DuckDB Analytics",
                    "skipped",
                    {"note": "No DuckDB files found - feature not yet implemented"}
                )
                return True
            
            # Test first existing DB
            db_path = existing_dbs[0]
            conn = duckdb.connect(str(db_path))
            
            tables = conn.execute("SHOW TABLES").fetchall()
            table_names = [t[0] for t in tables]
            
            # Test basic query
            if table_names:
                sample_table = table_names[0]
                count = conn.execute(f"SELECT COUNT(*) FROM {sample_table}").fetchone()[0]
                
                self.log_test(
                    "DuckDB Analytics",
                    "passed",
                    {
                        "database": str(db_path),
                        "tables": table_names,
                        f"{sample_table}_count": count
                    }
                )
            else:
                self.log_test(
                    "DuckDB Analytics",
                    "passed",
                    {"database": str(db_path), "tables": [], "note": "Database exists but no tables"}
                )
            
            conn.close()
            return True
            
        except ImportError:
            self.log_test(
                "DuckDB Analytics",
                "skipped",
                {"note": "DuckDB not installed"}
            )
            return True
        except Exception as e:
            self.log_test("DuckDB Analytics", "failed", error=str(e))
            return False
    
    def test_buffr_integration_coverage(self) -> bool:
        """Check BuffrConnect integration test coverage."""
        try:
            buffr_files = [
                Path("smartpay/backend/src/routes/buffr.ts"),
                Path("smartpay/backend/src/routes/buffr-webhooks.ts"),
                Path("smartpay/backend/src/services/buffr/client.ts"),
                Path("smartpay/backend/src/services/buffr/cashOut.ts"),
            ]
            
            existing_files = [f for f in buffr_files if f.exists()]
            
            # Check for test files
            test_patterns = [
                "smartpay/backend/**/*buffr*.test.ts",
                "smartpay/backend/**/*buffr*.spec.ts",
                "smartpay/backend_python/tests/*buffr*.py",
            ]
            
            test_files = []
            for pattern in test_patterns:
                test_files.extend(Path(".").glob(pattern))
            
            coverage_data = {
                "implementation_files": [str(f) for f in existing_files],
                "test_files": [str(f) for f in test_files],
                "implementation_count": len(existing_files),
                "test_count": len(test_files),
                "coverage_ratio": len(test_files) / len(existing_files) if existing_files else 0
            }
            
            has_tests = len(test_files) > 0
            
            self.log_test(
                "BuffrConnect Test Coverage",
                "passed" if has_tests else "failed",
                coverage_data,
                None if has_tests else "No test files found for BuffrConnect integration"
            )
            return has_tests
            
        except Exception as e:
            self.log_test("BuffrConnect Test Coverage", "failed", error=str(e))
            return False
    
    async def run_all_tests(self):
        """Run all validation tests."""
        print("=" * 80)
        print("SmartPay Integration Validation")
        print("=" * 80)
        print()
        
        if not HAS_SMARTPAY:
            print("✗ Cannot import smartpay_ai - skipping Python tests")
            self.log_test("Import Check", "failed", error="Cannot import smartpay_ai modules")
        else:
            print("Running LanceDB and RAG tests...")
            await self.test_lancedb_connection()
            await self.test_knowledge_base_ingestion()
            await self.test_vector_search()
            await self.test_rag_accuracy()
        
        print("\nRunning DuckDB tests...")
        await self.test_duckdb_analytics()
        
        print("\nRunning BuffrConnect coverage tests...")
        self.test_buffr_integration_coverage()
        
        print("\n" + "=" * 80)
        print("Test Summary")
        print("=" * 80)
        summary = self.results["summary"]
        print(f"Total: {summary['total']}")
        print(f"Passed: {summary['passed']} ✓")
        print(f"Failed: {summary['failed']} ✗")
        print(f"Skipped: {summary['skipped']} ○")
        print()
        
        return self.results


async def main():
    """Main entry point."""
    validator = IntegrationValidator()
    results = await validator.run_all_tests()
    
    # Save results to JSON
    output_file = Path("integration_validation_results.json")
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"Results saved to: {output_file}")
    
    # Exit with error code if any tests failed
    if results["summary"]["failed"] > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
