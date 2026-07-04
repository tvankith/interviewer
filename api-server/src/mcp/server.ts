import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { PrismaClient } from "@prisma/client";
import type { FastifyRequest, FastifyReply } from "fastify";
import { requestStore } from "./with-candidate.js";
import { registerProfileTools } from "./tools/profile.js";
import { registerSpecsTools } from "./tools/specs.js";

function buildMcpServer(prisma: PrismaClient): McpServer {
  const server = new McpServer({ name: "resume-editor", version: "1.0.0" });

  registerProfileTools(server, prisma);
  registerSpecsTools(server, prisma);

  return server;
}

export function createMcpHandler(prisma: PrismaClient) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    // Extract candidate_id from header so tool handlers can access it via AsyncLocalStorage
    const candidateId =
      (request.headers["x-candidate-id"] as string | undefined) ?? "";

    // Stateless transport: a fresh server + transport must be created per request.
    // Reusing a single McpServer across requests throws
    // "Already connected to a transport" because Protocol.connect() rejects a
    // second transport while the first is still attached.
    const mcpServer = buildMcpServer(prisma);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    reply.raw.on("close", () => {
      void transport.close();
      void mcpServer.close();
    });

    await requestStore.run({ candidateId }, async () => {
      await mcpServer.connect(transport);
      await transport.handleRequest(request.raw, reply.raw, request.body);
    });
  };
}
