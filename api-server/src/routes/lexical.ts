import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { SerializedEditorState } from 'lexical';
import { z } from 'zod';
import { authGuard } from '../middleware/auth';
import { LexicalPdfService, PdfGenerationNotConfiguredError } from '../services/lexical-pdf';

const lexicalPdfService = new LexicalPdfService();

// Only the document envelope is validated — the recursive node tree isn't
// worth mirroring in Zod; malformed nodes surface as a 500 from the Lexical
// parser instead of a 400 here.
const lexicalDocSchema = z.object({
  root: z.object({ type: z.literal('root') }).passthrough(),
}).passthrough();

// Accepts either a raw Lexical doc (rendered to HTML here, via the
// lazy-loaded @lexical/html + jsdom pipeline) or an already-rendered full
// HTML document (e.g. the app's own React-SSR resume render) — either way
// this endpoint owns the one remaining step: calling the PDF lambda.
const renderPdfSchema = z.union([
  z.object({ doc: lexicalDocSchema }),
  z.object({ html: z.string().min(1) }),
]);

export async function lexicalRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/lexical/pdf - Render HTML (from a Lexical doc or as-given) and generate a PDF via the PDF lambda
  fastify.post<{ Body: unknown }>(
    '/api/lexical/pdf',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = renderPdfSchema.parse(request.body);
        const result =
          'html' in body
            ? await lexicalPdfService.renderPdf({ html: body.html })
            : await lexicalPdfService.renderPdf({ doc: body.doc as unknown as SerializedEditorState });
        reply.send(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: 'Validation error', details: error.errors });
        } else if (error instanceof PdfGenerationNotConfiguredError) {
          reply.status(501).send({ error: error.message });
        } else {
          request.log.error({ event: 'lexical_pdf_failed', error: error instanceof Error ? error.message : error });
          reply.status(502).send({ error: 'Failed to generate PDF' });
        }
      }
    }
  );
}
