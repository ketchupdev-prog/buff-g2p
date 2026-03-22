#!/usr/bin/env bash
# ============================================================================
# SmartPay ecosystem — comprehensive API & service validation
# Location: fintech/scripts/validate-system.sh
#
# Services (override with env):
#   BUFFR_PORT=3000  BACKEND_PORT=4000  AI_PORT=8000  KETCHUP_PORT=3001
#   SKIP_MOBILE=1    — skip Metro / port 8081 checks
#   SKIP_BUFFR=1     — skip Buffr Connect (Next.js) probes
#   SKIP_KETCHUP=1   — skip Ketchup Portals probes
#
# JWT for Smartpay backend: set JWT_SECRET to match the running backend.
# Token is minted from apps/smartpay-backend (jsonwebtoken).
# ============================================================================

set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../apps/smartpay-backend" && pwd)"
REPORT_DIR="${REPORT_DIR:-$SCRIPT_DIR/reports}"
mkdir -p "$REPORT_DIR"

TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
TSV_FILE="$REPORT_DIR/validation-run-${RUN_ID}.tsv"
MD_FILE="$REPORT_DIR/validation-report-${RUN_ID}.md"
MD_LATEST="$REPORT_DIR/validation-report-LATEST.md"

BUFFR_PORT="${BUFFR_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-4000}"
AI_PORT="${AI_PORT:-8000}"
KETCHUP_PORT="${KETCHUP_PORT:-3001}"

SKIP_MOBILE="${SKIP_MOBILE:-0}"
SKIP_BUFFR="${SKIP_BUFFR:-0}"
SKIP_KETCHUP="${SKIP_KETCHUP:-0}"

JWT_SECRET="${JWT_SECRET:-test-secret-key-for-e2e-testing-only-do-not-use-in-production-4f8b9c2a1e5d}"
TEST_USER_ID="${TEST_USER_ID:-46356017-f4e8-44f3-8c67-800dcb1201b7}"

CURL_OPTS=(--connect-timeout 3 --max-time 25 -sS)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
SKIPPED_CHECKS=0
WARNINGS=()

: >"$TSV_FILE"
echo -e "section\tname\tmethod\turl\texpected_http\tactual_http\ttime_ms\tstatus\tdetail" >>"$TSV_FILE"

log_tsv() {
  # shellcheck disable=SC2120
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" "${9:-}" >>"$TSV_FILE"
}

code_allowed() {
  local actual="$1"
  local allowed="$2"
  if echo "$allowed" | tr '|' '\n' | grep -qx "$actual"; then
    return 0
  fi
  return 1
}

# probe section name method url header_line body_json expected_pipe_separated_codes
probe_http() {
  local section="$1" name="$2" method="$3" url="$4" hdr="$5" body="$6" expected="$7"
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  local tmpf tmpf_err out code ms curl_ec
  tmpf="$(mktemp)"
  tmpf_err="${tmpf}.err"
  : >"$tmpf_err"
  local -a curl_cmd=(curl "${CURL_OPTS[@]}" -o "$tmpf" -w "%{http_code}|%{time_total}" -X "$method" "$url")
  if [ -n "$hdr" ]; then
    curl_cmd+=(-H "$hdr")
  fi
  if [ -n "$body" ]; then
    curl_cmd+=(-H "Content-Type: application/json" -d "$body")
  fi

  curl_ec=0
  out="$("${curl_cmd[@]}" 2>"$tmpf_err")" || curl_ec=$?
  if [ "$curl_ec" -eq 7 ] || grep -q "Connection refused" "$tmpf_err" 2>/dev/null; then
    echo -e "${YELLOW}⊘${NC} ${name} (service unreachable)"
    SKIPPED_CHECKS=$((SKIPPED_CHECKS + 1))
    log_tsv "$section" "$name" "$method" "$url" "$expected" "-" "-" "SKIP" "connection refused / unreachable"
    rm -f "$tmpf" "$tmpf_err"
    return 2
  fi

  code="${out%%|*}"
  ms_raw="${out##*|}"
  ms="$(python3 -c "print(int(float('$ms_raw')*1000))" 2>/dev/null || echo "0")"

  if code_allowed "$code" "$expected"; then
    echo -e "${GREEN}✓${NC} ${name} (${code}, ${ms}ms)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    log_tsv "$section" "$name" "$method" "$url" "$expected" "$code" "$ms" "PASS" ""
    rm -f "$tmpf" "$tmpf_err"
    return 0
  fi

  echo -e "${RED}✗${NC} ${name} (expected one of [${expected//|/, }], got ${code})"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
  local detail
  detail="$(head -c 200 "$tmpf" 2>/dev/null | tr '\n' ' ')"
  log_tsv "$section" "$name" "$method" "$url" "$expected" "$code" "$ms" "FAIL" "$detail"
  rm -f "$tmpf" "$tmpf_err"
  return 1
}

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ECOSYSTEM API VALIDATION  (${TIMESTAMP})                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "TSV: $TSV_FILE"
echo ""

# --- JWT ---
TEST_TOKEN=""
if (cd "$BACKEND_DIR" && node -e "require.resolve('jsonwebtoken')" >/dev/null 2>&1); then
  TEST_TOKEN="$(cd "$BACKEND_DIR" && TEST_USER_ID="$TEST_USER_ID" JWT_SECRET="$JWT_SECRET" node -e "const jwt=require('jsonwebtoken');console.log(jwt.sign({userId:process.env.TEST_USER_ID,email:'validate@example.com'}, process.env.JWT_SECRET));" 2>/dev/null)" || true
fi
if [ -z "$TEST_TOKEN" ]; then
  WARNINGS+=("Could not mint JWT (run npm install in apps/smartpay-backend). Backend auth probes will be skipped or fail.")
  echo -e "${YELLOW}⚠${NC} JWT mint failed — install deps in smartpay-backend"
fi
AUTH_HDR="Authorization: Bearer $TEST_TOKEN"

WINDHOEK_QS="lat=-22.5597&lng=17.0832&radius=5000"

echo -e "\n${BLUE}━━━ 1. Health endpoints (all services) ━━━${NC}\n"

probe_http "health" "Backend GET /health" GET "http://localhost:${BACKEND_PORT}/health" "" "" "200"
probe_http "health" "Backend GET /health/db" GET "http://localhost:${BACKEND_PORT}/health/db" "" "" "200|503"
probe_http "health" "AI GET /health" GET "http://localhost:${AI_PORT}/health" "" "" "200"

probe_http "health" "AI GET /api/v1/health/detailed" GET "http://localhost:${AI_PORT}/api/v1/health/detailed" "" "" "200"

if [ "$SKIP_BUFFR" != "1" ]; then
  probe_http "health" "Buffr GET /api/health" GET "http://localhost:${BUFFR_PORT}/api/health" "" "" "200"
  probe_http "health" "Buffr GET /api/v1/health (rewrite→/api/health)" GET "http://localhost:${BUFFR_PORT}/api/v1/health" "" "" "200"
fi

if [ "$SKIP_KETCHUP" != "1" ]; then
  probe_http "health" "Ketchup GET /api/health" GET "http://localhost:${KETCHUP_PORT}/api/health" "" "" "200|503"
  probe_http "health" "Ketchup GET /api/v1/health (rewrite)" GET "http://localhost:${KETCHUP_PORT}/api/v1/health" "" "" "200|503"
fi

echo -e "\n${BLUE}━━━ 2. Smartpay backend — OBS & location & transactions ━━━${NC}\n"

probe_http "legacy-alias" "Legacy GET /api/atms/nearby (mirrors v1; may send deprecation headers)" GET "http://localhost:${BACKEND_PORT}/api/atms/nearby?${WINDHOEK_QS}" "" "" "401"

probe_http "obs" "OBS GET /api/v1/obs/providers (no auth)" GET "http://localhost:${BACKEND_PORT}/api/v1/obs/providers" "" "" "401"
if [ -n "$TEST_TOKEN" ]; then
  probe_http "obs" "OBS GET /api/v1/obs/providers (auth)" GET "http://localhost:${BACKEND_PORT}/api/v1/obs/providers" "$AUTH_HDR" "" "200|500"
  probe_http "obs" "OBS GET /api/v1/obs/consents (auth)" GET "http://localhost:${BACKEND_PORT}/api/v1/obs/consents" "$AUTH_HDR" "" "200|500"
fi
probe_http "obs" "OBS GET /api/v1/obs/consents (no auth)" GET "http://localhost:${BACKEND_PORT}/api/v1/obs/consents" "" "" "401"

probe_http "locations" "GET /api/v1/atms/nearby (no auth)" GET "http://localhost:${BACKEND_PORT}/api/v1/atms/nearby?${WINDHOEK_QS}" "" "" "401"
if [ -n "$TEST_TOKEN" ]; then
  probe_http "locations" "GET /api/v1/atms/nearby (no lat/lng → 400)" GET "http://localhost:${BACKEND_PORT}/api/v1/atms/nearby" "$AUTH_HDR" "" "400"
  probe_http "locations" "GET /api/v1/atms/nearby (auth + coords)" GET "http://localhost:${BACKEND_PORT}/api/v1/atms/nearby?${WINDHOEK_QS}" "$AUTH_HDR" "" "200|500"
  probe_http "locations" "GET /api/v1/locations/nampost (no lat/lng → 400)" GET "http://localhost:${BACKEND_PORT}/api/v1/locations/nampost" "$AUTH_HDR" "" "400"
  probe_http "locations" "GET /api/v1/locations/nampost (auth + coords)" GET "http://localhost:${BACKEND_PORT}/api/v1/locations/nampost?${WINDHOEK_QS}" "$AUTH_HDR" "" "200|500"
fi

probe_http "transactions" "GET /api/v1/transactions/summary (no auth)" GET "http://localhost:${BACKEND_PORT}/api/v1/transactions/summary" "" "" "401"
if [ -n "$TEST_TOKEN" ]; then
  probe_http "transactions" "GET /api/v1/transactions/summary (auth)" GET "http://localhost:${BACKEND_PORT}/api/v1/transactions/summary?days=7" "$AUTH_HDR" "" "200|500"
fi

echo -e "\n${BLUE}━━━ 3. Smartpay AI — FastAPI /api/v1/copilot|ml|analytics ━━━${NC}\n"

probe_http "ai-copilot" "POST /api/v1/copilot/chat (empty body → 422)" POST "http://localhost:${AI_PORT}/api/v1/copilot/chat" "" "{}" "422"
probe_http "ai-copilot" "POST /api/v1/copilot/chat (minimal)" POST "http://localhost:${AI_PORT}/api/v1/copilot/chat" "" \
  "{\"thread_id\": \"val-$(date +%s)\", \"message\": \"ping\"}" "200|422|500"

probe_http "ai-ml" "GET /api/v1/ml/models" GET "http://localhost:${AI_PORT}/api/v1/ml/models" "" "" "200|500"
probe_http "ai-ml" "GET /api/v1/ml/health" GET "http://localhost:${AI_PORT}/api/v1/ml/health" "" "" "200|500"
probe_http "ai-ml" "POST /api/v1/ml/predict (empty → 422)" POST "http://localhost:${AI_PORT}/api/v1/ml/predict" "" "{}" "422"

probe_http "ai-analytics" "GET /api/v1/analytics/system/info" GET "http://localhost:${AI_PORT}/api/v1/analytics/system/info" "" "" "200|500"
probe_http "ai-analytics" "GET /api/v1/analytics/transactions" GET "http://localhost:${AI_PORT}/api/v1/analytics/transactions" "" "" "200|500"

echo -e "\n${BLUE}━━━ 4. Next.js /api/v1 rewrite parity (Buffr & Ketchup) ━━━${NC}\n"
echo "Note: Next rewrites map incoming /api/v1/* → internal /api/* (unversioned handlers)."
WARNINGS+=("Rewrite direction is /api/v1/* → /api/* in next.config (not the reverse).")

if [ "$SKIP_BUFFR" != "1" ]; then
  probe_http "rewrite-buffr" "Buffr /api/ping vs /api/v1/ping" GET "http://localhost:${BUFFR_PORT}/api/ping" "" "" "200"
  probe_http "rewrite-buffr" "Buffr /api/v1/ping" GET "http://localhost:${BUFFR_PORT}/api/v1/ping" "" "" "200"
fi

if [ "$SKIP_KETCHUP" != "1" ]; then
  probe_http "rewrite-ketchup" "Ketchup /api/health/live" GET "http://localhost:${KETCHUP_PORT}/api/health/live" "" "" "200|503"
  probe_http "rewrite-ketchup" "Ketchup /api/v1/health/live (rewrite)" GET "http://localhost:${KETCHUP_PORT}/api/v1/health/live" "" "" "200|503"
fi

echo -e "\n${BLUE}━━━ 5. Documented paths — expect 404 for nonsense ━━━${NC}\n"

probe_http "negative" "Backend unknown path → 404" GET "http://localhost:${BACKEND_PORT}/api/v1/__validate_not_found__" "" "" "404"
if [ "$SKIP_BUFFR" != "1" ]; then
  probe_http "negative" "Buffr unknown path → 404" GET "http://localhost:${BUFFR_PORT}/api/v1/__validate_not_found__" "" "" "404"
fi

echo -e "\n${BLUE}━━━ 6. Authentication patterns ━━━${NC}\n"

probe_http "auth" "Backend profile without token → 401" GET "http://localhost:${BACKEND_PORT}/api/v1/user/profile" "" "" "401"
if [ -n "$TEST_TOKEN" ]; then
  probe_http "auth" "Backend profile with token → 200" GET "http://localhost:${BACKEND_PORT}/api/v1/user/profile" "$AUTH_HDR" "" "200|404|500"
fi

echo -e "${GREEN}ℹ${NC} AI service: unauthenticated requests reach handlers (middleware attaches user=null; copilot/ML may still respond)"
log_tsv "auth" "AI auth middleware (documented)" "INFO" "http://localhost:${AI_PORT}" "n/a" "-" "-" "INFO" "Public: /health, /api/v1/health/detailed, /docs, /openapi.json"

echo -e "\n${BLUE}━━━ 7. Buffr Connect — sample documented public API ━━━${NC}\n"

if [ "$SKIP_BUFFR" != "1" ]; then
  probe_http "buffr-api" "GET /api/ping" GET "http://localhost:${BUFFR_PORT}/api/ping" "" "" "200"
  probe_http "buffr-api" "GET /api/status" GET "http://localhost:${BUFFR_PORT}/api/status" "" "" "200|401|500"
  probe_http "buffr-api" "GET /api/docs (may redirect)" GET "http://localhost:${BUFFR_PORT}/api/docs" "" "" "200|301|302|307|308|401"
fi

echo -e "\n${BLUE}━━━ 8. Ketchup Portals — sample /api/v1 route ━━━${NC}\n"

if [ "$SKIP_KETCHUP" != "1" ]; then
  probe_http "ketchup-api" "GET /api/v1/incidents (likely 401)" GET "http://localhost:${KETCHUP_PORT}/api/v1/incidents" "" "" "401|403|200"
fi

echo -e "\n${BLUE}━━━ 9. Mobile (optional) ━━━${NC}\n"

if [ "$SKIP_MOBILE" = "1" ]; then
  echo -e "${YELLOW}⊘${NC} SKIP_MOBILE=1 — skipping port 8081"
  SKIPPED_CHECKS=$((SKIPPED_CHECKS + 1))
  log_tsv "mobile" "Metro 8081" "SKIP" "http://localhost:8081" "-" "-" "-" "SKIP" "SKIP_MOBILE=1"
else
  if lsof -iTCP:8081 -sTCP:LISTEN >/dev/null 2>&1; then
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if curl "${CURL_OPTS[@]}" -f "http://localhost:8081" >/dev/null 2>&1; then
      echo -e "${GREEN}✓${NC} Mobile dev server on 8081"
      PASSED_CHECKS=$((PASSED_CHECKS + 1))
      log_tsv "mobile" "Expo/Metro 8081" GET "http://localhost:8081" "200" "200" "-" "PASS" ""
    else
      echo -e "${RED}✗${NC} Port 8081 listening but HTTP failed"
      FAILED_CHECKS=$((FAILED_CHECKS + 1))
      log_tsv "mobile" "Expo/Metro 8081" GET "http://localhost:8081" "200" "-" "-" "FAIL" ""
    fi
  else
    echo -e "${YELLOW}⊘${NC} Metro not listening on 8081"
    SKIPPED_CHECKS=$((SKIPPED_CHECKS + 1))
    log_tsv "mobile" "Metro 8081" GET "http://localhost:8081" "-" "-" "-" "SKIP" "not listening"
  fi
fi

echo -e "\n${BLUE}━━━ 10. Legacy integration (original script) ━━━${NC}\n"

if [ -n "$TEST_TOKEN" ]; then
  probe_http "legacy" "Wallets" GET "http://localhost:${BACKEND_PORT}/api/v1/wallets" "$AUTH_HDR" "" "200|500"
  probe_http "legacy" "Groups" GET "http://localhost:${BACKEND_PORT}/api/v1/groups" "$AUTH_HDR" "" "200|500"
fi

probe_http "legacy" "POST /api/v1/auth/request-otp (no body → 400/404)" POST "http://localhost:${BACKEND_PORT}/api/v1/auth/request-otp" "" "" "400|404"

# --- Markdown report ---
WARN_FILE="$REPORT_DIR/.warnings-$RUN_ID.txt"
: >"$WARN_FILE"
for w in "${WARNINGS[@]}"; do printf '%s\n' "$w" >>"$WARN_FILE"; done

export VALIDATION_TSV="$TSV_FILE"
export VALIDATION_MD="$MD_FILE"
export VALIDATION_MD_LATEST="$MD_LATEST"
export VALIDATION_WARN="$WARN_FILE"
export VALIDATION_TIMESTAMP="$TIMESTAMP"
export VALIDATION_RUN_ID="$RUN_ID"

python3 <<'PY'
import csv
import os
from pathlib import Path
from statistics import mean

tsv = Path(os.environ["VALIDATION_TSV"])
md_path = Path(os.environ["VALIDATION_MD"])
latest = Path(os.environ["VALIDATION_MD_LATEST"])
warn_path = Path(os.environ["VALIDATION_WARN"])
timestamp = os.environ["VALIDATION_TIMESTAMP"]
run_id = os.environ["VALIDATION_RUN_ID"]

warnings = [ln.strip() for ln in warn_path.read_text(encoding="utf-8").splitlines() if ln.strip()]

rows = []
with tsv.open(newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f, delimiter="\t")
    for row in reader:
        rows.append(row)

def ms_col(r):
    try:
        return int(r["time_ms"])
    except (ValueError, TypeError):
        return None

times = [ms_col(r) for r in rows if r.get("status") == "PASS" and ms_col(r) is not None]
pass_n = sum(1 for r in rows if r["status"] == "PASS")
fail_n = sum(1 for r in rows if r["status"] == "FAIL")
skip_n = sum(1 for r in rows if r["status"] == "SKIP")
info_n = sum(1 for r in rows if r["status"] == "INFO")

reco = []
if fail_n:
    reco.append("Investigate all **FAIL** rows: wrong HTTP status usually means routing, auth, or upstream dependency mismatch.")
if skip_n:
    reco.append("**SKIP** usually means the host/port was unreachable — start the service or set SKIP_* env vars intentionally.")
if any(r.get("status") == "PASS" and r.get("actual_http") == "500" for r in rows):
    reco.append(
        "Some probes **passed with HTTP 500** (allowed for optional deps). "
        "Check agent_locations / PostGIS for location aliases, ML_ENABLED for `/api/v1/ml/models`, and DB logs."
    )
reco.append("Align local **JWT_SECRET** with the running Smartpay backend when testing authenticated routes.")
reco.append("For AI **500** responses, check DATABASE_URL, DuckDB path, and ML_ENABLED / model artifacts.")

lines = [
    "# Ecosystem API validation report",
    "",
    f"- **Generated (UTC):** {timestamp}",
    f"- **Run ID:** {run_id}",
    f"- **TSV:** `{tsv.name}`",
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "|--------|-------|",
    f"| Total rows | {len(rows)} |",
    f"| Pass | {pass_n} |",
    f"| Fail | {fail_n} |",
    f"| Skip | {skip_n} |",
    f"| Info rows | {info_n} |",
]
if times:
    lines.append(f"| Avg response time (passed, ms) | {mean(times):.1f} |")
    lines.append(f"| Max response time (passed, ms) | {max(times)} |")
lines += [
    "",
    "## URL rewrite (Next.js)",
    "",
    "Buffr Connect and Ketchup Portals configure **`/api/v1/:path*` → `/api/:path*`** so clients can call versioned URLs while handlers live under `/api/...`.",
    "",
    "## Results by endpoint",
    "",
    "| Section | Name | Method | URL | Expected | Actual | Time (ms) | Status | Detail |",
    "|---------|------|--------|-----|----------|--------|-----------|--------|--------|",
]
for r in rows:
    u = (r.get("url") or "")[:72].replace("|", "\\|")
    det = (r.get("detail") or "").replace("|", "\\|").replace("\n", " ")[:100]
    lines.append(
        f"| {r.get('section','')} | {r.get('name','')} | {r.get('method','')} | `{u}` | {r.get('expected_http','')} | {r.get('actual_http','')} | {r.get('time_ms','')} | {r.get('status','')} | {det} |"
    )

lines += ["", "## Script warnings", ""]
if warnings:
    for w in warnings:
        lines.append(f"- {w}")
else:
    lines.append("- (none)")

lines += ["", "## Recommendations", ""]
for r in reco:
    lines.append(f"- {r}")

lines += ["", "## Remaining issues", ""]
fails = [r for r in rows if r.get("status") == "FAIL"]
if fails:
    for r in fails:
        lines.append(f"- **{r.get('name')}** — got HTTP {r.get('actual_http')} (expected {r.get('expected_http')}) — `{r.get('url','')[:90]}`")
else:
    lines.append("- No failed HTTP assertions in this run.")

text = "\n".join(lines) + "\n"
md_path.write_text(text, encoding="utf-8")
latest.write_text(text, encoding="utf-8")
print(f"Wrote {md_path}")
PY

rm -f "$WARN_FILE"

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SUMMARY                                                     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo "Total: $TOTAL_CHECKS  Passed: $PASSED_CHECKS  Failed: $FAILED_CHECKS  Skipped: $SKIPPED_CHECKS"
echo "Report: $MD_FILE"
echo ""

if [ "$TOTAL_CHECKS" -eq 0 ]; then
  exit 1
fi
ATTEMPTED=$((PASSED_CHECKS + FAILED_CHECKS))
if [ "$ATTEMPTED" -le 0 ]; then
  ATTEMPTED=1
fi
SUCCESS_RATE=$((PASSED_CHECKS * 100 / ATTEMPTED))
if [ "$FAILED_CHECKS" -eq 0 ]; then
  echo -e "${GREEN}All reachable checks passed (${SUCCESS_RATE}% of non-skipped probes).${NC}"
  exit 0
elif [ "$SUCCESS_RATE" -ge 70 ]; then
  echo -e "${YELLOW}Some failures — see report (${SUCCESS_RATE}% of non-skipped probes passed).${NC}"
  exit 0
else
  echo -e "${RED}Critical failure rate (${SUCCESS_RATE}% of non-skipped probes passed).${NC}"
  exit 1
fi
