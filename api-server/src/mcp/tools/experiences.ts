import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "@prisma/client";
import type { SseManager } from "../../utils/sse-manager.js";
import { withCandidate } from "../with-candidate.js";
import { formatDescriptionAsHtml } from "../helpers.js";

const experienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  start_date: z.string(),
  end_date: z.string().default("Present"),
  description: z.string().optional().nullable(),
  tech_stack: z.array(z.string()).default([]),
});

/**
 * Deprecated, No more mcps that update database since we are moving to hitl
 */
export function registerExperiencesTools(
  server: McpServer,
  prisma: PrismaClient,
  sseManager: SseManager,
): void {
  server.tool(
    "update_experiences",
    "Update candidate's work experiences (replaces entire list). Description is formatted as HTML bullet points.",
    {
      experiences: z
        .array(experienceSchema)
        .describe(
          "Complete list of experiences with company, role, start_date, end_date, description, tech_stack",
        ),
    },
    async ({ experiences }) => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const formatted = experiences.map((exp) => ({
          ...exp,
          description: formatDescriptionAsHtml(exp.description ?? undefined),
        }));
        const updated = await prisma.candidate_profile.update({
          where: { id: candidate.id },
          data: { experiences: formatted },
        });
        sseManager.emit(candidate.id, "experiences", {
          experiences: updated.experiences,
        });
        return {
          status: "success",
          message: "Experiences updated",
          count: formatted.length,
          experiences: updated.experiences,
        };
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "add_experience",
    "Add a new work experience to candidate's profile.",
    {
      company: z.string().describe("Company name"),
      role: z.string().describe("Job title/role"),
      start_date: z.string().describe('Start date e.g. "Jan 2020"'),
      end_date: z.string().default("Present").describe('End date or "Present"'),
      description: z
        .string()
        .optional()
        .nullable()
        .describe("Role description, formatted as bullet points"),
      tech_stack: z.array(z.string()).default([]).describe("Technologies used"),
    },
    async ({
      company,
      role,
      start_date,
      end_date,
      description,
      tech_stack,
    }) => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const current = (candidate.experiences as object[] | null) ?? [];
        const entry = {
          company,
          role,
          start_date,
          end_date,
          description: formatDescriptionAsHtml(description ?? undefined),
          tech_stack,
        };
        const updated = await prisma.candidate_profile.update({
          where: { id: candidate.id },
          data: { experiences: [...current, entry] },
        });
        sseManager.emit(candidate.id, "experiences", {
          experiences: updated.experiences,
        });
        return {
          status: "success",
          message: `Experience at ${company} added`,
          count: (updated.experiences as object[]).length,
          experiences: updated.experiences,
        };
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );
}
