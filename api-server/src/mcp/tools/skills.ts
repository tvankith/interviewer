import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "@prisma/client";
import type { SseManager } from "../../utils/sse-manager.js";
import { withCandidate } from "../with-candidate.js";

/**
 * Deprecated, No more mcps that update database since we are moving to hitl
 */
export function registerSkillsTools(
  server: McpServer,
  prisma: PrismaClient,
  sseManager: SseManager,
): void {
  server.tool(
    "update_skills",
    "Update candidate's skills list (replaces entire list).",
    {
      skills: z
        .array(z.string())
        .describe('List of skill names e.g. ["Python", "React"]'),
    },
    async ({ skills }) => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const updated = await prisma.candidate_profile.update({
          where: { id: candidate.id },
          data: { skills },
        });
        sseManager.emit(candidate.id, "skills", { skills: updated.skills });
        return {
          status: "success",
          message: "Skills updated",
          skills: updated.skills,
        };
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "add_skill",
    "Add a single skill to candidate's skills list (no-op if already present).",
    { skill: z.string().describe("Skill name to add") },
    async ({ skill }) => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const current = (candidate.skills as string[] | null) ?? [];
        if (current.includes(skill)) {
          return {
            status: "success",
            message: `Skill '${skill}' already exists`,
            skills: current,
          };
        }
        const updated = await prisma.candidate_profile.update({
          where: { id: candidate.id },
          data: { skills: [...current, skill] },
        });
        sseManager.emit(candidate.id, "skills", { skills: updated.skills });
        return {
          status: "success",
          message: `Skill '${skill}' added`,
          skills: updated.skills,
        };
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );
}
