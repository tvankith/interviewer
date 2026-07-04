const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

exports.launchBrowser = async () => {
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
};

exports.createErrorResponse = (statusCode, message) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ error: message }),
});

exports.createSuccessResponse = (params) => {
  const { body, contentType, contentDisposition } = params
  const headers = {};

  if (contentType) headers["Content-Type"] = contentType;
  if (contentDisposition) headers["Content-Disposition"] = contentDisposition;
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(body)
  };
};
