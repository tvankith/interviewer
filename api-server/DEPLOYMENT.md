# API Server - Cloud Run Deployment Guide

This guide documents how to deploy the api-server to Google Cloud Run with Supabase PostgreSQL.

## Prerequisites

- Google Cloud Platform account with billing enabled
- Supabase account (supabase.com)
- Docker installed locally
- `gcloud` CLI installed and authenticated
- GitHub repository linked to Cloud Build (optional, for CI/CD)
- Node.js 18+ for local development

## Architecture

```
Frontend (Next.js)
    ↓
Cloud Run (api-server)
    ↓
Supabase PostgreSQL (with connection pooling via PgBouncer)
```

**Key Components:**
- **Compute**: Google Cloud Run (serverless, auto-scaling)
- **Database**: Supabase PostgreSQL (managed, with connection pooling on port 6543)
- **ORM**: Prisma Client
- **Authentication**: JWT tokens (validated in middleware)

## Deployment Steps

### 1. Infrastructure Setup (Using OpenTofu - Recommended)

Instead of manual gcloud commands, use OpenTofu to create all infrastructure automatically:

```bash
cd terraform/environments/production/
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with:
# - gcp_project_id, github_org, github_repo
# - the `secrets` map (API_SERVER_DATABASE_URL from Supabase, JWT_SECRET, etc.)

tofu init
tofu plan
tofu apply  # Type 'yes' to confirm
```

**Result**: 
- ✓ Workload Identity Federation for GitHub Actions
- ✓ Service accounts with proper IAM roles
- ✓ Artifact Registry repository created
- ✓ Cloud Run service configured
- ✓ Secrets stored in Secret Manager
- ✓ GitHub Actions secrets printed for easy setup

See `terraform/environments/production/README.md` for a detailed guide.

### 1a. GCP Project Setup (Manual Alternative)

If you prefer manual setup instead of Terraform:

```bash
# Set your project ID
export PROJECT_ID=your-gcp-project-id
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable sts.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 1b. Create Artifact Registry Repository (Manual)

```bash
# Create repository for Docker images
gcloud artifacts repositories create api-server \
  --repository-format=docker \
  --location=us-central1 \
  --description="API Server Docker images"

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### 2. Build and Test Locally

```bash
# Build Docker image
docker build -t api-server:latest -f Dockerfile .

# Run locally (requires DATABASE_URL and JWT_SECRET)
docker run -p 3002:3002 \
  -e DATABASE_URL="postgresql://user:pass@host:port/db" \
  -e JWT_SECRET="your-secret" \
  -e NODE_ENV=production \
  api-server:latest

# Test health check
curl http://localhost:3002/health
```

### 4. Set Up Supabase

1. **Create Supabase Project**
   - Go to supabase.com and create a new project
   - Save the Project ID and connection strings

2. **Enable Connection Pooling**
   - In Supabase Dashboard → Database → Connection Pooling
   - Enable PgBouncer pooling mode
   - Connection pooler URL will be: `<project-id>-pooler.supabase.co:6543`

3. **Retrieve Connection String**
   - Connection string format:
   ```
   postgresql://postgres:[PASSWORD]@[PROJECT-ID]-pooler.supabase.co:6543/postgres?schema=public&sslmode=require
   ```

4. **Run Prisma Migrations**
   ```bash
   export DATABASE_URL="postgresql://user:pass@pooler.supabase.co:6543/postgres?schema=public&sslmode=require"
   npx prisma migrate deploy
   ```

### 5. Create Service Account for Cloud Run

```bash
# Create service account
gcloud iam service-accounts create api-server-cloud-run \
  --display-name="API Server Cloud Run Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:api-server-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:api-server-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"
```

### 6. Push Image to Artifact Registry

```bash
# Tag image
docker tag api-server:latest \
  us-central1-docker.pkg.dev/${PROJECT_ID}/api-server/api-server:latest

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/${PROJECT_ID}/api-server/api-server:latest
```

### 7. Deploy to Cloud Run

```bash
# Generate JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32)

# Retrieve Supabase DATABASE_URL
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT-pooler.supabase.co:6543/postgres?schema=public&sslmode=require"

# Deploy service
gcloud run deploy api-server \
  --image=us-central1-docker.pkg.dev/${PROJECT_ID}/api-server/api-server:latest \
  --platform=managed \
  --region=us-central1 \
  --memory=512Mi \
  --cpu=1 \
  --concurrency=100 \
  --min-instances=1 \
  --max-instances=10 \
  --allow-unauthenticated \
  --service-account=api-server-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production,LOG_LEVEL=info \
  --update-secrets DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest \
  --port 3002
```

### 8. Set Cloud Run Secrets

```bash
# Create secrets in Cloud Run
echo -n "${JWT_SECRET}" | gcloud secrets create JWT_SECRET --data-file=-
echo -n "${DATABASE_URL}" | gcloud secrets create DATABASE_URL --data-file=-

# Grant Cloud Run service account access to secrets
gcloud secrets add-iam-policy-binding JWT_SECRET \
  --member="serviceAccount:api-server-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:api-server-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 9. Test Cloud Run Service

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe api-server \
  --platform=managed \
  --region=us-central1 \
  --format='value(status.url)')

echo "Service URL: $SERVICE_URL"

# Test health check
curl $SERVICE_URL/health

# Test with JWT token (requires token from frontend/auth service)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  $SERVICE_URL/api/profile/1
```

## CI/CD Setup (GitHub Actions)

### Automatic Deployment on Git Push

GitHub Actions workflows automatically deploy when code is pushed to the main branch.

#### 1. Set Up Workload Identity Federation (One-time Setup)

Enable OpenID Connect authentication for secure credential-free access to GCP:

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions"

# Get the pool resource name
WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools list \
  --project="${PROJECT_ID}" \
  --location="global" \
  --format="value(name)" | grep "github")

# Create OIDC provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,assertion.aud=assertion.aud" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Get provider resource name
PROVIDER=$(gcloud iam workload-identity-pools providers describe github-provider \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --format="value(name)")
```

#### 2. Create Service Account for GitHub Actions

```bash
# Create service account
gcloud iam service-accounts create github-actions-api-server \
  --display-name="GitHub Actions API Server"

# Grant necessary permissions
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions-api-server@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions-api-server@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions-api-server@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### 3. Configure Workload Identity Federation Mapping

```bash
# Allow GitHub Actions to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-api-server@${PROJECT_ID}.iam.gserviceaccount.com \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${PROVIDER}/attribute.aud/YOUR_GITHUB_ORG"
```

Replace `YOUR_GITHUB_ORG` with your GitHub organization or username.

#### 4. Add GitHub Secrets

Add these to your GitHub repository settings (Settings → Secrets and variables → Actions):

```
GCP_PROJECT_ID: your-gcp-project-id
GCP_WORKLOAD_IDENTITY_PROVIDER: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-provider
GCP_SERVICE_ACCOUNT: github-actions-api-server@your-gcp-project-id.iam.gserviceaccount.com
```

To find `PROJECT_NUMBER`:
```bash
gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)'
```

#### 5. Workflow Execution

GitHub Actions workflow (`.github/workflows/deploy-api-server.yml`) automatically:

1. **Triggers** on: `git push origin main` (if api-server/ files changed)
2. **Authenticates** to GCP using Workload Identity Federation
3. **Builds** Docker image
4. **Pushes** to Artifact Registry
5. **Deploys** to Cloud Run
6. **Tests** health endpoint
7. **Reports** success/failure

**View workflow status:**
- Go to GitHub repo → Actions tab
- Click "Deploy API Server to Cloud Run" workflow
- See build logs, deployment status, and timing

**Deploy on Push:**
```bash
git add .
git commit -m "Add new profile feature"
git push origin main  # Automatically triggers GitHub Actions workflow
```

## Managing Secrets

### Rotate JWT_SECRET

```bash
# Generate new secret
NEW_JWT_SECRET=$(openssl rand -base64 32)

# Update Cloud Run secret
echo -n "${NEW_JWT_SECRET}" | gcloud secrets versions add JWT_SECRET --data-file=-

# Redeploy Cloud Run service (picks up new secret version)
gcloud run deploy api-server \
  --image=us-central1-docker.pkg.dev/${PROJECT_ID}/api-server/api-server:latest \
  --region=us-central1 \
  --update-secrets JWT_SECRET=JWT_SECRET:latest
```

### Rotate Supabase Credentials

1. Go to Supabase Dashboard → Project Settings
2. Click "Reset Database Password"
3. Update DATABASE_URL with new password
4. Update Cloud Run secret:
   ```bash
   echo -n "postgresql://postgres:NEW_PASSWORD@..." | \
     gcloud secrets versions add DATABASE_URL --data-file=-
   ```
5. Redeploy Cloud Run service

## Monitoring and Troubleshooting

### View Cloud Run Logs

```bash
# Stream logs
gcloud run logs read api-server --region=us-central1 --limit=50 --follow

# View specific deployment
gcloud run revisions list --service api-server --region=us-central1
```

### Test Database Connection

```bash
# SSH into Cloud Run container (requires Cloud Build service account permissions)
gcloud compute ssh api-server --zone=us-central1-a \
  -- "psql $DATABASE_URL -c 'SELECT version();'"
```

### Common Issues

**Database Connection Timeout**
- Ensure Supabase connection pooling is enabled on port 6543
- Verify DATABASE_URL uses pooler host, not main host
- Check Supabase project connection limits

**401 Unauthorized**
- Verify JWT_SECRET is set correctly
- Check token expiration
- Ensure Authorization header format: `Bearer <token>`

**Cold Start Latency**
- Increase `--min-instances` to maintain warm containers
- Pre-warm service with health check requests before main traffic

## Rollback

### Instant Rollback to Previous Version

```bash
# List revisions
gcloud run revisions list --service api-server --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic api-server \
  --to-revisions REVISION_ID=100 \
  --region=us-central1
```

## Cost Optimization

- **Minimum Instances**: Set to 1 for 24/7 availability; reduce to 0 for dev environments
- **Maximum Instances**: Adjust based on expected load
- **Memory/CPU**: Start with 512Mi/1 CPU; scale up if needed
- **Supabase Pricing**: Free tier includes 2 concurrent connections; upgrade if needed

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma with Connection Pooling](https://www.prisma.io/docs/orm/prisma-client/deployment/connection-pooling)
- [Google Cloud Build](https://cloud.google.com/build/docs)
