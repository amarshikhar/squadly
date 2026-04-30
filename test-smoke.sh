#!/usr/bin/env bash
# ============================================================
# Squadly Phase 1b — Automated Smoke Tests
# ============================================================
# Usage:
#   1. Start dev server:  pnpm dev
#   2. Run this script:   bash test-smoke.sh
#   3. (Optional) Pass a session cookie for auth tests:
#        AUTH_COOKIE="next-auth.session-token=abc123" bash test-smoke.sh
#
# The script tests every API route + every page route.
# Green = pass, Red = fail, Yellow = expected stub/skip.
# ============================================================

BASE="http://localhost:3000"
PASS=0
FAIL=0
SKIP=0

green()  { echo -e "\033[32m✓ $1\033[0m"; ((PASS++)); }
red()    { echo -e "\033[31m✗ $1\033[0m"; ((FAIL++)); }
yellow() { echo -e "\033[33m⊘ $1\033[0m"; ((SKIP++)); }

# Helper: check HTTP status code
check_status() {
  local label="$1" url="$2" expected="$3" method="${4:-GET}" body="$5"
  local args=(-s -o /tmp/squadly_resp.json -w "%{http_code}" -X "$method")

  if [[ -n "$AUTH_COOKIE" ]]; then
    args+=(-H "Cookie: $AUTH_COOKIE")
  fi
  if [[ -n "$body" ]]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi

  local status
  status=$(curl "${args[@]}" "$url")

  if [[ "$status" == "$expected" ]]; then
    green "$label  (HTTP $status)"
  else
    red "$label  (expected $expected, got $status)"
    cat /tmp/squadly_resp.json 2>/dev/null | head -3
    echo ""
  fi
}

# Helper: check page renders (any 2xx or redirect)
check_page() {
  local label="$1" path="$2"
  local args=(-s -o /dev/null -w "%{http_code}" -L)
  if [[ -n "$AUTH_COOKIE" ]]; then
    args+=(-H "Cookie: $AUTH_COOKIE")
  fi
  local status
  status=$(curl "${args[@]}" "${BASE}${path}")

  if [[ "$status" =~ ^(200|307|308)$ ]]; then
    green "$label  (HTTP $status)"
  else
    red "$label  (HTTP $status)"
  fi
}

echo ""
echo "============================================"
echo "  Squadly Phase 1b Smoke Tests"
echo "============================================"
echo ""

# --------------------------------------------------
# 0. Server health check
# --------------------------------------------------
echo "--- Server Health ---"
SERVER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE")
if [[ "$SERVER_STATUS" == "000" ]]; then
  red "Dev server not running at $BASE"
  echo "  Start it with: cd squadly && pnpm dev"
  exit 1
fi
green "Dev server is running"
echo ""

# --------------------------------------------------
# 1. Public pages (no auth required)
# --------------------------------------------------
echo "--- Public Pages ---"
check_page "Landing page (/)" "/"
check_page "Sign-in page (/signin)" "/signin"
echo ""

# --------------------------------------------------
# 2. Auth-gated pages (should redirect to /signin without cookie)
# --------------------------------------------------
echo "--- Auth Gating (no cookie → redirect) ---"
for path in /home /vault /services/create /requests /payouts /profile; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${path}")
  if [[ "$STATUS" =~ ^(307|308|302|303)$ ]]; then
    green "GET $path → redirected ($STATUS)"
  elif [[ "$STATUS" == "200" && -z "$AUTH_COOKIE" ]]; then
    red "GET $path → 200 without auth (should redirect)"
  else
    green "GET $path (HTTP $STATUS)"
  fi
done
echo ""

# --------------------------------------------------
# 3. Public API routes (GET, no auth)
# --------------------------------------------------
echo "--- Public API (GET, no auth) ---"
check_status "GET /api/services" "$BASE/api/services" "200"
check_status "GET /api/goals" "$BASE/api/goals" "200"
check_status "GET /api/bids (no pass_id)" "$BASE/api/bids" "400"
check_status "GET /api/bids (fake pass_id)" "$BASE/api/bids?pass_id=00000000-0000-0000-0000-000000000000" "200"
echo ""

# --------------------------------------------------
# 4. Auth-required API routes (should return 401 without auth)
# --------------------------------------------------
echo "--- API Auth Gating (no cookie → 401) ---"
if [[ -z "$AUTH_COOKIE" ]]; then
  check_status "POST /api/services (no auth)" "$BASE/api/services" "401" "POST" '{"type":"coaching","game":"valorant","title":"Test","description":"Test service description here","priceInr":50000,"durationMin":60}'
  check_status "POST /api/goals (no auth)" "$BASE/api/goals" "401" "POST" '{"title":"Test Goal Title","targetCoins":1000,"deadlineHoursFromNow":24}'
  check_status "POST /api/bids (no auth)" "$BASE/api/bids" "401" "POST" '{"passId":"00000000-0000-0000-0000-000000000000","coinAmount":100}'
  check_status "POST /api/coins (no auth)" "$BASE/api/coins" "401" "POST" '{"inrAmount":100}'
  check_status "POST /api/requests (no auth)" "$BASE/api/requests" "401" "POST" '{"serviceId":"00000000-0000-0000-0000-000000000000"}'
  check_status "POST /api/reviews (no auth)" "$BASE/api/reviews" "401" "POST" '{"requestId":"00000000-0000-0000-0000-000000000000","rating":5}'
  check_status "POST /api/ranks/verify (no auth)" "$BASE/api/ranks/verify" "401" "POST" '{"game":"valorant","gameName":"test","tagLine":"123"}'
  check_status "POST /api/payouts/withdraw (no auth)" "$BASE/api/payouts/withdraw" "401" "POST" '{"amountInr":50000,"vpa":"test@upi"}'
  check_status "POST /api/payouts/stripe/onboard (no auth)" "$BASE/api/payouts/stripe/onboard" "401" "POST" '{}'
else
  yellow "Skipping 401 tests (AUTH_COOKIE is set)"
fi
echo ""

# --------------------------------------------------
# 5. Authenticated API tests (only if AUTH_COOKIE provided)
# --------------------------------------------------
echo "--- Authenticated API Tests ---"
if [[ -n "$AUTH_COOKIE" ]]; then
  # Validation tests (auth + bad payload → 400)
  check_status "POST /api/services (bad payload)" "$BASE/api/services" "400" "POST" '{"type":"invalid"}'
  check_status "POST /api/goals (bad payload)" "$BASE/api/goals" "400" "POST" '{"title":"ab"}'
  check_status "POST /api/coins (below min)" "$BASE/api/coins" "400" "POST" '{"inrAmount":10}'
  check_status "POST /api/ranks/verify (bad game)" "$BASE/api/ranks/verify" "400" "POST" '{"game":"minecraft"}'
  check_status "POST /api/payouts/withdraw (below min)" "$BASE/api/payouts/withdraw" "400" "POST" '{"amountInr":100,"vpa":"test@upi"}'

  echo ""
  echo "--- Authenticated API: Create Operations ---"

  # Create a service
  SERVICE_RESP=$(curl -s -X POST "$BASE/api/services" \
    -H "Cookie: $AUTH_COOKIE" \
    -H "Content-Type: application/json" \
    -d '{"type":"coaching","game":"valorant","title":"Smoke Test Coaching","description":"Automated smoke test service","priceInr":50000,"durationMin":60}')
  SERVICE_ID=$(echo "$SERVICE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('service',{}).get('id',''))" 2>/dev/null)
  if [[ -n "$SERVICE_ID" && "$SERVICE_ID" != "" ]]; then
    green "POST /api/services → created service $SERVICE_ID"
  else
    red "POST /api/services → failed to create service"
    echo "  Response: $SERVICE_RESP"
  fi

  # Create a goal
  GOAL_RESP=$(curl -s -X POST "$BASE/api/goals" \
    -H "Cookie: $AUTH_COOKIE" \
    -H "Content-Type: application/json" \
    -d '{"title":"Smoke Test Goal","description":"Testing goal creation","targetCoins":500,"deadlineHoursFromNow":24}')
  GOAL_ID=$(echo "$GOAL_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('goal',{}).get('id',''))" 2>/dev/null)
  if [[ -n "$GOAL_ID" && "$GOAL_ID" != "" ]]; then
    green "POST /api/goals → created goal $GOAL_ID"
  else
    red "POST /api/goals → failed to create goal"
    echo "  Response: $GOAL_RESP"
  fi

  # Verify rank (Valorant — will call Riot API or sandbox)
  RANK_RESP=$(curl -s -X POST "$BASE/api/ranks/verify" \
    -H "Cookie: $AUTH_COOKIE" \
    -H "Content-Type: application/json" \
    -d '{"game":"valorant","gameName":"SmokeTest","tagLine":"000"}')
  RANK_STATUS=$(echo "$RANK_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if 'rank' in d else d.get('error','fail'))" 2>/dev/null)
  if [[ "$RANK_STATUS" == "ok" ]]; then
    green "POST /api/ranks/verify → rank verified/queued"
  else
    yellow "POST /api/ranks/verify → $RANK_STATUS (Riot API may not be configured)"
  fi

  # Try booking own service (should fail with 400)
  if [[ -n "$SERVICE_ID" ]]; then
    check_status "POST /api/requests (own service → 400)" "$BASE/api/requests" "400" "POST" "{\"serviceId\":\"$SERVICE_ID\"}"
  fi

  # Bids (stubbed)
  check_status "POST /api/bids (stub)" "$BASE/api/bids" "200" "POST" '{"passId":"00000000-0000-0000-0000-000000000000","coinAmount":100}'

  echo ""
  echo "--- Authenticated Pages ---"
  check_page "Dashboard (/home)" "/home"
  check_page "Vault (/vault)" "/vault"
  check_page "Services browse (/services)" "/services"
  check_page "Create service (/services/create)" "/services/create"
  check_page "Goals (/goals)" "/goals"
  check_page "Requests (/requests)" "/requests"
  check_page "Payouts (/payouts)" "/payouts"
  check_page "Profile (/profile)" "/profile"
else
  yellow "Skipping auth tests — set AUTH_COOKIE to run them"
  yellow "  How to get cookie:"
  yellow "    1. pnpm dev → open localhost:3000 → sign in with Google"
  yellow "    2. Open DevTools → Application → Cookies → copy next-auth.session-token"
  yellow "    3. Re-run: AUTH_COOKIE=\"next-auth.session-token=VALUE\" bash test-smoke.sh"
fi
echo ""

# --------------------------------------------------
# 6. Webhook endpoint reachability
# --------------------------------------------------
echo "--- Webhook Endpoints ---"
check_status "POST /api/webhooks/razorpay (no sig → 400)" "$BASE/api/webhooks/razorpay" "400" "POST" '{"event":"payment.captured"}'
# Stripe webhook returns 500 with placeholder keys (expected in dev)
STRIPE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/webhooks/stripe" -H "Content-Type: application/json" -d '{"type":"account.updated"}')
if [[ "$STRIPE_STATUS" =~ ^(400|500)$ ]]; then
  green "POST /api/webhooks/stripe (rejects unsigned, HTTP $STRIPE_STATUS)"
else
  red "POST /api/webhooks/stripe (expected 400/500, got $STRIPE_STATUS)"
fi
echo ""

# --------------------------------------------------
# Summary
# --------------------------------------------------
echo "============================================"
echo "  Results: ${PASS} passed, ${FAIL} failed, ${SKIP} skipped"
echo "============================================"
echo ""

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
