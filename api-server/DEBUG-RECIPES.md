# Debug Recipes - Common Debugging Scenarios

Quick command reference for common debugging tasks.

## General Setup

Start with debug logging enabled:
```bash
LOG_LEVEL=debug npm run dev
```

## 1. Debugging OAuth Login Flow

**Symptom:** OAuth login fails or redirects unexpectedly

```bash
# View all OAuth events
LOG_LEVEL=debug npm run dev 2>&1 | grep -E "(oauth|auth)"

# View with timestamps
LOG_LEVEL=debug npm run dev 2>&1 | jq 'select(.event | contains("oauth"))'

# Trace a specific correlation ID (get it from browser console or client logs)
npm run dev 2>&1 | grep "YOUR_CORRELATION_ID"
```

**Key events to look for:**
- `oauth_login_initiated` - Step 1
- `oauth_redirect_generated` - Step 2 (check if URL is correct)
- `oauth_callback_received` - Step 3 (should have authorization code)
- `oauth_exchange_success` - Step 4 (Supabase returned tokens)
- `user_synced` - Step 5 (user saved to database)
- `oauth_callback_success` - Step 6 (final success)

**Example log analysis:**
```json
// ✅ Good - Each step succeeds
{ "event": "oauth_exchange_success", "duration": 250, "userId": "user-123" }
{ "event": "user_synced", "duration": 45, "userId": "user-123" }
{ "event": "oauth_callback_success" }

// ❌ Bad - Exchange fails
{ "event": "oauth_exchange_failed", "error": "INVALID_CODE", "duration": 150 }
```

---

## 2. Debugging Token Validation Issues

**Symptom:** Protected endpoints return 401 Unauthorized

```bash
# View all auth guard events
LOG_LEVEL=debug npm run dev 2>&1 | grep "auth_guard"

# Show failures only
npm run dev 2>&1 | jq 'select(.event == "auth_guard_failed")'

# Show all auth errors with details
npm run dev 2>&1 | jq 'select(.event | contains("auth")) | select(.level >= 40)'
```

**What's logged:**
```json
// ✅ Success
{ "event": "auth_guard_success", "userId": "user-123", "duration": 15 }

// ❌ Failure scenarios
{ "event": "auth_guard_failed", "reason": "missing_token" }
{ "event": "auth_guard_failed", "reason": "invalid_payload" }
{ "event": "auth_guard_failed", "reason": "user_not_found", "userId": "user-123" }
{ "event": "auth_guard_error", "error": "Token expired" }
```

**Debugging steps:**
1. Check the token exists: `reason: "missing_token"` → token not in header or cookies
2. Check token format: `reason: "invalid_payload"` → JWT is malformed
3. Check user in DB: `reason: "user_not_found"` → user ID not synced

---

## 3. Debugging Slow Requests

**Symptom:** Some requests are unusually slow

```bash
# Show all requests slower than 1000ms
npm run dev 2>&1 | jq 'select(.duration > 1000)'

# Show slow requests with details
npm run dev 2>&1 | jq 'select(.duration > 1000) | {method, path, duration, status}'

# Show detailed slow requests with all context
npm run dev 2>&1 | jq 'select(.event == "http_request_complete" and .duration > 500)'
```

**Example output:**
```json
{
  "method": "GET",
  "path": "/api/auth/callback",
  "status": 302,
  "duration": 1250,
  "event": "http_request_complete"
}
```

**Analysis:**
- 1000-2000ms: Acceptable (usually due to OAuth exchange)
- 2000+ms: Investigate (check database performance, network latency)

---

## 4. Debugging Database Operations

**Symptom:** User not synced to database

```bash
# View all database operations
LOG_LEVEL=debug npm run dev 2>&1 | jq 'select(.event == "db_operation")'

# View failed operations
npm run dev 2>&1 | jq 'select(.event == "db_operation" and .success == false)'

# View user sync specifically
npm run dev 2>&1 | grep -E "(user_synced|user_sync_failed)"
```

**Expected flow:**
```json
{ "event": "user_synced", "userId": "user-123", "duration": 45 }
```

**Error cases:**
```json
{ "event": "user_sync_failed", "userId": "user-123", "error": "Unique constraint failed" }
```

---

## 5. Debugging Token Refresh

**Symptom:** Token refresh fails or doesn't set new cookies

```bash
# View all token refresh events
npm run dev 2>&1 | grep -E "(refresh|token)"

# View refresh specifically
LOG_LEVEL=debug npm run dev 2>&1 | jq 'select(.event | contains("refresh"))'

# View refresh failures
npm run dev 2>&1 | jq 'select(.event | contains("refresh") and .success == false)'
```

**Expected success:**
```json
{ "event": "token_refresh_success", "duration": 300 }
```

**Common failures:**
```json
{ "event": "refresh_token_missing", "attemptedSources": ["header", "body", "cookie"] }
{ "event": "refresh_session_failed", "error": "Refresh token expired" }
```

---

## 6. Debugging Cookie Issues

**Symptom:** Cookies not being set or sent

```bash
# Check cookie headers in full request logging
LOG_LEVEL=debug npm run dev 2>&1 | jq 'select(.event == "http_request_start") | .headers'

# Check all Set-Cookie responses
npm run dev 2>&1 | grep -i "setcookie"

# View logout (should clear cookies)
npm run dev 2>&1 | grep "logout"
```

**Enable debug for auth routes to see cookie details:**
```bash
LOG_LEVEL=debug npm run dev 2>&1 | grep -E "(oauth_callback|logout|refresh)" | jq '{event, cookies: .headers.cookie}'
```

---

## 7. Debugging Specific User

**Symptom:** One user having issues

Get correlation ID or user ID, then:

```bash
# By correlation ID (from browser Network tab)
npm run dev 2>&1 | grep "550e8400-e29b-41d4-a716-446655440000"

# By user ID
npm run dev 2>&1 | grep "user-123"

# By email
npm run dev 2>&1 | grep "user@example.com"

# Combined: all events for a user with timing
npm run dev 2>&1 | jq 'select(.userId == "user-123") | {timestamp, event, duration}'
```

---

## 8. Debugging OAuth Redirect Issues

**Symptom:** OAuth redirects to wrong URL or doesn't redirect

```bash
# View OAuth URLs
LOG_LEVEL=debug npm run dev 2>&1 | jq 'select(.event == "oauth_login_initiated") | .redirectUrl'

# View full OAuth exchange
npm run dev 2>&1 | jq 'select(.event | contains("oauth")) | {event, url: .redirectUrl, error}'

# Check final redirect
npm run dev 2>&1 | grep "oauth_callback_success" | jq '{redirectUrl}'
```

---

## 9. Debugging External Service Failures

**Symptom:** Supabase or external API calls fail

```bash
# View external requests
LOG_LEVEL=debug npm run dev 2>&1 | jq 'select(.event == "external_request")'

# View failures only
npm run dev 2>&1 | jq 'select(.event == "external_request" and .success == false)'

# Show slow external requests
npm run dev 2>&1 | jq 'select(.event == "external_request" and .duration > 500)'
```

**Common failures:**
```json
{ "event": "external_request", "service": "supabase", "error": "JWKS fetch failed" }
```

---

## 10. Real-Time Log Tailing

**Watch logs and filter as they come in:**

```bash
# Watch all errors
npm run dev 2>&1 | grep -i error

# Watch and colorize errors
npm run dev 2>&1 | grep -E "(error|failed|Error)" | sed 's/^/\x1b[31m/' | sed 's/$/\x1b[0m/'

# Follow only auth events
npm run dev 2>&1 | grep -E "(auth|oauth|token|login)" --line-buffered

# Update in real-time with jq
npm run dev 2>&1 | jq -r 'select(.level >= 40) | "\(.timestamp) [\(.level)] \(.event): \(.message)"' --unbuffered
```

---

## 11. Generating Test Logs

**Create realistic log patterns for testing:**

```bash
# Generate login logs
curl http://localhost:3002/auth/login

# Generate callback with mock code (will fail, but creates logs)
curl 'http://localhost:3002/auth/callback?code=invalid&redirect_url=http://localhost:3000'

# Try protected endpoint without auth (creates 401 logs)
curl http://localhost:3002/auth/me

# Logout
curl -X POST http://localhost:3002/auth/logout
```

---

## 12. Performance Analysis

**Find performance bottlenecks:**

```bash
# Average request duration
npm run dev 2>&1 | jq 'select(.event == "http_request_complete") | .duration' | awk '{sum+=$1; count++} END {print "Average:", sum/count, "ms"}'

# Slowest endpoints
npm run dev 2>&1 | jq 'select(.event == "http_request_complete") | {path, duration, status}' | sort -t: -k3 -rn | head -20

# Auth operation duration breakdown
npm run dev 2>&1 | jq 'select(.event | contains("auth") or contains("oauth")) | {event, duration}'
```

---

## Quick Command Reference

| Task | Command |
|------|---------|
| Debug everything | `LOG_LEVEL=debug npm run dev` |
| OAuth flow only | `npm run dev 2>&1 \| grep -E "(oauth\|auth)"` |
| Slow requests | `npm run dev 2>&1 \| jq 'select(.duration > 1000)'` |
| Errors only | `npm run dev 2>&1 \| jq 'select(.level >= 40)'` |
| By correlation ID | `npm run dev 2>&1 \| grep "CORRELATION_ID"` |
| By user ID | `npm run dev 2>&1 \| grep "user-123"` |
| Token issues | `npm run dev 2>&1 \| grep -E "(auth_guard\|token)"` |
| Database operations | `npm run dev 2>&1 \| jq 'select(.event == "db_operation")'` |
| Cookie issues | `npm run dev 2>&1 \| jq '.headers \| select(.cookie)'` |
| Failures | `npm run dev 2>&1 \| jq 'select(.success == false)'` |

---

## Tips

1. **Copy correlation ID from browser:** Open DevTools → Network → request → Response Headers → `x-correlation-id`
2. **Pretty print JSON:** Pipe to `jq` for readable output
3. **Filter by level:** `jq 'select(.level == 50)'` (50=error, 40=warn, 30=info, 20=debug)
4. **Save logs to file:** `npm run dev 2>&1 | tee debug.log`
5. **Search logs:** `grep -r "error" debug.log`
6. **Color output:** Use `jq -C` for colored JSON
