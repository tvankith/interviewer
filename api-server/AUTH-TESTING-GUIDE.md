# Authentication Testing Guide

## Prerequisites

1. Node.js 18+
2. npm dependencies installed: `npm install`
3. Valid Supabase credentials in `.env`
4. Running PostgreSQL database (via Supabase)

## Unit Tests

Run unit tests for auth utilities:

```bash
npm run test -- src/utils/__tests__/auth.test.ts
```

### What's Tested

- **extractBearerToken()**: Valid/invalid header formats
- **decodeAccessToken()**: HS256 and RS256 token validation, expiration, invalid signatures
- **getTokenPayload()**: End-to-end token extraction and validation

## Integration Tests

Run integration tests for auth routes:

```bash
npm run test -- src/routes/__tests__/auth.test.ts
```

### What's Tested

- **GET /auth/login**: OAuth redirect generation
- **GET /auth/callback**: Code exchange, user sync, cookie setting
- **GET /auth/me**: Authentication verification
- **POST /auth/logout**: Cookie clearing
- **POST /auth/refresh**: Token refresh flow

## Manual Testing (Browser)

### 1. Start the server

```bash
npm run dev
```

Server runs on `http://localhost:3002`

### 2. Test OAuth Login Flow

1. Navigate to: `http://localhost:3002/auth/login`
2. Should redirect to Supabase OAuth login page
3. Login with test Google account
4. Should redirect back to `http://localhost:3000` (FRONTEND_ORIGIN)
5. Verify cookies set in browser DevTools:
   - `access_token` (httpOnly)
   - `refresh_token` (httpOnly)

### 3. Test GET /auth/me

1. After login, call the endpoint:
   ```bash
   curl http://localhost:3002/auth/me \
     -H "Cookie: access_token=YOUR_TOKEN_HERE"
   ```

   Or with Authorization header:
   ```bash
   curl http://localhost:3002/auth/me \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

2. Should return:
   ```json
   {
     "id": "550e8400-e29b-41d4-a716-446655440000",
     "email": "user@example.com"
   }
   ```

### 4. Test Protected Endpoints

Test that profile endpoints require authentication:

```bash
# Without token - should return 401
curl http://localhost:3002/api/profile

# With token from cookie - should work
curl http://localhost:3002/api/profile \
  -H "Cookie: access_token=YOUR_TOKEN_HERE"
```

### 5. Test Token Refresh

1. Get a refresh token from login (stored in cookie)
2. Call refresh endpoint:
   ```bash
   curl -X POST http://localhost:3002/auth/refresh \
     -H "Authorization: Bearer YOUR_REFRESH_TOKEN_HERE"
   ```

   Or via body:
   ```bash
   curl -X POST http://localhost:3002/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refresh_token": "YOUR_REFRESH_TOKEN_HERE"}'
   ```

3. Should return new tokens:
   ```json
   {
     "ok": true,
     "access_token": "new_access_token_jwt",
     "refresh_token": "new_refresh_token_jwt"
   }
   ```

### 6. Test Logout

```bash
curl -X POST http://localhost:3002/auth/logout \
  -H "Cookie: access_token=YOUR_TOKEN_HERE"
```

Should return:
```json
{
  "message": "Logged out"
}
```

And verify cookies are cleared.

## Environment Variables for Testing

Create a `.env.test` or update `.env` with test values:

```env
# Use a test Supabase project
SUPABASE_URL=https://test-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=your-test-jwt-secret

# Use test database (preferably separate from production)
DATABASE_URL=postgresql://test:password@localhost:5432/test_db

NODE_ENV=development
```

## Debugging

### Enable Debug Logging

```bash
LOG_LEVEL=debug npm run dev
```

### Check JWT Token Contents

Use https://jwt.io to decode tokens and verify:
- `sub` claim matches user ID
- `exp` claim shows expiration time
- `email` claim has user email
- Signature verifies with SUPABASE_JWT_SECRET

### Database Issues

Check if User table exists:

```sql
SELECT * FROM "User" LIMIT 5;
```

If migration hasn't run:

```bash
npx prisma migrate deploy
```

## Common Issues

### 401 Unauthorized on Protected Endpoints

1. Check token is not expired
2. Verify SUPABASE_JWT_SECRET matches Supabase project settings
3. Check User record exists in database for token's user ID

### Cookie Not Setting

1. Verify `@fastify/cookie` plugin registered before routes
2. Check `NODE_ENV=development` for insecure cookies (localhost)
3. Browser DevTools → Application → Cookies: verify domain and path

### JWKS Endpoint Unreachable

1. Verify SUPABASE_URL is correct
2. Check network/firewall allows access to `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
3. Verify RS256 tokens are used (not HS256) when JWKS fails

## Test Checklist

Before shipping to production:

- [ ] Unit tests pass: `npm run test`
- [ ] Integration tests pass: `npm run test`
- [ ] Type checking passes: `npm run type-check`
- [ ] Linting passes: `npm run lint`
- [ ] OAuth login flow works end-to-end
- [ ] Protected endpoints return 401 without auth
- [ ] Token expiration handled correctly
- [ ] Cookies set with secure flags
- [ ] Logout clears cookies
- [ ] Frontend can authenticate with new api-server
- [ ] No breaking changes to existing APIs
