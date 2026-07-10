import type { SerializedEditorState } from 'lexical';
import { env } from '../config/env';
import { renderLexicalDocToHtml } from '../lexical/render-lexical-html';

export class PdfGenerationNotConfiguredError extends Error {
  constructor() {
    super('PDF_GENERATE_API_URL is not configured');
    this.name = 'PdfGenerationNotConfiguredError';
  }
}

export class LexicalPdfService {
  async renderPdf(input: { doc: SerializedEditorState } | { html: string }): Promise<{ url: string }> {
    if (!env.pdfGenerateApiUrl) {
      throw new PdfGenerationNotConfiguredError();
    }

    const html = 'html' in input ? input.html : await renderLexicalDocToHtml(input.doc);

    const response = await fetch(env.pdfGenerateApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });

    if (!response.ok) {
      throw new Error(`PDF generation lambda returned ${response.status}`);
    }

    const data = (await response.json()) as { url?: string };
    if (!data.url) {
      throw new Error('PDF generation lambda did not return a url');
    }

    return { url: data.url };
  }
}
