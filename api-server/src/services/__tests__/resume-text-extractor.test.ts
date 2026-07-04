jest.mock(
  'mammoth',
  () => ({ __esModule: true, default: { extractRawText: jest.fn() } }),
  { virtual: true }
);

jest.mock(
  'pdfjs-dist/legacy/build/pdf.mjs',
  () => ({ getDocument: jest.fn() }),
  { virtual: true }
);

import mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs');
import {
  extractResumeText,
  UnsupportedFormatError,
  MAX_RESUME_TEXT_LENGTH,
} from '../resume-text-extractor';

const mockMammoth = mammoth as unknown as { extractRawText: jest.Mock };
const mockGetDocument = pdfjs.getDocument as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('extractResumeText', () => {
  it('extracts and trims text from a .docx file', async () => {
    mockMammoth.extractRawText.mockResolvedValue({ value: '  hello docx  ' });

    const text = await extractResumeText(Buffer.from('x'), 'resume.docx');

    expect(text).toBe('hello docx');
    expect(mockMammoth.extractRawText).toHaveBeenCalledTimes(1);
  });

  it('extracts text from a .pdf file across pages', async () => {
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 2,
        getPage: jest.fn(async (n: number) => ({
          getTextContent: async () => ({
            items: [{ str: `page${n}-a` }, { str: `page${n}-b` }],
          }),
        })),
        destroy: jest.fn(),
      }),
    });

    const text = await extractResumeText(Buffer.from('x'), 'resume.pdf');

    expect(text).toContain('page1-a');
    expect(text).toContain('page2-b');
  });

  it('truncates extracted text to MAX_RESUME_TEXT_LENGTH', async () => {
    mockMammoth.extractRawText.mockResolvedValue({ value: 'a'.repeat(20000) });

    const text = await extractResumeText(Buffer.from('x'), 'resume.docx');

    expect(text).toHaveLength(MAX_RESUME_TEXT_LENGTH);
  });

  it('throws UnsupportedFormatError for unsupported extensions', async () => {
    await expect(extractResumeText(Buffer.from('x'), 'resume.txt')).rejects.toBeInstanceOf(
      UnsupportedFormatError
    );
  });
});
