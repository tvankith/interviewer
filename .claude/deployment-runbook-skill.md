# Deployment Runbook Skill

A comprehensive guide for setting up production environments and deploying services using OpenTofu (Infrastructure-as-Code). This skill provides platform-agnostic patterns for AWS, GCP, Azure, and other cloud providers.

---

## Quick Start: Deploy a Service in 30 Minutes

### Prerequisites
- OpenTofu installed (`tofu version`)
- Cloud provider CLI configured (gcloud, aws, az)
- Service code with Dockerfile
- Access to cloud provider account

### Steps

```bash
# 1. Copy environment template
cp opentofu/environments/dev/terraform.tfvars opentofu/environments/production/terraform.tfvars

# 2. Edit terraform.tfvars with your values
cat opentofu/environments/production/terraform.tfvars
# Change: environment = "dev" → "production"
# Change: container_image = "your-registry/service:tag"
# Change: min_instances = 0 → 1 or 2
# Add your secrets references

# 3. Deploy
cd opentofu/environments/production
tofu init
tofu plan  # Review changes
tofu apply

# 4. Verify
curl https://<service-url>/health
```

---

## Directory Structure

```
opentofu/
├── modules/                          # Reusable modules (platform-agnostic)
│   ├── compute/main.tf              # Compute service (Cloud Run, EC2, App Engine)
│   ├── database/main.tf             # Database (PostgreSQL, DynamoDB, Cosmos DB)
│   ├── secrets/main.tf              # Secrets management
│   └── service_account/main.tf      # IAM & identities
│
├── environments/                     # Environment-specific configs
│   ├── dev/
│   │   ├── main.tf                  # Module calls
│   │   ├── variables.tf             # Variable definitions
│   │   ├── terraform.tfvars         # Dev values (COPY THIS FOR NEW ENVS)
│   │   ├── backend.tf               # State storage
│   │   └── locals.tf                # Computed values
│   ├── staging/                     # Copy of dev structure
│   │   └── terraform.tfvars         # Staging-specific values
│   └── production/                  # Copy of dev structure
│       └── terraform.tfvars         # Production-specific values
│
└── shared/                           # Global resources
    └── main.tf                      # DNS, VPCs, global tags

.claude/deployment/
├── RUNBOOK.md                       # First deployment + procedures
├── ENVIRONMENT-REPLICATION.md       # Clone prod→staging, multi-region
├── OPERATIONS.md                    # Scale, rollback, secrets rotation
├── BEST-PRACTICES.md                # Security, cost, reliability
├── TROUBLESHOOTING.md               # Common errors & fixes
└── EXAMPLES/
    ├── api-server/terraform.tfvars
    ├── ai-server/terraform.tfvars
    └── frontend/terraform.tfvars
```

---

## Core Concepts

### 1. **OpenTofu Modules** (Reusable Infrastructure)

Modules encapsulate infrastructure patterns, platform-agnostic:

```hcl
# opentofu/modules/compute/main.tf
module "api_server" {
  source = "../../modules/compute"
  
  # Identification
  service_name = var.service_name
  environment  = var.environment
  region       = var.region
  
  # Container Configuration
  container_image = var.docker_image    # Tags from CI/CD
  cpu             = var.compute_cpu     # "1", "2", etc.
  memory          = var.compute_memory  # "512Mi", "1Gi", etc.
  port            = var.container_port  # "3002", "8080", etc.
  
  # Environment & Secrets
  environment_variables = var.environment_variables
  secret_env_vars = var.secret_env_vars  # {VAR_NAME = secret_id}
  
  # Scaling & Health
  min_instances     = var.min_instances
  max_instances     = var.max_instances
  health_check_path = "/health"
  
  # Labels for cost tracking, compliance
  labels = merge(local.common_labels, var.service_labels)
}
```

**Same module works on all platforms** — swap provider, keep module code identical.

### 2. **Environment Configurations** (Single Source of Truth)

One file per environment defines all differences:

```hcl
# opentofu/environments/production/terraform.tfvars

# Cloud Provider & Location
provider_name = "gcp"  # or "aws", "azure"
region        = "us-central1"

# Service Identity
service_name = "api-server"
environment  = "production"

# Container Image (updated by CI/CD)
container_image = "gcr.io/project/api-server:v1.2.3"

# Scaling Policy
min_instances = 2        # Always running
max_instances = 10       # Peak load

# Resource Sizing
compute_cpu    = "1"
compute_memory = "512Mi"

# Non-Secret Environment Variables
environment_variables = {
  NODE_ENV  = "production"
  LOG_LEVEL = "info"
}

# Secrets (by ID, not value)
secret_env_vars = {
  DATABASE_URL = "api-server-prod-database-url"
  JWT_SECRET   = "api-server-prod-jwt-secret"
}

# Cost Tracking
service_labels = {
  team        = "platform"
  cost_center = "engineering"
}
```

### 3. **Secrets Management** (Secure, No Hardcoding)

Store secrets in platform-native secret manager, reference by ID in OpenTofu:

```bash
# GCP: Create secret
gcloud secrets create api-server-prod-database-url --data-file=/dev/stdin
# Paste secret value, Ctrl+D to save

# AWS: Create secret
aws secretsmanager create-secret --name api-server-prod-database-url --secret-string file://secret.txt

# OpenTofu references by ID (not value)
secret_env_vars = {
  DATABASE_URL = "api-server-prod-database-url"  # Platform will inject value at runtime
}
```

**Why?** Secrets never appear in code, state files, or logs.

---

## Environment Replication: Clone Staging from Production

**Problem:** How do you create a new staging environment identical to production, just with different scaling?

**Solution:** Copy `terraform.tfvars`, change values, run `tofu apply`.

### Step-by-Step

```bash
# 1. Copy production config as template
cp opentofu/environments/production/terraform.tfvars \
   opentofu/environments/staging/terraform.tfvars

# 2. Edit staging config
vim opentofu/environments/staging/terraform.tfvars
# Change these values:
#   environment = "production" → "staging"
#   min_instances = 2 → 0
#   max_instances = 10 → 3
#   container_image = "...v1.2.3" → "...staging"
#   secret_env_vars:
#     DATABASE_URL = "api-server-prod-database-url" → "api-server-staging-database-url"

# 3. Create secrets in staging environment
gcloud secrets create api-server-staging-database-url --data-file=/dev/stdin
gcloud secrets create api-server-staging-jwt-secret --data-file=/dev/stdin

# 4. Deploy staging
cd opentofu/environments/staging
tofu init      # Initialize state backend
tofu plan      # Review what will be created
tofu apply     # Deploy staging environment

# 5. Verify
curl https://<staging-service-url>/health
```

**Result:** Identical infrastructure, different configuration. Staging and production are now in sync.

### Multi-Region Replication

```bash
# Clone production to europe region
cp -r opentofu/environments/production opentofu/environments/production-eu

# Edit terraform.tfvars
vim opentofu/environments/production-eu/terraform.tfvars
# Change: region = "us-central1" → "europe-west1"

# Deploy
cd opentofu/environments/production-eu && tofu apply
```

---

## Documentation Best Practices

### 1. **Deployment Runbook** (RUNBOOK.md)

Document the process for deploying a service for the first time:

```markdown
# Deployment Runbook: API Server

## Prerequisites
- Docker installed
- OpenTofu installed
- GCP/AWS/Azure account with appropriate permissions
- Service code in git repository

## Step 1: Prepare Secrets
Create secrets in your cloud provider's secret manager:

\`\`\`bash
gcloud secrets create api-server-prod-database-url \
  --replication-policy="automatic"
echo "your-database-url" | gcloud secrets versions add \
  api-server-prod-database-url --data-file=-
\`\`\`

## Step 2: Configure Environment
Copy and edit terraform.tfvars:

\`\`\`bash
cp opentofu/environments/dev/terraform.tfvars \
   opentofu/environments/production/terraform.tfvars
vim opentofu/environments/production/terraform.tfvars
\`\`\`

## Step 3: Deploy
\`\`\`bash
cd opentofu/environments/production
tofu init
tofu plan
tofu apply
\`\`\`

## Step 4: Verify
\`\`\`bash
curl https://<service-url>/health
# Expected: 200 OK
\`\`\`

## Troubleshooting
- **502 Bad Gateway**: Service not responding to health check
  - Check logs: \`gcloud logging read "resource.type=cloud_run_revision"\`
  - Verify secrets exist: \`gcloud secrets list\`
```

### 2. **Environment Replication Guide** (ENVIRONMENT-REPLICATION.md)

Step-by-step guide for cloning environments:

```markdown
# Environment Replication Guide

## Scenario 1: Clone Production to Staging

\`\`\`bash
# 1. Copy config
cp opentofu/environments/production/terraform.tfvars \
   opentofu/environments/staging/terraform.tfvars

# 2. Edit for staging
vim opentofu/environments/staging/terraform.tfvars
# Required changes:
#   environment = "staging"
#   min_instances = 0 (or 1)
#   max_instances = 3
#   container_image tag: use "staging" instead of "v1.2.3"
#   secret_env_vars: use "staging" secrets

# 3. Create staging secrets
gcloud secrets create api-server-staging-database-url ...

# 4. Deploy
cd opentofu/environments/staging && tofu apply
\`\`\`

## Scenario 2: Scale Production Up for Event

\`\`\`bash
cd opentofu/environments/production
vim terraform.tfvars
# Change: max_instances = 10 → 50
tofu apply
\`\`\`

## Scenario 3: Add New Service to Existing Environment

\`\`\`bash
# Edit terraform.tfvars to add new service config
vim opentofu/environments/production/terraform.tfvars
# Add:
# service_name = "ai-server"
# service_labels = {team = "ai"}

tofu apply
\`\`\`
```

### 3. **Operations Manual** (OPERATIONS.md)

Document common operational tasks:

```markdown
# Operations Manual

## Scaling a Service

### Increase Max Instances
\`\`\`bash
cd opentofu/environments/production
vim terraform.tfvars
# Change: max_instances = 10 → 50
tofu apply
\`\`\`

## Rotating Secrets

### Update Database URL (No Redeploy)
\`\`\`bash
# 1. Generate new connection string in Supabase/RDS console
# 2. Update secret in platform
gcloud secrets versions add api-server-prod-database-url --data-file=-
# Paste new URL, Ctrl+D

# 3. Service automatically uses new secret next request
# No redeploy needed!
\`\`\`

## Rollback Failed Deployment

### Using Container Image Tag
\`\`\`bash
cd opentofu/environments/production
vim terraform.tfvars
# Change: container_image = "...v1.2.3-broken" → "...v1.2.2"
tofu apply
\`\`\`

## Debugging Service Issues

### View Logs
\`\`\`bash
# GCP Cloud Logging
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=api-server" \
  --limit 50 --format json

# AWS CloudWatch
aws logs tail /aws/ecs/api-server --follow

# Azure Monitor
az monitor log-analytics query -w <workspace-id> \
  --analytics-query "ContainerAppConsoleLogs | where ContainerAppName == 'api-server'"
\`\`\`

### Check Resource Usage
\`\`\`bash
# GCP Cloud Monitoring
gcloud monitoring time-series list \
  --filter='metric.type = "run.googleapis.com/request_latencies"'

# AWS CloudWatch Metrics
aws cloudwatch get-metric-statistics --namespace AWS/ECS \
  --metric-name CPUUtilization --statistics Average
\`\`\`
```

### 4. **Best Practices** (BEST-PRACTICES.md)

```markdown
# Deployment Best Practices

## Security
- **Never commit secrets** to git (use platform secret manager)
- **Minimal IAM permissions**: Each service account only needs required roles
- **Rotate secrets regularly**: Update database URL, JWT secrets quarterly
- **Audit access**: Review who has permission to manage secrets

## Cost Optimization
- **Dev/Staging**: min_instances = 0 (scale to zero when not in use)
- **Production**: min_instances ≥ 1 (always running)
- **Monitor spending**: Tag all resources by team/cost_center
- **Right-size**: Start with 512MB memory, increase only if OOM

## Reliability
- **Health checks**: Always implement /health endpoint
- **Connection pooling**: Use PgBouncer for database
- **Retry logic**: Implement exponential backoff for transient errors
- **Monitoring**: Set up alerts for error rate > 1%, latency > 1s

## Performance
- **Cold starts**: Acceptable in dev/staging, minimize in production
- **Concurrency**: Configure based on workload (default 100 is usually fine)
- **Caching**: Cache responses when possible
- **Database**: Always use connection pooling
```

---

## Secrets: Setup & Rotation

### Create Secrets (Once per Service per Environment)

```bash
# 1. Create secret in platform
gcloud secrets create api-server-prod-database-url --replication-policy="automatic"

# 2. Add value
echo "postgresql://user:pass@host/db" | gcloud secrets versions add \
  api-server-prod-database-url --data-file=-

# 3. Grant compute service access
gcloud secrets add-iam-policy-binding api-server-prod-database-url \
  --member=serviceAccount:api-server-prod@project.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

# 4. Reference in terraform.tfvars (ID only, not value!)
secret_env_vars = {
  DATABASE_URL = "api-server-prod-database-url"
}
```

### Rotate Secrets (No Service Restart)

```bash
# 1. Update secret value in platform
echo "new-connection-string" | gcloud secrets versions add \
  api-server-prod-database-url --data-file=-

# 2. Service automatically reads new version next request
# That's it! No redeploy needed.

# Verify:
curl https://api-server-url/health  # Should still return 200
```

---

## CI/CD Integration: Auto-Deploy on Code Push

### GitHub Actions Workflow

```yaml
name: Deploy API Server
on:
  push:
    branches: [main]
    paths: ["api-server/**"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build & Push Container
        env:
          REGISTRY: ${{ secrets.CONTAINER_REGISTRY }}  # gcr.io or ecr.aws
        run: |
          docker build -t $REGISTRY/api-server:${{ github.sha }} api-server/
          docker push $REGISTRY/api-server:${{ github.sha }}
      
      - name: Update OpenTofu Config
        run: |
          sed -i 's|container_image = .*|container_image = "'$REGISTRY'/api-server:${{ github.sha }}"|' \
            opentofu/environments/production/terraform.tfvars
      
      - name: Deploy with OpenTofu
        run: |
          cd opentofu/environments/production
          tofu init
          tofu apply -auto-approve
      
      - name: Verify Deployment
        run: |
          curl https://<service-url>/health
```

**Result:** Push code → Docker build → OpenTofu deploy → Live in < 10 minutes.

---

## Rollback: Revert Failed Deployment

```bash
# 1. Identify previous working image tag
git log --oneline api-server/ | head -5
# Example output:
# abc1234 Update API Server
# def5678 Previous working version  ← Use this

# 2. Update terraform.tfvars with previous tag
cd opentofu/environments/production
vim terraform.tfvars
# Change: container_image = "...abc1234" → "...def5678"

# 3. Redeploy
tofu apply

# 4. Verify
curl https://<service-url>/health
```

**Recovery time:** < 2 minutes

---

## Troubleshooting

### Service Returns 502 Bad Gateway
```bash
# Check if service is running
gcloud run services describe api-server

# Check logs for errors
gcloud logging read "resource.type=cloud_run_revision" --limit 20

# Check environment variables are set
gcloud run services describe api-server --format='value(status.activeRevisions)'

# Verify health check endpoint responds
curl https://<service-url>/health -v
```

### Terraform Apply Fails
```bash
# Error: "Backend initialization required"
cd opentofu/environments/production
tofu init

# Error: "State lock acquired by another process"
# Wait for other deployment to finish, or:
tofu force-unlock <lock-id>

# Error: "Secret not found"
gcloud secrets list | grep api-server
# Create missing secrets
```

### Service Won't Scale Up
```bash
# Check Cloud Monitoring metrics
gcloud monitoring time-series list --filter='metric.type = "run.googleapis.com/request_count"'

# Check if max_instances is reached
gcloud run services describe api-server --format='value(spec.template.spec.containerConcurrency)'

# Increase max_instances
vim opentofu/environments/production/terraform.tfvars
# Change: max_instances = 10 → 50
tofu apply
```

---

## Summary: Key Files to Know

| File | Purpose |
|------|---------|
| `opentofu/environments/{env}/terraform.tfvars` | **All environment configuration in one file** |
| `opentofu/modules/compute/main.tf` | Reusable compute module |
| `.claude/deployment/RUNBOOK.md` | First deployment guide |
| `.claude/deployment/ENVIRONMENT-REPLICATION.md` | Clone environments |
| `.claude/deployment/OPERATIONS.md` | Scale, rollback, rotate secrets |
| `.github/workflows/deploy-*.yml` | Auto-deploy on code push |

---

## Next Steps

1. **First Deployment:** Follow RUNBOOK.md for your service
2. **Add New Environment:** Copy `terraform.tfvars`, edit values, run `tofu apply`
3. **Scale Up:** Edit `min_instances`, `max_instances` in `terraform.tfvars`, run `tofu apply`
4. **Rotate Secrets:** Update secret in platform, no redeploy needed
5. **Troubleshoot:** Check OPERATIONS.md and TROUBLESHOOTING.md

---

## Questions?

- **"How do I replicate staging from prod?"** → See Environment Replication section
- **"How do I scale the service?"** → Edit `terraform.tfvars`, run `tofu apply`
- **"How do I rotate secrets?"** → Update secret in platform, service picks up new value automatically
- **"How do I rollback a deployment?"** → Update `container_image` tag, run `tofu apply`
