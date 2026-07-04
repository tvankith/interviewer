jest.mock('ai', () => ({ generateObject: jest.fn() }), { virtual: true });
jest.mock(
  '@ai-sdk/google',
  () => ({ createGoogleGenerativeAI: jest.fn(() => () => ({})) }),
  { virtual: true }
);
jest.mock('../resume-text-extractor', () => ({
  extractResumeText: jest.fn(),
  UnsupportedFormatError: class UnsupportedFormatError extends Error {},
}));

import { generateObject } from 'ai';
import { extractResumeText, UnsupportedFormatError } from '../resume-text-extractor';
import { ResumeParserService } from '../resume-parser';
import { emptyParsedResume } from '../../schemas/parsed-resume';

const mockGenerateObject = generateObject as jest.Mock;
const mockExtract = extractResumeText as jest.Mock;

const service = new ResumeParserService();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ResumeParserService.parse', () => {
  it('returns the LLM object on success', async () => {
    mockExtract.mockResolvedValue('some resume text');
    const parsed = { ...emptyParsedResume(), name: 'Jane Doe' };
    mockGenerateObject.mockResolvedValue({ object: parsed });

    const result = await service.parse(Buffer.from('x'), 'resume.pdf');

    expect(result).toEqual(parsed);
    expect(mockGenerateObject).toHaveBeenCalledTimes(1);
  });

  it('returns an empty ParsedResume when no text is extracted', async () => {
    mockExtract.mockResolvedValue('');

    const result = await service.parse(Buffer.from('x'), 'resume.pdf');

    expect(result).toEqual(emptyParsedResume());
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });

  it('returns an empty ParsedResume when the LLM call fails', async () => {
    mockExtract.mockResolvedValue('some resume text');
    mockGenerateObject.mockRejectedValue(new Error('LLM down'));

    const result = await service.parse(Buffer.from('x'), 'resume.pdf');

    expect(result).toEqual(emptyParsedResume());
  });

  it('propagates UnsupportedFormatError from extraction', async () => {
    mockExtract.mockRejectedValue(new UnsupportedFormatError('resume.txt'));

    await expect(service.parse(Buffer.from('x'), 'resume.txt')).rejects.toBeInstanceOf(
      UnsupportedFormatError
    );
  });
});
