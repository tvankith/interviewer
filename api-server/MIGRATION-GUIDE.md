# Migration Guide: Auth from Python/FastAPI to Node.js/Fastify

## Overview

This guide describes the process of migrating authentication from the Python/FastAPI backend (`server`) to the Node.js/Fastify backend (`api-server`). This consolidates two separate auth systems into a single service.

## Architecture Change

### Before (Dual Auth)
```
Frontend (Next.js)
    ├── OAuth with Supabase
    ├── Exchange code with Python backend (/auth/callback)
    └── Use Python backend for API calls
        
Python Backend (FastAPI)
    ├── Validate JWT tokens
    ├── Sync users to PostgreSQL
    ├── Return user data
    └── Manage profiles/resumes
```

### After (Consolidated Auth)
```
Frontend (Next.js)
    ├── OAuth with Supabase
    ├── Exchange code with Node.js backend (/api/auth/callback)
    └── Use Node.js backend for all API calls
        
Node.js Backend (Fastify)
    ├── Validate JWT tokens (HS256 & RS256)
    ├── Sync users to PostgreSQL
    ├── Return user data
    ├── Manage profiles/resumes
    └── Handle token refresh
```

## Implementation Status

### Completed
- ✅ JWT validation utilities (HS256 & RS256 with JWKS)
- ✅ Auth service with user sync
- ✅ Auth middleware with DB lookup
- ✅ Auth routes (/auth/login, /auth/callback, /auth/me, /auth/logout, /auth/refresh)
- ✅ Prisma schema updated with User model
- ✅ Database migration for User table
- ✅ Environment configuration

### Pending (Testing & Validation)
- ⏳ Manual testing with curl
- ⏳ Frontend integration testing
- ⏳ Code cleanup and type checking
- ⏳ Linter validation
- ⏳ Unit & integration test execution

## Step-by-Step Migration

### Phase 1: Preparation (Pre-Migration)

#### 1.1 Backup Data
```bash
# Export existing users from Python backend
# This ensures you have a record of all users before migration

pg_dump $DATABASE_URL -t users > users_backup.sql
```

#### 1.2 Set Up New Environment
```bash
# In api-server directory
cd api-server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Update .env with Supabase credentials:
# SUPABASE_URL=<your-supabase-url>
# SUPABASE_ANON_KEY=<your-anon-key>
# SUPABASE_JWT_SECRET=<your-jwt-secret>
# DATABASE_URL=<your-postgres-url>
```

#### 1.3 Run Database Migration
```bash
# Create User table in PostgreSQL
npx prisma migrate deploy

# Verify migration
npx prisma db push --skip-generate
```

#### 1.4 Sync Existing Users (Optional)
If you have existing users in the Python backend, sync them:

```bash
# Export users from Python backend
python scripts/export_users.py > users.json

# Import to Node.js backend
node scripts/import_users.js users.json
```

**Note:** The User model in api-server uses the Supabase UUID as the primary key (`id`), matching Supabase's auth ID. This differs from any custom ID scheme in the Python backend.

### Phase 2: Testing & Validation

#### 2.1 Start Both Services (Parallel Testing)
```bash
# Terminal 1: Python backend (for comparison)
cd server
python -m uvicorn main:app --reload

# Terminal 2: Node.js backend
cd api-server
npm run dev

# Terminal 3: Frontend
cd app
npm run dev
```

#### 2.2 Test Auth Flow in Node.js Backend
```bash
# Start api-server
npm run dev

# Test health endpoint
curl http://localhost:3002/health

# Test auth callback (requires valid Supabase tokens)
curl -X POST http://localhost:3002/api/auth/callback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid_token>" \
  -d '{"accessToken":"<token>","refreshToken":"<token>"}'

# Test protected endpoint
curl -X GET http://localhost:3002/api/auth/me \
  -H "Authorization: Bearer <valid_token>"
```

For detailed testing procedures, see [AUTH-TESTING-MANUAL.md](AUTH-TESTING-MANUAL.md).

#### 2.3 Frontend Testing
- [ ] OAuth sign-in with Google works
- [ ] Frontend receives tokens from Supabase
- [ ] Frontend calls `/api/auth/callback` successfully
- [ ] Backend sets httpOnly cookies
- [ ] Protected endpoints work with cookies
- [ ] Token refresh works on 401
- [ ] Logout clears cookies

### Phase 3: Cutover

#### 3.1 Update Frontend Configuration
```typescript
// Update frontend to use new auth endpoint
// In your Next.js environment or config

const API_URL = 'http://localhost:3002'; // Changed from server URL

// Update auth callback to point to new backend
const authCallbackUrl = `${API_URL}/api/auth/callback`;
```

#### 3.2 Update Route Registrations
Verify in `api-server/src/main.ts` that all auth routes are registered:

```typescript
await fastify.register(authRoutes); // Auth endpoints
await fastify.register(profileRoutes); // Profile endpoints
await fastify.register(resumeTemplateRoutes); // Resume endpoints
```

#### 3.3 Verify Protected Routes
Ensure all protected routes use the auth middleware:

```typescript
// In route handlers
fastify.get('/api/profile', 
  { preHandler: authGuard }, // Requires auth
  async (request, reply) => { }
);

fastify.get('/api/resume',
  { preHandler: authGuard }, // Requires auth
  async (request, reply) => { }
);
```

#### 3.4 Monitor Logs
Watch server logs for errors:
```bash
npm run dev  # Shows logs in console
```

**Expected Log Entries:**
- `oauth_callback_received` - User signed in
- `user_synced` - User created/updated in database
- `token_refresh_success` - Token refreshed
- No `auth_guard_failed` errors for valid tokens

### Phase 4: Validation

#### 4.1 Smoke Tests
```bash
# Test core auth flows
npm run test  # Run unit tests

# Test type safety
npm run type-check

# Test linting
npm run lint
```

#### 4.2 Performance Validation
- [ ] JWKS cache working (keys fetched once per hour)
- [ ] Database lookups < 10ms
- [ ] Token validation < 5ms
- [ ] No memory leaks under load
- [ ] Request tracing logs are clean

#### 4.3 Security Validation
- [ ] Cookies are httpOnly
- [ ] Cookies are secure (production)
- [ ] Cookies have sameSite=lax
- [ ] CORS headers correct
- [ ] No tokens in URLs or logs
- [ ] Error messages don't leak sensitive data

### Phase 5: Decommission Python Backend (Optional)

Only do this after successful testing and validation:

```bash
# 1. Update frontend to use only Node.js backend
# 2. Run parallel testing for 1-2 weeks
# 3. Verify all users can authenticate
# 4. Archive Python backend code
# 5. Stop Python backend service
# 6. Update DNS/load balancer to remove Python backend

# Backup Python backend before decommissioning
git tag -a v1.0-archived-auth-python -m "Python backend before auth migration"
```

## Troubleshooting

### Issue: "User not found" after login

**Cause:** User was created in Python backend but not synced to Node.js backend.

**Solution:**
```bash
# Check if user exists in database
npx prisma studio

# If missing, sync manually
node scripts/import_users.js users.json
```

### Issue: "Token validation failed" in Node.js backend

**Cause:** SUPABASE_JWT_SECRET not set for HS256 tokens.

**Solution:**
```bash
# Update .env
SUPABASE_JWT_SECRET=<your-jwt-secret>

# Restart server
npm run dev
```

### Issue: CORS error when frontend calls backend

**Cause:** FRONTEND_ORIGIN not matching frontend URL.

**Solution:**
```bash
# Update .env
FRONTEND_ORIGIN=http://localhost:3000  # for dev
# or
FRONTEND_ORIGIN=https://app.example.com  # for prod

# Restart server
npm run dev
```

### Issue: Cookies not persisting

**Cause:** Frontend not sending `credentials: 'include'`.

**Solution:**
```typescript
// In frontend API calls
const response = await fetch('http://localhost:3002/api/auth/me', {
  method: 'GET',
  credentials: 'include', // Add this
});
```

## Rollback Plan

If issues occur during migration:

1. **Keep Python backend running** during parallel testing phase
2. **Update frontend to use Python backend** if critical issues arise
3. **Investigate issues** in Node.js backend
4. **Fix and retry** after validation
5. **Test again** before final cutover

Rollback is straightforward since both backends use the same database and Supabase auth.

## Database Considerations

### Schema Differences

**Python Backend User Schema:**
```python
class User(Base):
    __tablename__ = "users"
    id = Column(UUID, primary_key=True)  # Custom UUID
    email = Column(String, unique=True)
    name = Column(String)
    # ... other fields
```

**Node.js Backend User Schema:**
```prisma
model User {
  id        String   @id  // Supabase UUID
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Migration Note:** The Node.js backend uses only essential fields (id, email). If you need to preserve additional user data, update the Prisma schema and create a migration:

```bash
# Update schema
# Then run
npx prisma migrate dev --name add_user_fields
```

### Concurrent Writes

During parallel testing, both backends write to the same database:
- Python backend writes to custom tables (profiles, resumes, etc.)
- Node.js backend writes to auth tables (users)
- No conflicts expected as long as they use different tables

After migration, only Node.js backend writes to the database.

## Deployment

### Development
```bash
cd api-server
npm run dev
```

### Production
```bash
# Build
npm run build

# Start
npm start

# Or with Docker (if using Docker)
docker build -t api-server .
docker run -p 3002:3002 \
  -e DATABASE_URL="..." \
  -e SUPABASE_URL="..." \
  -e SUPABASE_ANON_KEY="..." \
  api-server
```

**Production Environment Variables:**
- `NODE_ENV=production`
- `SUPABASE_URL=<production-url>`
- `SUPABASE_ANON_KEY=<production-key>`
- `DATABASE_URL=<production-postgres>`
- `JWT_SECRET=<production-secret>` (fallback)
- `FRONTEND_ORIGIN=<production-frontend-url>`
- `API_SERVER_URL=<production-api-url>`

## Monitoring & Alerting

### Key Metrics to Monitor
- Auth success/failure rate
- Token validation latency
- Database lookup latency
- Error rate
- JWKS cache hit rate

### Log Patterns to Watch
```
# Normal
oauth_callback_success
user_synced
token_refresh_success
auth_guard_success

# Errors to investigate
auth_guard_failed
oauth_exchange_failed
user_sync_failed
token_refresh_error
```

## Timeline

Typical migration timeline:

| Phase | Duration | Tasks |
|-------|----------|-------|
| Preparation | 1 day | Setup environment, run migrations |
| Testing | 3-5 days | Manual testing, frontend integration |
| Parallel Running | 1-2 weeks | Both backends in production, monitor |
| Cutover | 1 day | Switch frontend to Node.js only |
| Validation | 3-5 days | Monitor logs, test all flows |
| Decommission | 1 day | Archive Python backend |

## Checklist

- [ ] Database backup created
- [ ] Environment variables set in .env
- [ ] Database migrations run successfully
- [ ] API server starts without errors
- [ ] Health endpoint responds
- [ ] Manual tests pass (all 4 test cases)
- [ ] Frontend integration tests pass
- [ ] No linter errors
- [ ] No type checking errors
- [ ] Unit tests pass
- [ ] Parallel testing in production (if applicable)
- [ ] Frontend updated to use new auth endpoint
- [ ] Logs monitored and clean
- [ ] Python backend decommissioned (optional)

## References

- [Auth Implementation Guide](AUTH-IMPLEMENTATION-COMPLETE.md)
- [Manual Testing Guide](AUTH-TESTING-MANUAL.md)
- [API Documentation](./swagger) (at /swagger endpoint)
- [Supabase Documentation](https://supabase.com/docs)
- [Fastify Documentation](https://www.fastify.io/docs/latest/)
