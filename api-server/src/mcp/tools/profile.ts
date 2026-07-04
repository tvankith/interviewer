import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "@prisma/client";
import type { SseManager } from "../../utils/sse-manager.js";
import { withCandidate } from "../with-candidate.js";
import { candidateToDict } from "../helpers.js";

export function registerProfileTools(
  server: McpServer,
  prisma: PrismaClient,
): void {
  server.tool(
    "get_candidate_profile",
    "Retrieve a candidate's profile with optional field filtering.",
    {
      fields: z
        .array(z.string())
        .optional()
        .describe(
          "Optional list of field names to return. Available: name, email, phone, location, summary, website, title, skills, links, experiences, projects, educations",
        ),
    },
    async ({ fields }) => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        return candidateToDict(candidate, fields);
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  /**
   * Deprecated, No more mcps that update database since we are moving to hitl
   */
  // server.tool(
  //   'update_profile_info',
  //   'Update candidate\'s basic profile information.',
  //   {
  //     name: z.string().optional().nullable().describe('Full name'),
  //     email: z.string().optional().nullable().describe('Email address'),
  //     phone: z.string().optional().nullable().describe('Phone number'),
  //     location: z.string().optional().nullable().describe('Location/city'),
  //     summary: z.string().optional().nullable().describe('Professional summary or bio'),
  //     website: z.string().optional().nullable().describe('Personal website URL'),
  //     title: z.string().optional().nullable().describe('Professional title/headline'),
  //   },
  //   async ({ name, email, phone, location, summary, website, title }) => {
  //     const result = await withCandidate(prisma, async ({ candidate }) => {
  //       const updated = await prisma.candidate_profile.update({
  //         where: { id: candidate.id },
  //         data: {
  //           ...(name !== undefined && { name }),
  //           ...(email !== undefined && { email }),
  //           ...(phone !== undefined && { phone }),
  //           ...(location !== undefined && { location }),
  //           ...(summary !== undefined && { summary }),
  //           ...(website !== undefined && { website }),
  //           ...(title !== undefined && { title }),
  //         },
  //       });
  //       const data = candidateToDict(updated);
  //       sseManager.emit(candidate.id, 'profile_info', data);
  //       return { status: 'success', message: 'Profile information updated', data };
  //     });
  //     return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  //   }
  // );
}
