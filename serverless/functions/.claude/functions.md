# AWS Lambda Functions

This directory contains all AWS Lambda functions for the interviewer application.

## Structure

```
serverless/
├── serverless.yml          # Central configuration for all functions
├── package.json            # Root dependencies (npm workspaces)
├── shared/                 # Shared utilities
│   └── browserLauncher.js  # Common browser launch and response helpers
└── functions/
    ├── html-screenshot/    # Generate PNG screenshots
    └── html-pdf/           # Generate PDF documents
```

## Functions

- **html-screenshot** (`functions/html-screenshot/handler.capture`)
  - Generates PNG screenshots from HTML input
  - Returns base64-encoded PNG image
  - Viewport: 1280x720 (2x device scale factor)

- **html-pdf** (`functions/html-pdf/handler.generatePdf`)
  - Generates A4 PDF documents from HTML input
  - Returns base64-encoded PDF with download disposition
  - Waits for fonts to load before rendering

## Deployment

```bash
# Install dependencies
npm install

# Deploy to dev stage
npm run deploy:dev

# Deploy to prod stage
npm run deploy:prod

# View logs
npm run logs

# Invoke a function
npm run invoke -- --function htmlScreenshot
```

## Configuration

All functions are configured in `serverless.yml`:
- **Runtime**: Node.js 20.x
- **Memory**: 3008 MB (required for Chromium)
- **Timeout**: 60 seconds
- **Region**: Configurable via AWS CLI or `serverless.yml`

## Shared Utilities

The `shared/browserLauncher.js` module exports:
- `launchBrowser()` - Launch Chromium with proper configuration
- `createErrorResponse(statusCode, message)` - Format error responses
- `createSuccessResponse(body, contentType, contentDisposition)` - Format success responses