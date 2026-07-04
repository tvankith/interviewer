const { launchBrowser, createErrorResponse, createSuccessResponse } = require("../../shared/browserLauncher");
const { uploadToS3, generatePresignedUrl } = require("../../shared/s3Utils");

module.exports.generatePdf = async (event) => {
  let browser;
  try {
    const body = JSON.parse(event.body || "{}");
    const html = body.html;

    if (!html) {
      return createErrorResponse(400, "Missing html");
    }

    if (!process.env.TEMP_PDF_BUCKET) {
      return createErrorResponse(500, "TEMP_PDF_BUCKET environment variable not set");
    }

    const bucket = process.env.TEMP_PDF_BUCKET

    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "16mm",
        right: "16mm",
      },
    });

    await browser.close();

    const key = `pdfs/${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
    await uploadToS3(bucket, key, pdfBuffer, "application/pdf");
    const presignedUrl = await generatePresignedUrl(bucket, key);

    return createSuccessResponse({
      body: {
        url: presignedUrl,
        key: key,
      }
    });
  } catch (error) {
    return createErrorResponse(500, error?.message || String(error) || "Unknown error");
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};
