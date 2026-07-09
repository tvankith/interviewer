import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  llmParsedResumeSchema,
  emptyParsedResume,
  type ParsedResume,
} from "../schemas/parsed-resume";

function normaliseLlmResult(
  raw: ReturnType<typeof llmParsedResumeSchema.parse>,
): ParsedResume {
  return {
    title: raw.title ?? null,
    name: raw.name ?? null,
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    location: raw.location ?? null,
    summary: raw.summary ?? null,
    website: raw.website ?? null,
    skills: (raw.skills ?? []).map((g) => ({
      category: g.category ?? null,
      skills: g.skills ?? [],
    })),
    links: (raw.links ?? []).map((l) => ({
      url: l.url ?? "",
      social_media: l.social_media ?? "",
    })),
    projects: (raw.projects ?? []).map((p) => ({
      name: p.name ?? null,
      description: p.description ?? [],
      tech_stack: p.tech_stack ?? [],
    })),
    experiences: (raw.experiences ?? []).map((e) => ({
      company: e.company ?? null,
      role: e.role ?? null,
      location: e.location ?? null,
      start_date: e.start_date ?? null,
      end_date: e.end_date ?? null,
      description: e.description ?? [],
      tech_stack: e.tech_stack ?? [],
    })),
    educations: (raw.educations ?? []).map((ed) => ({
      institute: ed.institute ?? null,
      course: ed.course ?? null,
      start_date: ed.start_date ?? null,
      end_date: ed.end_date ?? null,
      description: ed.description ?? [],
    })),
  };
}
import { extractResumeText } from "./resume-text-extractor";
import { env } from "../config/env";

const google = createGoogleGenerativeAI({ apiKey: env.googleApiKey });
const MODEL = google("models/gemini-2.5-flash");

const PARSER_SYSTEM = `You are an expert resume parser. Your job is to extract EVERY piece of information from a resume into structured data. Be thorough — scan the entire document. Never skip a section. If information is present in the resume, you MUST extract it.`;

const PARSER_PROMPT = (
  text: string,
): string => `Extract ALL structured data from the resume below. Be exhaustive.

FIELDS TO EXTRACT:

Contact info (scan the full header and footer):
- title: professional headline/title as stated near the name (e.g. "Senior Software Engineer") — not a job history entry, just the candidate's current or target role label
- name: full name
- email: email address
- phone: phone number (digits only, no formatting required)
- location: city, state, country
- summary: professional summary or objective statement
- website: personal site URL (not LinkedIn/GitHub — those go in links)

Skills (scan Skills, Technical Skills, Technologies, Tools, Competencies sections AND infer from job descriptions):
- skills: a list of skill groups, each with:
  - category: the sub-label the resume uses to group these skills under (e.g. "Languages", "Cloud", "Frameworks") — omit this field entirely for a group of skills that aren't sub-categorized in the resume
  - skills: the distinct technologies, languages, frameworks, tools, or skills in that group — normalized (e.g. "React.js" → "React", "node" → "Node.js", "Postgres" → "PostgreSQL")
  If the resume lists skills under sub-headers (e.g. "Languages: Python, Go" and "Cloud: AWS, GCP"), produce one group per sub-header. If the resume just lists skills flatly with no sub-categorization, produce a single group with no category.

Links (scan header, footer, contact section):
- links: social profiles with:
  - url: full URL including https://
  - social_media: "linkedIN" for LinkedIn URLs, "github" for GitHub URLs

Projects (scan Projects, Personal Projects, Side Projects sections):
- projects: each project with:
  - name
  - description: list of bullet points describing the project
  - tech_stack: list of technologies mentioned in or for this project

Experiences (scan Experience, Work Experience, Employment, Career sections):
- experiences: each role with:
  - company
  - role: job title
  - location: city, state, country for this role (if stated)
  - start_date: as written (e.g. "Jan 2022", "2022")
  - end_date: as written, or "Present" if current
  - description: list of bullet points covering responsibilities and achievements
  - tech_stack: technologies mentioned in this role's description

Education (scan Education, Academic Background sections):
- educations: each entry with:
  - institute: university or school name
  - course: degree or program name
  - start_date: as written
  - end_date: as written or "Present"
  - description: list of bullet points with additional info (GPA, honors, coursework)

RULES:
- Extract tech_stack from BOTH project descriptions AND experience bullet points
- Keep dates exactly as written — no reformatting
- Do NOT omit sections that are present
- If a field is genuinely absent from the resume, use null (strings) or [] (arrays)
- Do NOT invent or guess anything not stated in the resume
RESUME:
${text}`;

/**
 * Parse an uploaded resume document into structured profile data.
 *
 * Ports `CandidateService.parse_resume` from the legacy Python `server`:
 *  1. Extract text from the upload (throws UnsupportedFormatError on bad type).
 *  2. Empty text → empty result.
 *  3. Structured LLM extraction; on any failure → empty result.
 */
export class ResumeParserService {
  async parse(file: Buffer, filename: string): Promise<ParsedResume> {
    // Extraction errors for unsupported formats intentionally propagate so the
    // route can map them to a 400.
    const text = await extractResumeText(file, filename);

    if (!text) {
      return emptyParsedResume();
    }
    console.log("text: ", text);
    try {
      const result = await generateText({
        model: MODEL,
        system: PARSER_SYSTEM,
        prompt: PARSER_PROMPT(text),
        experimental_output: Output.object({ schema: llmParsedResumeSchema }),
        maxRetries: 2,
      });
      console.log("object:-> ", result.experimental_output);
      return normaliseLlmResult(result.experimental_output);
    } catch (err) {
      console.log("err", err);
      // Match legacy graceful degradation: never fail the request on an LLM error.
      return emptyParsedResume();
    }
  }
}
