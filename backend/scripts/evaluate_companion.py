#!/usr/bin/env python3
"""
Full evaluation of the Buffr AI Companion: tool use, reasoning, tone, response quality,
knowledge base coverage, and human-in-the-loop (HITL).

Location: backend/scripts/evaluate_companion.py
Usage:
  cd backend && PYTHONPATH=. python scripts/evaluate_companion.py
  python scripts/evaluate_companion.py --base-url http://localhost:8000 --sleep 4 --show-responses
  python scripts/evaluate_companion.py --include-hitl --rate-limit 10
"""

import argparse
import json
import sys
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

try:
    import urllib.request
    import urllib.error
except ImportError:
    urllib = None  # type: ignore

BASE_URL_DEFAULT = "http://localhost:8000"


@dataclass
class TestCase:
    id: str
    category: str  # tool_use_kb | reasoning | tone | quality | hitl
    message: str
    expected_keywords: List[str] = field(default_factory=list)
    min_length: int = 50
    description: str = ""
    expect_interrupt: bool = False  # for HITL: expect status "interrupt"
    resume_with: Optional[Any] = None  # for HITL: after interrupt, send this as resume (True or {"approved": True})


def _chat(
    base_url: str,
    message: Optional[str],
    thread_id: str,
    resume: Optional[Any] = None,
) -> Tuple[Dict[str, Any], float, Optional[str]]:
    """POST /api/buffr-companion/chat. message=None and resume set for resume-after-approval."""
    url = f"{base_url.rstrip('/')}/api/buffr-companion/chat"
    if resume is not None:
        body = json.dumps({"thread_id": thread_id, "resume": resume}).encode("utf-8")
    else:
        body = json.dumps({"message": message, "thread_id": thread_id}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            elapsed = time.perf_counter() - start
            raw = resp.read().decode("utf-8")
            return json.loads(raw), elapsed, None
    except urllib.error.HTTPError as e:
        elapsed = time.perf_counter() - start
        try:
            err_body = e.read().decode("utf-8")
        except Exception:
            err_body = str(e)
        return {}, elapsed, f"HTTP {e.code}: {err_body}"
    except Exception as e:
        elapsed = time.perf_counter() - start
        return {}, elapsed, str(e)


def _last_assistant_content(data: Dict[str, Any]) -> str:
    messages = data.get("messages") or []
    for m in reversed(messages):
        if m.get("role") in ("assistant", "ai"):
            c = m.get("content")
            return c if isinstance(c, str) else ""
    return ""


def _health(base_url: str) -> bool:
    url = f"{base_url.rstrip('/')}/health"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception:
        return False


def get_test_cases(include_hitl: bool = False) -> List[TestCase]:
    cases = [
        # ---------- Knowledge base: fees & cash-out ----------
        TestCase(
            id="kb_fees",
            category="tool_use_kb",
            message="What are the cash-out fees for Buffr?",
            expected_keywords=["fee", "N$", "cash", "agent", "till", "ATM", "NamPost"],
            min_length=80,
            description="KB: fee table retrieval",
        ),
        TestCase(
            id="kb_cashout_till",
            category="tool_use_kb",
            message="How do I get cash at a till (retailer)?",
            expected_keywords=["till", "QR", "scan", "retail", "confirm", "PIN"],
            min_length=60,
            description="KB: Cash at Till",
        ),
        TestCase(
            id="kb_cashout_atm",
            category="tool_use_kb",
            message="What is the fee for cashing out at an ATM?",
            expected_keywords=["ATM", "N$8", "8", "fee", "QR"],
            min_length=40,
            description="KB: ATM cash-out fee",
        ),
        TestCase(
            id="kb_bank_transfer",
            category="tool_use_kb",
            message="How do I transfer money to my bank account from Buffr?",
            expected_keywords=["bank", "transfer", "link", "fee", "N$5", "1-2"],
            min_length=50,
            description="KB: Bank transfer cash-out",
        ),
        # ---------- Knowledge base: vouchers ----------
        TestCase(
            id="kb_redeem_voucher",
            category="tool_use_kb",
            message="How do I redeem a voucher to my Buffr wallet?",
            expected_keywords=["redeem", "wallet", "PIN", "biometric", "Vouchers", "confirm"],
            min_length=80,
            description="KB: voucher redemption steps",
        ),
        TestCase(
            id="kb_voucher_expiry",
            category="tool_use_kb",
            message="What happens if my voucher expires?",
            expected_keywords=["expir", "remind", "14", "7", "day", "redeem", "government"],
            min_length=50,
            description="KB: voucher expiry",
        ),
        TestCase(
            id="kb_nampost",
            category="tool_use_kb",
            message="How can I get cash at NamPost?",
            expected_keywords=["NamPost", "branch", "QR", "code", "cash", "free"],
            min_length=60,
            description="KB: NamPost cash-out",
        ),
        # ---------- Knowledge base: complaints & support ----------
        TestCase(
            id="kb_complaints",
            category="tool_use_kb",
            message="How do I make a complaint and what happens after?",
            expected_keywords=["complaint", "acknowledge", "15", "day", "escalat", "Bank of Namibia"],
            min_length=80,
            description="KB: complaints process",
        ),
        TestCase(
            id="kb_contact_support",
            category="tool_use_kb",
            message="How do I contact Buffr support?",
            expected_keywords=["email", "phone", "help", "support", "contact", "app"],
            min_length=50,
            description="KB: contact and support",
        ),
        # ---------- Knowledge base: loans ----------
        TestCase(
            id="kb_loan_what",
            category="tool_use_kb",
            message="What is a voucher-backed loan?",
            expected_keywords=["loan", "voucher", "repay", "third", "grant", "automatic"],
            min_length=60,
            description="KB: voucher-backed loan",
        ),
        TestCase(
            id="kb_loan_repay",
            category="tool_use_kb",
            message="How is the loan repaid?",
            expected_keywords=["automatic", "redeem", "voucher", "deduct", "interest", "15"],
            min_length=50,
            description="KB: loan repayment",
        ),
        # ---------- Knowledge base: bills & cards ----------
        TestCase(
            id="kb_bills",
            category="tool_use_kb",
            message="What bills can I pay with Buffr?",
            expected_keywords=["bill", "electricity", "water", "DStv", "NamPower", "school"],
            min_length=50,
            description="KB: bill payments",
        ),
        TestCase(
            id="kb_buffr_card",
            category="tool_use_kb",
            message="What is the Buffr Card?",
            expected_keywords=["virtual", "card", "wallet", "display", "identification"],
            min_length=40,
            description="KB: Buffr Card definition",
        ),
        TestCase(
            id="kb_add_card",
            category="tool_use_kb",
            message="Is it safe to store my card details in Buffr?",
            expected_keywords=["safe", "encrypt", "PCI", "CVV", "secure"],
            min_length=40,
            description="KB: card security",
        ),
        # ---------- Knowledge base: profile, security, 2FA ----------
        TestCase(
            id="kb_proof_of_life",
            category="tool_use_kb",
            message="What is proof-of-life and what happens if I miss it?",
            expected_keywords=["proof", "life", "verify", "90", "frozen", "wallet"],
            min_length=60,
            description="KB: proof-of-life",
        ),
        TestCase(
            id="kb_2fa",
            category="tool_use_kb",
            message="What is two-factor authentication (2FA) in Buffr?",
            expected_keywords=["2FA", "PIN", "biometric", "phone", "approve", "transaction"],
            min_length=50,
            description="KB: 2FA explained",
        ),
        TestCase(
            id="kb_safety",
            category="tool_use_kb",
            message="How does Buffr protect my money?",
            expected_keywords=["encrypt", "safeguard", "Bank of Namibia", "2FA", "separate"],
            min_length=50,
            description="KB: security and safety",
        ),
        # ---------- Knowledge base: groups, USSD, troubleshooting ----------
        TestCase(
            id="kb_groups",
            category="tool_use_kb",
            message="What are groups and how do I send money to a group?",
            expected_keywords=["group", "member", "send", "pool", "contribution"],
            min_length=50,
            description="KB: groups",
        ),
        TestCase(
            id="kb_ussd",
            category="tool_use_kb",
            message="What if I don't have a smartphone? Can I use Buffr?",
            expected_keywords=["USSD", "*123#", "feature", "phone", "balance", "SMS"],
            min_length=50,
            description="KB: USSD option",
        ),
        TestCase(
            id="kb_forgot_pin",
            category="tool_use_kb",
            message="I forgot my PIN. What do I do?",
            expected_keywords=["PIN", "Forgot", "code", "SMS", "email", "reset"],
            min_length=40,
            description="KB: forgot PIN",
        ),
        TestCase(
            id="kb_wallet_frozen",
            category="tool_use_kb",
            message="My wallet is frozen. Why and how do I unfreeze it?",
            expected_keywords=["frozen", "proof", "life", "verify", "support", "NamPost"],
            min_length=50,
            description="KB: frozen wallet",
        ),
        TestCase(
            id="kb_hidden_fees",
            category="tool_use_kb",
            message="Are there any hidden fees in Buffr?",
            expected_keywords=["no", "hidden", "fee", "display", "confirm", "clear"],
            min_length=30,
            description="KB: no hidden fees",
        ),
        # ---------- Reasoning ----------
        TestCase(
            id="reasoning_wallet_choice",
            category="reasoning",
            message="I want to save for school fees. Should I create a separate wallet or use my main wallet?",
            expected_keywords=["wallet", "save"],  # relaxed: user-driven choice; accept any advice about wallets/saving
            min_length=50,
            description="Reasoning: wallet choice (open-ended; user creates wallets for any purpose)",
        ),
        TestCase(
            id="reasoning_voucher_mistake",
            category="reasoning",
            message="My voucher says already redeemed but I never used it. What should I do?",
            expected_keywords=["redeem", "contact", "support", "mistake", "help"],
            min_length=40,
            description="Reasoning: troubleshooting",
        ),
        # ---------- Tone ----------
        TestCase(
            id="tone_greeting",
            category="tone",
            message="Hi, I'm new to Buffr.",
            expected_keywords=["help", "welcome", "Buffr", "wallet", "voucher"],
            min_length=40,
            description="Tone: friendly greeting",
        ),
        TestCase(
            id="tone_empathy",
            category="tone",
            message="I'm worried about my transaction failing.",
            expected_keywords=["check", "balance", "network", "support", "try", "fail"],
            min_length=40,
            description="Tone: empathetic",
        ),
        # ---------- Response quality ----------
        TestCase(
            id="quality_structured",
            category="quality",
            message="List the main ways I can add money to my wallet.",
            expected_keywords=["bank", "card", "voucher", "transfer", "add"],
            min_length=80,
            description="Quality: structured list",
        ),
        TestCase(
            id="quality_fee_accuracy",
            category="quality",
            message="What is the exact fee for cash-out at till?",
            expected_keywords=["free", "till", "retail", "0", "N$0"],
            min_length=30,
            description="Quality: accurate fee (till = free)",
        ),
        # ---------- General ----------
        TestCase(
            id="general_help",
            category="tool_use_kb",
            message="What can you help me with?",
            expected_keywords=["help", "voucher", "wallet", "bill", "loan", "spend"],
            min_length=100,
            description="General: capability overview",
        ),
        # ---------- Financial literacy (KB / education) ----------
        TestCase(
            id="finlit_budgeting",
            category="tool_use_kb",
            message="How can I budget better with my grant money?",
            expected_keywords=["budget", "spend", "save", "grant", "track", "wallet"],
            min_length=60,
            description="Financial literacy: budgeting with grants",
        ),
        TestCase(
            id="finlit_saving",
            category="tool_use_kb",
            message="Give me tips for saving money in Buffr.",
            expected_keywords=["save", "wallet", "goal", "set aside", "spend"],
            min_length=50,
            description="Financial literacy: saving tips",
        ),
        TestCase(
            id="finlit_managing_grants",
            category="tool_use_kb",
            message="How do I manage my social grant so it lasts the month?",
            expected_keywords=["grant", "budget", "month", "spend", "save", "priority"],
            min_length=50,
            description="Financial literacy: managing grants",
        ),
        TestCase(
            id="finlit_avoid_scams",
            category="tool_use_kb",
            message="How do I avoid scams when using mobile money?",
            expected_keywords=["scam", "fraud", "PIN", "share", "never", "safe", "verify"],
            min_length=50,
            description="Financial literacy: avoiding scams",
        ),
    ]

    # ---------- Human-in-the-loop (optional) ----------
    if include_hitl:
        cases.extend([
            TestCase(
                id="hitl_create_wallet",
                category="hitl",
                message="Create a wallet named EvalTestWallet for savings.",
                expected_keywords=["approve", "created", "wallet", "EvalTestWallet"],
                min_length=20,
                description="HITL: create wallet → interrupt → resume approve",
                expect_interrupt=True,
                resume_with=True,
            ),
            TestCase(
                id="hitl_deny",
                category="hitl",
                message="Please create a group called EvalTestGroup.",
                expected_keywords=["approve", "deny", "group", "decline"],
                min_length=10,
                description="HITL: create group → interrupt → resume deny",
                expect_interrupt=True,
                resume_with=False,  # deny
            ),
        ])
    return cases


def run_evaluation(
    base_url: str,
    quick: bool = False,
    include_hitl: bool = False,
    sleep_sec: float = 3.0,
    rate_limit_per_minute: Optional[int] = None,
    show_responses: bool = True,
    max_response_chars: Optional[int] = None,
    stream_progress: bool = True,
) -> Dict[str, Any]:
    results: List[Dict[str, Any]] = []

    if not _health(base_url):
        return {
            "ok": False,
            "error": "Companion health check failed. Is it running?",
            "results": [],
            "summary": {},
        }

    all_cases = get_test_cases(include_hitl=include_hitl)
    if quick:
        quick_ids = {"kb_fees", "reasoning_wallet_choice", "tone_greeting", "quality_structured", "general_help", "finlit_budgeting"}
        test_cases = [tc for tc in all_cases if tc.id in quick_ids]
    else:
        test_cases = all_cases
    n_total = len(test_cases)

    if rate_limit_per_minute and rate_limit_per_minute > 0:
        sleep_sec = max(sleep_sec, 60.0 / rate_limit_per_minute)

    for i, tc in enumerate(test_cases):
        thread_id = f"eval-{tc.id}-{int(time.time())}"
        # ----- Send message -----
        data, elapsed, err = _chat(base_url, tc.message, thread_id)
        content = _last_assistant_content(data) if not err else ""
        status = data.get("status") if not err else None
        approval_payload = data.get("approval_payload") if not err else None

        # ----- HITL: if we expected interrupt and got it, send resume -----
        if tc.expect_interrupt and tc.resume_with is not None and status == "interrupt" and not err:
            time.sleep(sleep_sec)
            data2, elapsed2, err2 = _chat(base_url, None, thread_id, resume=tc.resume_with)
            elapsed += elapsed2
            content = _last_assistant_content(data2)
            status = data2.get("status")
            if err2:
                err = err2

        # ----- Evaluate -----
        keyword_ok = (
            not tc.expected_keywords
            or any(k.lower() in content.lower() for k in tc.expected_keywords)
        )
        length_ok = len(content) >= tc.min_length
        if tc.expect_interrupt:
            # HITL: we expect either interrupt (then after resume, ok) or ok if no action was triggered
            pass_ = err is None and (status == "ok" or status == "interrupt") and length_ok
        else:
            pass_ = err is None and status == "ok" and keyword_ok and length_ok

        reply_full = content
        if max_response_chars and len(reply_full) > max_response_chars:
            reply_display = reply_full[:max_response_chars] + "…"
        else:
            reply_display = reply_full

        results.append({
            "id": tc.id,
            "category": tc.category,
            "description": tc.description,
            "message": tc.message,
            "pass": pass_,
            "status": status,
            "error": err,
            "elapsed_sec": round(elapsed, 2),
            "reply_length": len(content),
            "reply_full": reply_full,
            "reply_display": reply_display,
            "keyword_ok": keyword_ok,
            "length_ok": length_ok,
            "approval_payload": approval_payload,
        })

        # Stream progress and response so user sees output as tests run
        if stream_progress:
            idx = len(results)
            mark = "PASS" if pass_ else "FAIL"
            print(f"\n[{idx}/{n_total}] {mark} {tc.id} ({tc.category}) – {tc.description}", flush=True)
            print(f"  Query: {tc.message}", flush=True)
            print(f"  Time: {elapsed:.2f}s | Reply length: {len(content)} | keyword_ok={keyword_ok} length_ok={length_ok}", flush=True)
            if err:
                print(f"  Error: {err}", flush=True)
            if show_responses and reply_display:
                print("  --- Response ---", flush=True)
                for line in reply_display.splitlines():
                    print(f"  {line}", flush=True)
                print("  ---", flush=True)

        # Rate limiting: sleep after each request
        if sleep_sec > 0 and i < len(test_cases) - 1:
            time.sleep(sleep_sec)

    by_cat: Dict[str, List[bool]] = {}
    for r in results:
        by_cat.setdefault(r["category"], []).append(r["pass"])
    summary = {
        "total": len(results),
        "passed": sum(1 for r in results if r["pass"]),
        "by_category": {
            cat: {"passed": sum(p), "total": len(p)}
            for cat, p in by_cat.items()
        },
    }

    return {
        "ok": True,
        "results": results,
        "summary": summary,
        "show_responses": show_responses,
        "max_response_chars": max_response_chars,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Evaluate Buffr AI Companion: tool use, reasoning, tone, quality, KB, HITL"
    )
    parser.add_argument("--base-url", default=BASE_URL_DEFAULT, help="Companion base URL")
    parser.add_argument("--json", action="store_true", help="Output full JSON to stdout (includes full responses)")
    parser.add_argument("--quick", action="store_true", help="Run only 5 tests")
    parser.add_argument("--include-hitl", action="store_true", help="Include human-in-the-loop tests (create wallet/group, approve/deny)")
    parser.add_argument("--sleep", type=float, default=3.0, help="Seconds to sleep after each query (rate limiting). Default: 3")
    parser.add_argument("--rate-limit", type=int, default=None, help="Max requests per minute (overrides --sleep if stricter)")
    parser.add_argument("--show-responses", action="store_true", default=True, help="Print full assistant response for each test (default: True)")
    parser.add_argument("--no-show-responses", action="store_false", dest="show_responses", help="Do not print full responses")
    parser.add_argument("--max-response-chars", type=int, default=None, help="Truncate printed response to N characters")
    parser.add_argument("--no-stream", action="store_true", help="Do not print progress/responses until all tests finish")
    args = parser.parse_args()

    if urllib is None:
        print("urllib not available", file=sys.stderr)
        return 1

    out = run_evaluation(
        args.base_url,
        quick=args.quick,
        include_hitl=args.include_hitl,
        sleep_sec=args.sleep,
        rate_limit_per_minute=args.rate_limit,
        show_responses=args.show_responses,
        max_response_chars=args.max_response_chars,
        stream_progress=not args.no_stream,
    )

    if args.json:
        # Remove reply_full from JSON if very long for readability; keep in results for debugging
        print(json.dumps(out, indent=2))
        return 0 if out.get("ok") and out.get("summary", {}).get("passed", 0) == out.get("summary", {}).get("total", 0) else 1

    if not out.get("ok"):
        print("ERROR:", out.get("error", "Unknown"), file=sys.stderr)
        return 1

    summary = out["summary"]
    show_responses = out.get("show_responses", True)

    print("=" * 72)
    print("Buffr AI Companion – Evaluation Report")
    print("=" * 72)
    print(f"Total: {summary['passed']}/{summary['total']} passed")
    print()
    for cat, c in summary.get("by_category", {}).items():
        print(f"  {cat}: {c['passed']}/{c['total']}")
    print()
    print("-" * 72)
    for r in out["results"]:
        mark = "PASS" if r["pass"] else "FAIL"
        print(f"\n  [{mark}] {r['id']} ({r['category']}) – {r['description']}")
        print(f"       Query: {r['message']}")
        print(f"       Time: {r['elapsed_sec']}s | Reply length: {r['reply_length']} | keyword_ok={r['keyword_ok']} length_ok={r['length_ok']}")
        if r.get("approval_payload"):
            print(f"       Approval payload: {r['approval_payload']}")
        if r.get("error"):
            print(f"       Error: {r['error']}")
        if show_responses and r.get("reply_display"):
            print("       --- Response ---")
            for line in r["reply_display"].splitlines():
                print(f"       {line}")
            print("       ---")
    print()
    print("=" * 72)
    return 0 if summary["passed"] == summary["total"] else 1


if __name__ == "__main__":
    sys.exit(main())
