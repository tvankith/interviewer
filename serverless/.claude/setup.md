# AWS Lambda Setup Guide

## Prerequisites

1. **AWS Account** with credentials configured
   ```bash
   aws configure
   ```

2. **Node.js 20.x or higher**

3. **Serverless Framework CLI**
   ```bash
   npm install -g serverless
   ```

## Lambda Layers Architecture

This project uses **Lambda Layers** to manage large dependencies (Chromium ~300MB):

```
functions/html-screenshot/handler.js    (small, ~2KB bundled)
functions/html-pdf/handler.js           (small, ~2KB bundled)
     ↓ references ↓
layers/chromium/node_modules/           (deployed once, ~250MB)
```

**Benefits:**
- Functions stay under 10MB (vs 250MB+)
- Layer is deployed once, reused by all functions
- Faster deployments
- Easier to update dependencies

## Initial Setup

1. Install workspace dependencies:
   ```bash
   cd serverless
   npm install
   ```

2. Configure AWS credentials (if not already done):
   ```bash
   aws configure
   # or
   serverless config credentials --provider aws --key YOUR_KEY --secret YOUR_SECRET
   ```

3. Deploy to dev (builds layer automatically):
   ```bash
   npm run deploy:dev
   ```

The `build:layer` script automatically:
- Installs layer dependencies to `layers/chromium/nodejs/node_modules`
- Creates the correct Lambda Layer structure

## Project Structure

```
serverless/
├── serverless.yml               # Main configuration
├── package.json                 # Root workspace config
├── shared/
│   └── browserLauncher.js       # Shared utilities
├── functions/
│   ├── html-screenshot/
│   │   ├── handler.js           # Function code
│   │   └── package.json
│   └── html-pdf/
│       ├── handler.js
│       └── package.json
└── layers/
    └── chromium/
        ├── package.json         # Layer dependencies
        └── nodejs/              # (created by build:layer)
            └── node_modules/
```

## Key Improvements Made

✅ **Lambda Layers** - Chromium in separate layer, keeps functions small  
✅ **Centralized Configuration** - All functions defined in single `serverless.yml`  
✅ **Dependency Management** - npm workspaces prevent duplication  
✅ **Code Reuse** - Common browser launching in `shared/browserLauncher.js`  
✅ **Better Error Handling** - Finally blocks ensure cleanup  
✅ **Consistent Responses** - Helper functions format all responses  
✅ **Easy Deployment** - `npm run deploy:dev` or `npm run deploy:prod`  

## Adding New Functions

1. Create new directory in `functions/`:
   ```bash
   mkdir functions/my-function
   ```

2. Create `handler.js` and minimal `package.json`:
   ```json
   {
     "name": "lambda-my-function",
     "version": "1.0.0",
     "type": "commonjs"
   }
   ```

3. Add to `serverless.yml`:
   ```yaml
   functions:
     myFunction:
       handler: functions/my-function/handler.myHandler
       timeout: 60
       memorySize: 3008
       layers:
         - { Ref: ChromiumLambdaLayer }  # if it needs chromium
   ```

4. Deploy:
   ```bash
   npm run deploy:dev
   ```

## Monitoring & Logs

```bash
# View real-time logs
npm run logs

# Invoke function locally for testing
npm run invoke -- --function htmlScreenshot --data '{"body": "{\"html\": \"<h1>Test</h1>\"}"}'

# View logs for specific function
aws logs tail /aws/lambda/interviewer-functions-dev-htmlScreenshot --follow
```

## Useful AWS CLI Commands

```bash
# List deployed functions
aws lambda list-functions

# View function details
aws lambda get-function --function-name interviewer-functions-dev-htmlScreenshot

# List lambda layers
aws lambda list-layers

# View layer details
aws lambda get-layer-version --layer-name interviewer-functions-dev-chromium --version-number 1
```

## Troubleshooting

### "Unzipped size must be smaller than 262144000 bytes"
The layer wasn't built properly. Run:
```bash
npm run clean:layer
npm run build:layer
npm run deploy:dev
```

### Module not found errors
Ensure the layer was deployed:
```bash
aws lambda list-layers  # Should see chromium layer listed
```

### Layer not being used
Check `serverless.yml` - each function needs:
```yaml
layers:
  - { Ref: ChromiumLambdaLayer }
```

### "Cannot find module '@sparticuz/chromium'"
The layer structure is wrong. It needs:
```
layers/chromium/
└── nodejs/
    └── node_modules/
        ├── @sparticuz/
        └── puppeteer-core/
```

Not just `node_modules/` at the root.
