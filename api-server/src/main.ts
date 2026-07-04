import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env';
import { initializeDatabase, testDatabaseConnection, getDatabase } from './db/connection';
import { authRoutes } from './routes/auth';
import { profileRoutes } from './routes/profile';
import { profileSpecRoutes } from './routes/profile-spec';
import { resumeTemplateRoutes } from './routes/resume-template';
import { sseRoutes } from './routes/sse';
import { conversationThreadRoutes } from './routes/conversation-thread';
import { createMcpHandler } from './mcp/server';
import { sseManager } from './utils/sse-manager';
import { swaggerConfig, swaggerUiConfig } from './config/swagger';
import { registerLoggingMiddleware } from './middleware/logging';

const PORT = env.port;
const HOST = env.host;
const FRONTEND_ORIGIN = env.frontendOrigin;

async function start(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: env.logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    },
  });

  try {
    // Register plugins
    await fastify.register(helmet);
    await fastify.register(cors, {
      origin: FRONTEND_ORIGIN,
      credentials: true,
    });
    await fastify.register(cookie);
    await fastify.register(multipart, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
    });
    await fastify.register(swagger, swaggerConfig);
    await fastify.register(swaggerUi, swaggerUiConfig);

    // Register logging middleware
    await registerLoggingMiddleware(fastify);

    // Initialize database
    initializeDatabase();
    await testDatabaseConnection();

    // Register routes
    await fastify.register(authRoutes);
    await fastify.register(profileRoutes);
    await fastify.register(profileSpecRoutes);
    await fastify.register(resumeTemplateRoutes);
    await fastify.register(sseRoutes);
    await fastify.register(conversationThreadRoutes);

    // MCP endpoint — resume editor tools
    const mcpHandler = createMcpHandler(getDatabase(), sseManager);
    fastify.post('/mcp', { config: { rawBody: true } }, mcpHandler);

    // Health check endpoint
    fastify.get('/health', async () => {
      return { status: 'ok' };
    });

    // Error handler
    fastify.setErrorHandler((error, request, reply) => {
      const status = error.statusCode || 500;
      const message = error.message || 'Internal server error';
      const isOperationalError = error.statusCode && error.statusCode < 500;

      request.log[isOperationalError ? 'warn' : 'error'](
        {
          event: 'http_error',
          method: request.method,
          path: request.url,
          status,
          error: message,
          stack: error.stack,
          correlationId: (request as any).correlationId,
        },
        isOperationalError ? `Client error: ${message}` : `Server error: ${message}`
      );

      reply.status(status).send({
        error: {
          statusCode: status,
          message,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          correlationId: (request as any).correlationId,
        },
      });
    });

    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
