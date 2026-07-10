import type { SerializedEditorState } from 'lexical';

/**
 * `lexical`, `@lexical/headless`, `@lexical/html`, `@lexical/rich-text`,
 * `@lexical/list`, and `jsdom` are only imported inside these functions
 * (never at module top level) so a normal server boot / other routes never
 * pay for loading them — they're pulled in on first use of the lexical PDF
 * endpoint only.
 */

let domGlobalsReady: Promise<void> | null = null;

// @lexical/html's node exportDOM() implementations call document.createElement
// directly against the ambient global — there's no way to inject a document
// into a headless editor instance instead, so we patch globalThis once.
async function ensureDomGlobals(): Promise<void> {
  if (!domGlobalsReady) {
    domGlobalsReady = (async () => {
      const { JSDOM } = await import('jsdom');
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
      (globalThis as unknown as { window: unknown }).window = dom.window;
      (globalThis as unknown as { document: unknown }).document = dom.window.document;
    })();
  }
  await domGlobalsReady;
}

export async function renderLexicalDocToHtml(doc: SerializedEditorState): Promise<string> {
  await ensureDomGlobals();

  const [{ createHeadlessEditor }, { $generateHtmlFromNodes }, { HeadingNode, QuoteNode }, { ListNode, ListItemNode }] =
    await Promise.all([
      import('@lexical/headless'),
      import('@lexical/html'),
      import('@lexical/rich-text'),
      import('@lexical/list'),
    ]);

  const editor = createHeadlessEditor({
    namespace: 'lexical-pdf-render',
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
    onError: (error: Error) => {
      throw error;
    },
  });

  editor.setEditorState(editor.parseEditorState(JSON.stringify(doc)));

  let bodyHtml = '';
  editor.getEditorState().read(() => {
    bodyHtml = $generateHtmlFromNodes(editor, null);
  });

  return wrapHtmlDocument(bodyHtml);
}

function wrapHtmlDocument(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.5; margin: 2rem; }
  h1, h2, h3, h4, h5, h6 { margin: 1.2em 0 0.4em; line-height: 1.25; }
  p { margin: 0 0 0.75em; }
  ul, ol { margin: 0 0 0.75em; padding-left: 1.5em; }
  li { margin: 0.2em 0; }
  blockquote { margin: 0 0 0.75em; padding-left: 1em; border-left: 3px solid #ccc; color: #555; }
  code { background: #f2f2f2; padding: 0.1em 0.3em; border-radius: 3px; font-family: ui-monospace, Menlo, monospace; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
