# API Server Cloud Run - Operations Guide

Guide for DevOps and SRE teams managing the production api-server service.

## Service Overview

**Service**: `api-server`  
**Platform**: Google Cloud Run (managed, serverless)  
**Region**: `us-central1`  
**Database**: Supabase PostgreSQL with PgBouncer connection pooling  
**Runtime**: Node.js 20 (Alpine)  
**Memory**: 512MB  
**CPU**: 1  
**Concurrency**: 100 requests per container  
**Min Instances**: 1 (always warm)  
**Max Instances**: 10 (scales automatically)  

## Daily Operations Checks

### Morning Health Check

```bash
# 1. Service status
gcloud run services describe api-server --region=us-central1

# 2. Traffic distribution
gcloud run services describe api-server --region=us-central1 \
  --format='value(status.traffic)'

# 3. Error rate (check logs)
gcloud run logs read api-server --region=us-central1 \
  --limit=100 | grep ERROR | wc -l

# 4. Database connection status
gcloud run services describe api-server --region=us-central1 \
  --format='value(spec.template.spec.containers[0].env)' | grep DATABASE_URL
```

### Automated Monitoring

Set up Cloud Monitoring to track:

**Key Metrics**:
- **Request count**: Target 100-1000 req/min (depends on traffic)
- **Error rate**: Target <1% (alert if >5%)
- **Latency p99**: Target <500ms (alert if >2000ms)
- **Container instances**: Track scaling behavior
- **Database connections**: Track pooling effectiveness

**Create Alert Policy**:

```bash
# CPU utilization high
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="API Server High CPU" \
  --condition="cloud.run/service_name='api-server' AND cpu > 0.8"

# Error rate high
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="API Server High Error Rate" \
  --condition="cloud.run/service_name='api-server' AND error_rate > 0.05"

# Latency high
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="API Server High Latency" \
  --condition="cloud.run/service_name='api-server' AND latency_p99 > 2000"
```

## Scaling Management

### Auto-scaling Configuration

Current settings (production):
- Min instances: 1 (maintains 24/7 availability)
- Max instances: 10 (scales up under load)
- Concurrency per instance: 100 (HTTP/2 concurrent requests)

**Auto-scaling behavior**:
- New instance starts when pending requests accumulate
- Instance shuts down after 15 minutes with no traffic
- Scale-up typically takes 10-30 seconds

### Manual Scaling

**Increase capacity** (high traffic expected):
```bash
gcloud run deploy api-server \
  --region=us-central1 \
  --min-instances=2 \
  --max-instances=20
```

**Reduce capacity** (traffic drop):
```bash
gcloud run deploy api-server \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=10
```

**Emergency scale down** (issue investigation):
```bash
gcloud run deploy api-server \
  --region=us-central1 \
  --min-instances=0 \
  --max-instances=1
```

### Capacity Planning

**Estimate load capacity**:
- 1 instance × 100 concurrency = 100 concurrent requests
- 10 instances × 100 concurrency = 1000 concurrent requests
- ~100-200 requests/sec sustainable per instance

**If hitting limits**:
1. Increase max-instances
2. Increase memory (512MB → 1GB reduces GC pauses)
3. Increase CPU (1 → 2 improves throughput)
4. Optimize database queries (add indexes, caching)

### Cost Optimization

```bash
# Cost-optimized (dev/staging)
gcloud run deploy api-server \
  --region=us-central1 \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5

# Standard (production)
gcloud run deploy api-server \
  --region=us-central1 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=10

# High-performance (peak load)
gcloud run deploy api-server \
  --region=us-central1 \
  --memory=1Gi \
  --cpu=2 \
  --min-instances=2 \
  --max-instances=30
```

## Debugging Common Issues

### 503 Service Unavailable / "Service temporarily unavailable"

**Cause**: Service is scaling, or database connection failed

**Debug**:
```bash
# 1. Check service status
gcloud run services describe api-server --region=us-central1

# 2. Check recent logs
gcloud run logs read api-server --region=us-central1 \
  --limit=20 --level=ERROR

# 3. Check database connection
gcloud secrets versions access latest --secret=DATABASE_URL | \
  psql --dbname=$(psql --help | grep "database" | head -1) \
  -c "SELECT COUNT(*) FROM profiles;"

# 4. Check instance count
gcloud run revisions list --service=api-server \
  --region=us-central1 --limit=1
```

**Resolution**:
- Wait 30 seconds (scale-up in progress)
- Verify Supabase is online (check supabase.com status)
- Restart service: `gcloud run deploy api-server --region=us-central1`

### 401 Unauthorized on all requests

**Cause**: JWT_SECRET mismatch or token issue

**Debug**:
```bash
# 1. Verify JWT_SECRET is set
gcloud secrets versions access latest --secret=JWT_SECRET

# 2. Check if secret was recently rotated
gcloud secrets versions list JWT_SECRET

# 3. Verify frontend token generation matches secret
# (Token signature won't verify if secrets differ)
```

**Resolution**:
- Ensure frontend and backend use same JWT_SECRET
- Check token expiration: `jwt-decode <token>`
- Regenerate token from frontend

### High latency (>1000ms)

**Cause**: Cold start, high load, or slow database queries

**Debug**:
```bash
# 1. Check if scaling is happening
watch 'gcloud run revisions list --service=api-server \
  --region=us-central1 --limit=5'

# 2. Check database query performance
gcloud secrets versions access latest --secret=DATABASE_URL | \
  psql -c "
    SELECT query, calls, mean_exec_time
    FROM pg_stat_statements
    ORDER BY mean_exec_time DESC
    LIMIT 10;"

# 3. Check memory usage
gcloud run services describe api-server --region=us-central1 \
  --format='value(spec.template.spec.containers[0].resources.limits.memory)'
```

**Resolution**:
- Increase min-instances to keep containers warm
- Add database indexes for frequently queried fields
- Upgrade Supabase plan if hitting connection limits
- Increase memory from 512MB → 1GB

### Database Connection Pool Exhausted

**Symptom**: "too many connections" errors

**Debug**:
```bash
# 1. Check Supabase active connections
# (Supabase Dashboard → Database → Connections)
# Should show < 10 (free tier limit)

# 2. Check Cloud Run concurrency
gcloud run services describe api-server --region=us-central1 \
  --format='value(spec.template.spec.containerConcurrency)'

# 3. Check PgBouncer config
# (Supabase Dashboard → Project Settings → Database)
# Ensure mode is 'transaction' not 'session'
```

**Resolution**:
- Scale down Cloud Run min-instances to 0 (release connections)
- Upgrade Supabase plan (free tier: 2 connections, paid: 10-100)
- Enable transaction pooling mode instead of session pooling

### Out of Memory Crashes

**Symptom**: Service restarts frequently, errors mention memory

**Debug**:
```bash
# 1. Check current memory limit
gcloud run services describe api-server --region=us-central1 \
  --format='value(spec.template.spec.containers[0].resources.limits.memory)'

# 2. Check memory usage in logs
gcloud run logs read api-server --region=us-central1 \
  --limit=50 | grep -i memory
```

**Resolution**:
```bash
# Increase to 1GB
gcloud run deploy api-server \
  --region=us-central1 \
  --memory=1Gi

# Or optimize code:
# - Add memory limits to database queries
# - Implement pagination for large result sets
# - Add caching layer
```

## Secret Management

### Secret Rotation Schedule

**JWT_SECRET**: Every 90 days or on security incident

**Database Password**: Every 180 days or on security incident

### Rotate JWT_SECRET

```bash
#!/bin/bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)
echo "New secret generated"

# 2. Store in Cloud Run secret manager
echo -n "$NEW_SECRET" | gcloud secrets versions add JWT_SECRET --data-file=-

# 3. Redeploy service (picks up latest secret version)
gcloud run deploy api-server \
  --region=us-central1 \
  --update-secrets JWT_SECRET=JWT_SECRET:latest

# 4. Verify deployment
sleep 10
gcloud run logs read api-server --region=us-central1 --limit=5

echo "JWT_SECRET rotation complete"
```

### Rotate Database Credentials

```bash
#!/bin/bash
# 1. Go to Supabase Dashboard
# 2. Project Settings → Database → Reset Password
# 3. Copy new password

# 4. Update DATABASE_URL
NEW_PASSWORD="your-new-password"
NEW_DB_URL="postgresql://postgres:${NEW_PASSWORD}@YOUR_PROJECT-pooler.supabase.co:6543/postgres?schema=public&sslmode=require"

echo -n "$NEW_DB_URL" | gcloud secrets versions add DATABASE_URL --data-file=-

# 5. Redeploy
gcloud run deploy api-server \
  --region=us-central1 \
  --update-secrets DATABASE_URL=DATABASE_URL:latest

echo "Database credential rotation complete"
```

## Incident Response

### Service Down (All Requests Failing)

1. **Immediate action**:
   ```bash
   # Get current status
   gcloud run services describe api-server --region=us-central1
   
   # Check recent logs
   gcloud run logs read api-server --region=us-central1 --limit=50 --level=ERROR
   ```

2. **Investigate**:
   - Is database available?
   - Are secrets correctly set?
   - Did recent deployment introduce bug?

3. **Rollback** (if recent deployment):
   ```bash
   # List revisions
   gcloud run revisions list --service=api-server --region=us-central1
   
   # Route all traffic to previous version
   gcloud run services update-traffic api-server \
     --to-revisions REVISION_ID=100 \
     --region=us-central1
   ```

4. **Redeploy** (if fix is available):
   ```bash
   gcloud run deploy api-server \
     --image=us-central1-docker.pkg.dev/PROJECT_ID/api-server/api-server:latest \
     --region=us-central1
   ```

### Partial Outage (Some Users Affected)

1. **Identify pattern**:
   ```bash
   # Check error logs
   gcloud run logs read api-server --region=us-central1 \
     --limit=200 --level=ERROR | grep -E "pattern|endpoint|user"
   ```

2. **Targeted fix**:
   - Fix bug in code
   - Deploy new revision
   - Monitor error rate

### Performance Degradation (Slow Responses)

1. **Check load**:
   ```bash
   # Request rate
   gcloud run logs read api-server --region=us-central1 --limit=100 | \
     grep "GET\|POST\|PUT\|DELETE" | wc -l
   ```

2. **Scale up**:
   ```bash
   gcloud run deploy api-server \
     --region=us-central1 \
     --min-instances=2 \
     --max-instances=20
   ```

3. **Investigate bottleneck**:
   - Database query slow?
   - Memory/CPU exhausted?
   - External dependency slow?

## Deployment Checklist

Before deploying to production:

- [ ] Code reviewed and merged to main
- [ ] Tests passing locally
- [ ] Docker image built and pushed
- [ ] Environment variables set correctly
- [ ] Secrets (DATABASE_URL, JWT_SECRET) verified
- [ ] DEPLOYMENT.md and RUNBOOK.md documentation updated
- [ ] No breaking changes to API
- [ ] Backward compatibility maintained
- [ ] Database migrations run successfully
- [ ] Supabase is accessible and healthy
- [ ] Canary test in staging (if available)
- [ ] On-call engineer available during deployment
- [ ] Rollback plan documented

## Contact & Escalation

**Service Owner**: (Team name)  
**On-Call**: (Rotation schedule/PagerDuty link)  
**Slack Channel**: #api-server-ops  
**Documentation**: This guide + DEPLOYMENT.md + RUNBOOK.md  
**GCP Console**: https://console.cloud.google.com/run?project=PROJECT_ID  

## Useful References

- Cloud Run Documentation: https://cloud.google.com/run/docs
- Supabase Docs: https://supabase.com/docs
- Prisma Connection Pooling: https://www.prisma.io/docs/orm/prisma-client/deployment/connection-pooling
- Node.js Production Best Practices: https://nodejs.org/en/docs/guides/nodejs-web-app-security/
