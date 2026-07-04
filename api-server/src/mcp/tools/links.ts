import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "@prisma/client";
import type { SseManager } from "../../utils/sse-manager.js";
import { withCandidate } from "../with-candidate.js";

const linkSchema = z.object({
  url: z.string().describe("Full URL"),
  social_media: z.string().describe('Platform name e.g. "github", "linkedIN"'),
});

/**
 * Deprecated, No more mcps that update database since we are moving to hitl
 */
export function registerLinksTools(
  server: McpServer,
  prisma: PrismaClient,
  sseManager: SseManager,
): void {
  server.tool(
    "update_social_links",
    "Update candidate's social media links (replaces entire list).",
    {
      links: z
        .array(linkSchema)
        .describe("List of links with url and social_media fields"),
    },
    async ({ links }) => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const updated = await prisma.candidate_profile.update({
          where: { id: candidate.id },
          data: { links },
        });
        sseManager.emit(candidate.id, "links", { links: updated.links });
        return {
          status: "success",
          message: "Social links updated",
          count: links.length,
          links: updated.links,
        };
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "add_social_link",
    "Add a single social media link to candidate's profile.",
    {
      url: z.string().describe("Full URL to the profile"),
      social_media: z
        .string()
        .describe(
          'Platform name e.g. "linkedIN", "github", "twitter", "portfolio"',
        ),
    },
    async ({ url, social_media }) => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const current = (candidate.links as object[] | null) ?? [];
        const entry = { url, social_media };
        const updated = await prisma.candidate_profile.update({
          where: { id: candidate.id },
          data: { links: [...current, entry] },
        });
        sseManager.emit(candidate.id, "links", { links: updated.links });
        return {
          status: "success",
          message: `Link to ${social_media} added`,
          count: (updated.links as object[]).length,
          links: updated.links,
        };
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );
}
