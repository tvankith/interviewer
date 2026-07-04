# GitHub Actions Setup Guide

This guide explains how to set up GitHub Actions for automatic deployment to Cloud Run.

## Overview

**Workflow**: `git push origin main` → GitHub Actions → Build → Deploy → Cloud Run

**Advantages**:
- No additional GCP setup (beyond service accounts)
- Integrated with GitHub (see status in PRs, Actions tab)
- Free for public repos, 2000 min/month for private
- Automatic secret rotation
- Easy to view logs and rollback

## Prerequisites

- GitHub repository (public or private)
- GCP project with Cloud Run API enabled
- Artifact Registry repository created
- `gcloud` CLI authenticated locally

## Step 1: Set Up Workload Identity Federation

Workload Identity Federation allows GitHub Actions to authenticate to GCP without storing credentials in GitHub Secrets.

### Create Workload Identity Pool

```bash
export PROJECT_ID=your-gcp-project-id

# Create the identity pool
gcloud iam workload-identity-pools create "github" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions"
```

### Create OIDC Provider

```bash
# Create the OIDC provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,assertion.aud=assertion.aud" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### Get Provider Resource Name

You'll need this for GitHub Secrets:

```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --format="value(name)"

# Output format: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-provider
```

## Step 2: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions-api-server \
  --display-name="GitHub Actions - API Server Deployment"

SERVICE_ACCOUNT=github-actions-api-server@${PROJECT_ID}.iam.gserviceaccount.com
```

## Step 3: Grant Permissions

```bash
PROJECT_ID=your-gcp-project-id
SERVICE_ACCOUNT=github-actions-api-server@${PROJECT_ID}.iam.gserviceaccount.com

# Allow Cloud Run deployment
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.admin"

# Allow pushing to Artifact Registry
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/artifactregistry.writer"

# Allow reading secrets
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 4: Configure Workload Identity Mapping

Allow GitHub Actions to impersonate the service account:

```bash
# Replace YOUR_GITHUB_ORG with your GitHub organization or username
# If personal repo, use your GitHub username

gcloud iam service-accounts add-iam-policy-binding ${SERVICE_ACCOUNT} \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_ID}/locations/global/workloadIdentityPools/github/attribute.aud/YOUR_GITHUB_ORG"
```

Or for more specific control (per-repo):

```bash
gcloud iam service-accounts add-iam-policy-binding ${SERVICE_ACCOUNT} \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_ID}/locations/global/workloadIdentityPools/github/attribute.aud/YOUR_GITHUB_ORG/YOUR_REPO"
```

## Step 5: Add GitHub Repository Secrets

In your GitHub repository:

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret** and add:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `GCP_PROJECT_ID` | Your GCP project ID | `my-project-12345` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Provider resource name from Step 1 | `projects/123456789/locations/global/workloadIdentityPools/github/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | Service account email | `github-actions-api-server@my-project-12345.iam.gserviceaccount.com` |

**Find your Project Number**:
```bash
gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)'
```

## Step 6: Verify Workflow File

The workflow file `.github/workflows/deploy-api-server.yml` should exist in your repository with:

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'api-server/**'

env:
  GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  GCP_REGION: us-central1
  CLOUD_RUN_SERVICE: api-server
```

This ensures the workflow only runs when:
- Code is pushed to `main` branch
- Changes are in the `api-server/` directory

## Step 7: Test the Workflow

### Test Trigger

Create a test commit:

```bash
cd api-server
echo "# Test deployment" >> README.md
git add README.md
git commit -m "Test GitHub Actions deployment"
git push origin main
```

### Monitor Execution

1. Go to your GitHub repository
2. Click **Actions** tab
3. Click **Deploy API Server to Cloud Run** workflow
4. Watch the build progress in real-time

**What you should see:**
```
✓ Checkout code
✓ Authenticate to Google Cloud
✓ Set up Cloud SDK
✓ Configure Docker for Artifact Registry
✓ Build Docker image
✓ Push image to Artifact Registry
✓ Deploy to Cloud Run
✓ Verify deployment
```

### Verify Deployment

Check Cloud Run:

```bash
# Get service URL
gcloud run services describe api-server \
  --platform=managed \
  --region=us-central1 \
  --format='value(status.url)'

# Test it
curl https://api-server-xxxxx-uc.a.run.app/health
```

## Workflow File Explanation

### Trigger Conditions

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'api-server/**'  # Only run if api-server files changed
      - '.github/workflows/deploy-api-server.yml'
```

Only deploys when:
- You push to `main` branch
- Files in `api-server/` directory changed (or workflow itself changed)

### Authentication Steps

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v1
  with:
    workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
    service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
```

Uses Workload Identity Federation instead of storing GCP credentials in GitHub.

### Build & Deploy Steps

```yaml
- name: Build Docker image
  run: docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/api-server/api-server:$COMMIT_SHA .

- name: Push image to Artifact Registry
  run: docker push us-central1-docker.pkg.dev/$PROJECT_ID/api-server/api-server:$COMMIT_SHA

- name: Deploy to Cloud Run
  run: gcloud run deploy api-server --image=...
```

Each step depends on previous (build → push → deploy).

### Health Check

```yaml
- name: Verify deployment
  run: |
    # Wait up to 50 seconds for service to be ready
    for i in {1..10}; do
      if curl -s -f "$SERVICE_URL/health" > /dev/null; then
        echo "✓ Health check passed"
        exit 0
      fi
      sleep 5
    done
```

Ensures the deployed service is responding before marking workflow as successful.

## Troubleshooting

### Workflow Fails with "Denied Workload Identity"

**Cause**: Workload Identity mapping not set up correctly.

**Fix**:
1. Verify `GCP_WORKLOAD_IDENTITY_PROVIDER` secret is correct format
2. Check service account has `roles/iam.workloadIdentityUser` role
3. Verify GitHub org/username matches in the mapping

```bash
# Check the mapping
gcloud iam service-accounts get-iam-policy github-actions-api-server@${PROJECT_ID}.iam.gserviceaccount.com
```

### Workflow Fails with "Permission denied" for Cloud Run

**Cause**: Service account lacks `roles/run.admin` permission.

**Fix**:
```bash
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions-api-server@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

### Workflow Fails with "Failed to authenticate to Artifact Registry"

**Cause**: Service account lacks `roles/artifactregistry.writer` permission.

**Fix**:
```bash
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions-api-server@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

### Health Check Times Out

**Cause**: Cloud Run service is not responding within 50 seconds.

**Debug**:
```bash
# Check Cloud Run logs
gcloud run logs read api-server --region=us-central1 --limit=20 --level=ERROR

# Test locally
docker run -p 3002:3002 -e DATABASE_URL="..." api-server:latest
curl http://localhost:3002/health
```

## Advanced: Conditional Deployments

You can add conditions to the deployment step:

```yaml
- name: Deploy to Cloud Run (Production)
  if: github.ref == 'refs/heads/main'  # Only on main branch
  run: gcloud run deploy api-server ...

- name: Deploy to Cloud Run (Staging)
  if: github.ref == 'refs/heads/develop'  # Only on develop branch
  run: gcloud run deploy api-server-staging ...
```

## Advanced: Manual Workflow Trigger

Allow manual deployment from GitHub UI:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:  # Allow manual trigger
```

Then go to **Actions → Deploy API Server → Run workflow**.

## Advanced: Slack Notifications

Add Slack notifications on deployment success/failure:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Deployment failed: ${{ github.repository }} #${{ github.run_number }}"
      }
```

## Complete Setup Checklist

- [ ] Workload Identity Pool created
- [ ] OIDC Provider created
- [ ] Service Account created
- [ ] IAM roles granted (run.admin, artifactregistry.writer, secretmanager.secretAccessor)
- [ ] Workload Identity mapping configured
- [ ] GitHub Secrets added (GCP_PROJECT_ID, GCP_WORKLOAD_IDENTITY_PROVIDER, GCP_SERVICE_ACCOUNT)
- [ ] `.github/workflows/deploy-api-server.yml` file exists
- [ ] Test commit pushed to main
- [ ] Workflow runs and completes successfully
- [ ] Cloud Run service updated
- [ ] Health check passes

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Cloud Workload Identity Federation](https://cloud.google.com/docs/authentication/workload-identity-federation)
- [GitHub Actions Google Cloud Auth](https://github.com/google-github-actions/auth)
- [Cloud Run Deployment with GitHub Actions](https://cloud.google.com/run/docs/quickstarts/build-and-deploy)
