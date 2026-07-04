import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "@prisma/client";
import type { SseManager } from "../../utils/sse-manager.js";
import { withCandidate } from "../with-candidate.js";
import { formatDescriptionAsHtml } from "../helpers.js";

const projectSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  tech_stack: z.array(z.string()).default([]),
});

/**
 * Deprecated, No more mcps that update database since we are moving to hitl
 */
export function registerProjectsTools(
  server: McpServer,
  prisma: PrismaClient,
  sseManager: SseManager,
): void {
  server.tool(
    "update_projects",
    "Update candidate's projects (replaces entire list). Description is formatted as HTML bullet points.",
    {
      projects: z
        .array(projectSchema)
        .describe(
          "Complete list of projects with name, description, tech_stack",
        ),
    },
    async ({ projects }) => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const formatted = projects.map((p) => ({
          ...p,
          description: formatDescriptionAsHtml(p.description ?? undefined),
        }));
        const updated = await prisma.candidate_profile.update({
          where: { id: candidate.id },
          data: { projects: formatted },
        });
        sseManager.emit(candidate.id, "projects", {
          projects: updated.projects,
        });
        return {
          status: "success",
          message: "Projects updated",
          count: formatted.length,
          projects: updated.projects,
        };
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "add_project",
    "Add a new project to candidate's profile.",
    {
      name: z.string().describe("Project name"),
      description: z
        .string()
        .optional()
        .nullable()
        .describe("Project description"),
      tech_stack: z.array(z.string()).default([]).describe("Technologies used"),
    },
    async ({ name, description, tech_stack }) => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const current = (candidate.projects as object[] | null) ?? [];
        const entry = {
          name,
          description: formatDescriptionAsHtml(description ?? undefined),
          tech_stack,
        };
        const updated = await prisma.candidate_profile.update({
          where: { id: candidate.id },
          data: { projects: [...current, entry] },
        });
        sseManager.emit(candidate.id, "projects", {
          projects: updated.projects,
        });
        return {
          status: "success",
          message: `Project '${name}' added`,
          count: (updated.projects as object[]).length,
          projects: updated.projects,
        };
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );
}
