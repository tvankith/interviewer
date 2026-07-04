# Logging Guide for API Server

## Overview

The API server uses a structured logging system powered by [Pino](https://getpino.io/) with automatic request tracking, correlation IDs, and performance monitoring.

## Configuration

### Log Levels

Set the `LOG_LEVEL` environment variable to control verbosity:

```env
LOG_LEVEL=debug    # Detailed debugging (includes all events)
LOG_LEVEL=info     # Standard logging (default)
LOG_LEVEL=warn     # Warnings and errors only
LOG_LEVEL=error    # Errors only
```

### Development vs Production

- **Development** (`NODE_ENV=development`): Pretty-printed logs with colors
- **Production** (`NODE_ENV=production`): JSON-formatted logs for log aggregation services

Example `.env`:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

## Features

### 1. Automatic Request Logging

Every HTTP request is logged with metadata:

```
GET /api/auth/login
Slow request: GET /api/auth/login took 1250ms
```

**Logged fields:**
- `method` - HTTP method (GET, POST, etc.)
- `path` - Request path
- `status` - Response status code
- `duration` - Total request time in milliseconds
- `correlationId` - Unique ID for tracing requests across services

### 2. Correlation IDs

Every request gets a unique correlation ID for tracing:

```json
{
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "requestId": "req-1",
  "event": "http_request_complete"
}
```

**Sources (in order of precedence):**
1. `X-Correlation-ID` header (if provided by client)
2. Auto-generated UUID (if not provided)

**Response headers:**
- `X-Correlation-ID` - Echoed back to client
- `X-Request-ID` - Fastify's internal request ID

### 3. Structured Events

All events are logged as JSON with consistent structure:

```json
{
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "requestId": "req-1",
  "event": "auth_callback_success",
  "userId": "user-123",
  "email": "user@example.com",
  "redirectUrl": "http://localhost:3000",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

## Common Events

### Authentication Events

#### OAuth Login Flow
```
oauth_login_initiated        - User starts OAuth login
oauth_redirect_generated     - OAuth URL generated
oauth_callback_received      - OAuth callback endpoint called
oauth_exchange_success       - Code exchanged for session tokens
oauth_exchange_failed        - Exchange failed (invalid code, etc.)
user_synced                  - User synced to database
oauth_callback_success       - Entire callback flow succeeded
oauth_callback_error         - Callback failed with exception
```

#### Token Validation
```
auth_guard_success           - User authenticated successfully
auth_guard_failed            - Authentication failed (missing token, user not found, etc.)
auth_guard_error             - Unexpected error during auth
optional_auth                - Optional auth attempt (may fail silently)
token_validation             - Low-level JWT validation
```

#### Logout & Refresh
```
logout_success               - User logged out successfully
logout_error                 - Logout failed
token_refresh_success        - Access token refreshed
refresh_session_failed       - Refresh failed (invalid token, etc.)
refresh_token_error          - Exception during refresh
```

### HTTP Events
```
http_request_start           - Request received
http_request_complete        - Request completed
http_error                   - HTTP error (4xx/5xx)
```

## Using Logs in Development

### 1. View All Logs
```bash
npm run dev
```

Logs appear in the terminal with colors and formatting.

### 2. Debug a Specific Feature
```bash
LOG_LEVEL=debug npm run dev
```

Shows detailed debugging logs for all operations.

### 3. Filter by Correlation ID
When debugging a user's session, use the correlation ID:

```bash
# In one terminal
npm run dev | grep "550e8400-e29b-41d4-a716-446655440000"
```

### 4. Enable Debug Logs for Auth Flow
```bash
LOG_LEVEL=debug npm run dev | grep -E "(oauth|auth_guard|token)"
```

## Using Logs in Production

### Log Aggregation

Logs are formatted as JSON for easy parsing by log aggregation services:

```bash
# Example with ELK Stack, Datadog, or similar
npm run dev 2>&1 | jq 'select(.event=="oauth_callback_success")'
```

### Performance Monitoring

Look for slow requests:

```bash
# Find requests slower than 1000ms
npm run dev 2>&1 | jq 'select(.duration > 1000)'
```

### Error Tracking

Find all errors:

```bash
# Find all errors
npm run dev 2>&1 | jq 'select(.level == 50)'  # level 50 = error
```

## Structured Error Logging

Errors include full context:

```json
{
  "level": 50,
  "event": "oauth_callback_error",
  "error": "INVALID_CREDENTIALS",
  "stack": "Error: INVALID_CREDENTIALS\n    at fetchJWKS (/app/src/utils/auth.ts:54:15)",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

## Security Considerations

### Sensitive Data Redaction

The following headers are automatically redacted in logs:

- `authorization`
- `cookie`
- `x-api-key`
- `x-auth-token`
- `password`
- `token`

These appear as `[REDACTED]` in logs.

### No Request/Response Bodies

By default, request and response bodies are NOT logged to prevent leaking sensitive data. This is intentional.

## Adding Logs to New Code

### Basic Logging

Use `request.log` in route handlers:

```typescript
export async function myRoute(request: FastifyRequest, reply: FastifyReply) {
  request.log.info({ event: 'my_operation' }, 'Starting operation');
  
  try {
    const result = await doSomething();
    request.log.debug({ event: 'my_operation_complete' }, 'Operation succeeded');
    reply.send(result);
  } catch (err) {
    request.log.error({ event: 'my_operation_error', error: err.message }, 'Operation failed');
    reply.status(500).send({ error: 'Failed' });
  }
}
```

### Performance Tracking

Measure operation duration:

```typescript
const startTime = Date.now();
const result = await expensiveOperation();
const duration = Date.now() - startTime;

if (duration > 1000) {
  request.log.warn({ event: 'slow_operation', duration }, 'Operation took longer than expected');
} else {
  request.log.debug({ event: 'operation_complete', duration }, 'Operation completed');
}
```

### Structured Context

Always include relevant context:

```typescript
request.log.info(
  {
    event: 'user_created',
    userId: user.id,
    email: user.email,
    source: 'oauth',
  },
  'User created via OAuth'
);
```

## Troubleshooting

### Logs not appearing?

1. Check `LOG_LEVEL` is not set to a higher level than your message
   - `error` messages only show if LOG_LEVEL=error
   - `debug` messages only show if LOG_LEVEL=debug

2. Verify stderr is being captured (logs go to stderr, not stdout)
   ```bash
   npm run dev 2>&1 | grep your-search
   ```

3. Check Pino is configured correctly in `src/main.ts`

### Too many logs?

Set LOG_LEVEL higher:
```bash
LOG_LEVEL=warn npm run dev
```

Or filter in post-processing:
```bash
npm run dev 2>&1 | jq 'select(.event == "specific_event")'
```

### Need correlation across services?

Pass the `X-Correlation-ID` header when calling other services:

```typescript
const correlationId = request.correlationId;
const response = await fetch('http://another-service/api/endpoint', {
  headers: {
    'X-Correlation-ID': correlationId,
  },
});
```

## Log Levels Reference

| Level | Value | Use Case |
|-------|-------|----------|
| debug | 20 | Detailed diagnostic info (request parsing, token validation, etc.) |
| info | 30 | General informational messages (user actions, major operations) |
| warn | 40 | Warning conditions (slow requests, auth failures, etc.) |
| error | 50 | Error conditions (exceptions, HTTP 5xx, etc.) |
| fatal | 60 | Fatal errors (reserved for system failures) |

## Example: Tracing an OAuth Flow

To trace a complete OAuth login:

1. User clicks "Login" → correlationId created
2. `oauth_login_initiated` logged
3. `oauth_redirect_generated` logged
4. User redirected to Supabase
5. Supabase redirects back with code
6. `oauth_callback_received` logged
7. `oauth_exchange_success` logged
8. `user_synced` logged
9. `oauth_callback_success` logged

All events share the same `correlationId`, allowing you to trace the entire flow:

```bash
npm run dev | grep "550e8400-e29b-41d4-a716-446655440000"
```
