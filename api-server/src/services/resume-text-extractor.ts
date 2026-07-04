import mammoth from 'mammoth';

/** Maximum number of characters of resume text sent to the LLM. */
export const MAX_RESUME_TEXT_LENGTH = 15000;

/** Raised when an uploaded file has an extension we cannot parse. */
export class UnsupportedFormatError extends Error {
  constructor(filename: string) {
    super(`Unsupported file format: ${filename}`);
    this.name = 'UnsupportedFormatError';
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdfjs-dist's legacy build is the Node-compatible entry point (no DOM).
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    // Group items by Y position so each visual line becomes one text line.
    // PDF coordinate origin is bottom-left; transform[5] is the y value.
    // Round to nearest 2pt to tolerate sub-pixel jitter within the same line.
    const lineMap = new Map<number, string[]>();
    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue;
      const y = Math.round((item as { transform: number[] }).transform[5] / 2) * 2;
      const bucket = lineMap.get(y) ?? [];
      bucket.push(item.str);
      lineMap.set(y, bucket);
    }

    // Sort buckets top-to-bottom (higher y = higher on page in PDF space).
    const sortedLines = Array.from(lineMap.entries())
      .sort(([a], [b]) => b - a)
      .map(([, tokens]) => tokens.join(' '));
    pageTexts.push(sortedLines.join('\n'));
  }

  await doc.destroy();
  return pageTexts.join('\n');
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

/**
 * Extract plain text from a resume upload, dispatching on the filename
 * extension. Mirrors the legacy Python parser: `.pdf` via a PDF library and
 * `.doc`/`.docx` via a DOCX library. The result is trimmed and truncated to
 * {@link MAX_RESUME_TEXT_LENGTH} characters before being returned.
 *
 * @throws {UnsupportedFormatError} for any other extension.
 */
export async function extractResumeText(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const name = (filename || '').toLowerCase();

  let text: string;
  if (name.endsWith('.pdf')) {
    text = await extractPdfText(buffer);
  } else if (name.endsWith('.doc') || name.endsWith('.docx')) {
    text = await extractDocxText(buffer);
  } else {
    throw new UnsupportedFormatError(filename);
  }

  return text.trim().slice(0, MAX_RESUME_TEXT_LENGTH);
}
