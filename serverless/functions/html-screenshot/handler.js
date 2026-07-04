const { launchBrowser, createErrorResponse, createSuccessResponse } = require("../../shared/browserLauncher");
const { uploadToS3, generatePresignedUrl } = require("../../shared/s3Utils");

module.exports.capture = async (event) => {
  let browser;
  try {
    const body = JSON.parse(event.body || "{}");
    const html = body.html;

    if (!html) {
      return createErrorResponse(400, "Missing html");
    }

    if (!process.env.RESUME_TEMPLATE_THUMBNAIL_BUCKET) {
      return createErrorResponse(500, "RESUME_TEMPLATE_THUMBNAIL_BUCKET environment variable not set");
    }

    const bucket = process.env.RESUME_TEMPLATE_THUMBNAIL_BUCKET

    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setViewport({
      width: 1280,
      height: 720,
      deviceScaleFactor: 2,
    });

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const image = await page.screenshot({
      type: "png",
      fullPage: true,
    });

    await browser.close();

    const timestamp = Date.now();
    const key = `screenshots/${timestamp}.png`;

    await uploadToS3(bucket, key, image, "image/png");
    const presignedUrl = await generatePresignedUrl(bucket, key);

    return createSuccessResponse({
      body: {
        url: presignedUrl,
        key: key
      }
    });
  } catch (error) {
    console.error("Screenshot error:", error);
    return createErrorResponse(500, error.message);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};