# API Server Cloud Run - Operations Runbook

Quick reference for common deployment and troubleshooting tasks.

## Prerequisites

- `gcloud` CLI installed and authenticated
- Access to GCP project with Cloud Run and Artifact Registry
- Access to Supabase project
- Docker installed (for local testing)

## Manual Deployment (No CI/CD)

### Build and Push Image

```bash
export PROJECT_ID=your-gcp-project-id
export IMAGE=us-central1-docker.pkg.dev/${PROJECT_ID}/api-server/api-server

# Build
docker build -t api-server:latest api-server/

# Tag
docker tag api-server:latest ${IMAGE}:latest
docker tag api-server:latest ${IMAGE}:$(date +%Y%m%d-%H%M%S)

# Push
docker push ${IMAGE}:latest
docker push ${IMAGE}:$(date +%Y%m%d-%H%M%S)
```

### Deploy to Cloud Run

```bash
gcloud run deploy api-server \
  --image=${IMAGE}:latest \
  --region=us-central1 \
  --update-secrets DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest
```

## Rollback Procedure

### Quick Rollback (Instant, <10s)

```bash
# List recent revisions
gcloud run revisions list --service api-server --region=us-central1 --limit=5

# Rollback to previous version
gcloud run services update-traffic api-server \
  --to-revisions REVISION_ID=100 \
  --region=us-central1

# Verify traffic is routed
gcloud run services describe api-server --region=us-central1
```

### Full Rollback (If revision doesn't exist)

```bash
# Get last working image from Artifact Registry
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/${PROJECT_ID}/api-server \
  --include-tags --sort-by=create-time --limit=10

# Redeploy with known good image
gcloud run deploy api-server \
  --image=us-central1-docker.pkg.dev/${PROJECT_ID}/api-server/api-server:KNOWN_GOOD_TAG \
  --region=us-central1
```

## Secret Rotation

### Rotate JWT_SECRET

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Update Cloud Run secret
echo -n "${NEW_SECRET}" | gcloud secrets versions add JWT_SECRET --data-file=-

# Redeploy to apply new secret
gcloud run deploy api-server \
  --image=us-central1-docker.pkg.dev/${PROJECT_ID}/api-server/api-server:latest \
  --region=us-central1 \
  --update-secrets JWT_SECRET=JWT_SECRET:latest
```

### Rotate Database Credentials

1. **Change password in Supabase**
   - Supabase Dashboard → Project Settings → Database → Reset Password
   - Save new password

2. **Update DATABASE_URL**
   ```bash
   NEW_DB_URL="postgresql://postgres:NEW_PASSWORD@POOLER_HOST:6543/postgres?schema=public&sslmode=require"
   echo -n "${NEW_DB_URL}" | gcloud secrets versions add DATABASE_URL --data-file=-
   ```

3. **Redeploy**
   ```bash
   gcloud run deploy api-server \
     --image=us-central1-docker.pkg.dev/${PROJECT_ID}/api-server/api-server:latest \
     --region=us-central1 \
     --update-secrets DATABASE_URL=DATABASE_URL:latest
   ```

## Troubleshooting

### Check Service Status

```bash
# Describe service
gcloud run services describe api-server --region=us-central1

# Check health
SERVICE_URL=$(gcloud run services describe api-server \
  --platform=managed --region=us-central1 \
  --format='value(status.url)')
curl $SERVICE_URL/health
```

### View Logs

```bash
# Recent logs
gcloud run logs read api-server --region=us-central1 --limit=50

# Follow logs (real-time)
gcloud run logs read api-server --region=us-central1 --limit=50 --follow

# Filter by severity
gcloud run logs read api-server --region=us-central1 --limit=50 --level=ERROR
```

### Database Connection Issues

**Symptom**: 503 Service Unavailable or "connection timeout"

**Checks**:
1. Verify DATABASE_URL is set:
   ```bash
   gcloud run services describe api-server --region=us-central1 \
     --format='value(spec.template.spec.containers[0].env)' | grep DATABASE_URL
   ```

2. Verify Supabase is reachable:
   ```bash
   # Extract DATABASE_URL from Cloud Run
   DB_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL)
   
   # Extract host and test
   psql "$DB_URL" -c "SELECT version();"
   ```

3. Check Supabase connection limit:
   - Supabase Dashboard → Database → Monitoring
   - Ensure active connections < limit
   - If exceeded, scale down Cloud Run min instances or upgrade Supabase plan

4. Check PgBouncer pooling:
   - Ensure DATABASE_URL uses pooler host (port 6543), not main host (port 5432)

### 401 Unauthorized

**Symptom**: API returns 401 on authenticated requests

**Checks**:
1. Verify JWT_SECRET matches frontend's signing key
2. Verify token format: `Authorization: Bearer <token>`
3. Check token expiration: `curl -H "Authorization: Bearer TOKEN" $SERVICE_URL/api/profile/1`
4. Review Cloud Run logs for auth errors

### High Latency / Cold Starts

**Symptom**: First request takes 2-5 seconds

**Mitigation**:
1. Increase min-instances:
   ```bash
   gcloud run deploy api-server \
     --min-instances=2 \
     --region=us-central1
   ```

2. Pre-warm with health check:
   ```bash
   # Add cron job to periodically curl /health
   curl -s $SERVICE_URL/health > /dev/null
   ```

### Memory/CPU Issues

**Symptom**: Service crashes or becomes unresponsive

**Check current config**:
```bash
gcloud run services describe api-server --region=us-central1 \
  --format='value(spec.template.spec.containers[0].resources)'
```

**Increase resources**:
```bash
gcloud run deploy api-server \
  --memory=1Gi \
  --cpu=2 \
  --region=us-central1
```

## Monitoring

### Key Metrics

```bash
# Request count and latency
gcloud monitoring dashboards list

# View in Cloud Console
echo "https://console.cloud.google.com/run/detail/us-central1/api-server"
```

### Set Up Alerts

- Go to Cloud Run Console
- Click service "api-server"
- Monitoring → Create Alert Policy
- Conditions:
  - Request count > threshold
  - Error rate > 1%
  - Latency p99 > 2000ms

## Capacity Planning

### Estimate Costs

Current configuration:
- Memory: 512Mi
- CPU: 1
- Min instances: 1
- Max instances: 10

Monthly estimate (rough):
- ~$0.50 per million requests
- ~$0.10 per GB-month memory
- Supabase: Free tier ~$0-10/month

### Scale Adjustments

```bash
# Scale up
gcloud run deploy api-server \
  --min-instances=2 \
  --max-instances=20 \
  --memory=1Gi \
  --cpu=2 \
  --region=us-central1

# Scale down (dev environment)
gcloud run deploy api-server \
  --min-instances=0 \
  --max-instances=5 \
  --memory=256Mi \
  --cpu=1 \
  --region=us-central1
```

## Emergency Procedures

### Immediate Disable (Kill Switch)

```bash
# Remove all traffic
gcloud run services update-traffic api-server \
  --to-revisions REVISION_NONE \
  --region=us-central1

# Or delete the service entirely
gcloud run services delete api-server --region=us-central1 --quiet
```

### Restore from Backup

If database is corrupted:

```bash
# 1. Create Supabase backup (in Supabase Dashboard)
# 2. Restore from backup point-in-time
# 3. Verify data integrity
# 4. Redeploy api-server
gcloud run deploy api-server \
  --region=us-central1
```

## Useful Links

- [Cloud Run Console](https://console.cloud.google.com/run)
- [Artifact Registry](https://console.cloud.google.com/artifacts)
- [Supabase Dashboard](https://app.supabase.com)
- [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
