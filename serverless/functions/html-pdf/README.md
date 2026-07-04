# HTML to PDF Lambda Function

Generates PDF documents from HTML content using AWS Lambda and Puppeteer.

## Requirements

- Node.js 20.x or later
- Serverless Framework CLI
- AWS credentials configured

## Setup

```bash
npm install
```

## Deployment

```bash
# Deploy to AWS
serverless deploy

# Deploy a single function
serverless deploy function -f generatePdf
```

## Usage

Send a POST request to `/pdf` endpoint with JSON body:

```bash
curl -X POST https://<api-gateway-url>/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html><body><h1>Hello World</h1></body></html>"
  }'
```

## Response

Returns a base64-encoded PDF file with Content-Type `application/pdf`.

## Configuration

- **Memory**: 1536 MB (adjustable in `serverless.yml`)
- **Timeout**: 30 seconds (adjustable in `serverless.yml`)
- **Region**: us-east-1 (adjustable in `serverless.yml`)

## PDF Options

The handler supports the following PDF formatting options (configurable in `handler.js`):

- `format`: Paper format (A4, Letter, etc.)
- `printBackground`: Include background colors/images
- `margin`: Page margins (top, bottom, left, right)

## Performance Notes

- Cold start time: ~10-15 seconds (due to Chromium initialization)
- Average execution time: 5-10 seconds for typical HTML
- For better performance, keep functions warm with occasional invocations

## License

ISC
