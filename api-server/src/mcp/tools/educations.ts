import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "@prisma/client";
import type { SseManager } from "../../utils/sse-manager.js";
import { withCandidate } from "../with-candidate.js";
import { formatDescriptionAsHtml } from "../helpers.js";

const educationSchema = z.object({
  institute: z.string(),
  course: z.string(),
  start_date: z.string(),
  end_date: z.string().default("Present"),
  description: z.string().optional().nullable(),
});

/**
 * Deprecated, No more mcps that update database since we are moving to hitl
 */
export function registerEducationsTools(
  server: McpServer,
  prisma: PrismaClient,
  sseManager: SseManager,
): void {
  server.tool(
    "update_educations",
    "Update candidate's education entries (replaces entire list).",
    {
      educations: z
        .array(educationSchema)
        .describe(
          "Complete list of educations with institute, course, start_date, end_date, description",
        ),
    },
    async ({ educations }) => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const formatted = educations.map((edu) => ({
          ...edu,
          description: formatDescriptionAsHtml(edu.description ?? undefined),
        }));
        const updated = await prisma.candidate_profile.update({
          where: { id: candidate.id },
          data: { educations: formatted },
        });
        sseManager.emit(candidate.id, "educations", {
          educations: updated.educations,
        });
        return {
          status: "success",
          message: "Educations updated",
          count: formatted.length,
          educations: updated.educations,
        };
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "add_education",
    "Add a new education entry to candidate's profile.",
    {
      institute: z.string().describe("University or school name"),
      course: z.string().describe("Degree or program name"),
      start_date: z.string().describe('Start date e.g. "2018"'),
      end_date: z
        .string()
        .default("Present")
        .describe('End date e.g. "2022" or "Present"'),
      description: z
        .string()
        .optional()
        .nullable()
        .describe("Additional description"),
    },
    async ({ institute, course, start_date, end_date, description }) => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const current = (candidate.educations as object[] | null) ?? [];
        const entry = {
          institute,
          course,
          start_date,
          end_date,
          description: formatDescriptionAsHtml(description ?? undefined),
        };
        const updated = await prisma.candidate_profile.update({
          where: { id: candidate.id },
          data: { educations: [...current, entry] },
        });
        sseManager.emit(candidate.id, "educations", {
          educations: updated.educations,
        });
        return {
          status: "success",
          message: `Education at ${institute} added`,
          count: (updated.educations as object[]).length,
          educations: updated.educations,
        };
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );
}
