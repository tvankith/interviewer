# Authentication System - Startup Checklist

## Before Running the Server

### 1. Verify Node.js Version
```bash
node --version
# Should be v24+ (has native WebSocket support)
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Verify Environment Variables
Check `.env` contains:
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_ANON_KEY` - Your Supabase public key
- [ ] `SUPABASE_JWT_SECRET` - Your Supabase JWT secret
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `FRONTEND_ORIGIN` - Frontend URL (e.g., http://localhost:3000)

### 4. Run Database Migration
```bash
npx prisma migrate deploy
```

This creates the User table that auth will use.

### 5. Start the Server
```bash
npm run dev
```

Expected output:
```
Server running at http://0.0.0.0:3002
```

## Quick Test After Starting

### Test OAuth Login Endpoint
```bash
curl -L http://localhost:3002/auth/login
```

Should redirect to Supabase login page (check for 302 redirect).

### Test Health Check
```bash
curl http://localhost:3002/health
```

Should return:
```json
{"status":"ok"}
```

### Test Protected Endpoint Without Auth
```bash
curl http://localhost:3002/auth/me
```

Should return 401 Unauthorized (expected).

## Common Issues & Fixes

### "SUPABASE_URL and SUPABASE_ANON_KEY are required"
- Check `.env` has both variables set
- Verify you're on the correct Supabase project

### "User table does not exist"
- Run: `npx prisma migrate deploy`
- Verify database connection in DATABASE_URL

### "Cannot find module @supabase/supabase-js"
- Run: `npm install`
- Verify node_modules is populated

### Server crashes with WebSocket error
- Verify you're using Node.js 24+
- Check `node --version`

## Next Steps

1. Complete OAuth login flow in browser:
   - Navigate to `http://localhost:3002/auth/login`
   - Authenticate with Google
   - Verify cookies are set

2. Test `/auth/me` endpoint with token

3. Run tests: `npm run test`

4. Check linting: `npm run lint`

See AUTH-TESTING-GUIDE.md for detailed manual testing steps.
