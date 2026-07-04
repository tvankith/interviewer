import { randomUUID } from 'crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId?: string;
    startTime?: number;
  }
}

export async function registerLoggingMiddleware(fastify: FastifyInstance): Promise<void> {
  // Add correlation ID to all requests
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.correlationId = request.headers['x-correlation-id'] as string || randomUUID();
    request.startTime = Date.now();

    // Enrich logger context
    (request as any).log = fastify.log.child({
      correlationId: request.correlationId,
      requestId: request.id,
    });
  });

  // Log request details
  fastify.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const logLevel = env.logLevel === 'debug' ? 'debug' : 'info';
      const method = request.method;
      const path = request.url;

      // Don't log health checks excessively
      if (path === '/health') {
        return;
      }

      if (logLevel === 'debug') {
        request.log[logLevel]({
          event: 'http_request_start',
          method,
          path,
          query: request.query,
          headers: sanitizeHeaders(request.headers),
        }, `${method} ${path}`);
      } else {
        request.log.info({
          event: 'http_request_start',
          method,
          path,
        }, `${method} ${path}`);
      }
    }
  );

  // Log response details and duration
  fastify.addHook(
    'onResponse',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const path = request.url;

      // Don't log health checks
      if (path === '/health') {
        return;
      }

      const duration = Date.now() - (request.startTime || 0);
      const status = reply.statusCode;
      const method = request.method;

      const logContext = {
        event: 'http_request_complete',
        method,
        path,
        status,
        duration,
        correlationId: request.correlationId,
      };

      // Warn if request is slow (> 1000ms)
      if (duration > 1000) {
        request.log.warn(logContext, `Slow request: ${method} ${path} took ${duration}ms`);
      } else if (status >= 500) {
        request.log.error(logContext, `Server error: ${method} ${path} returned ${status}`);
      } else if (status >= 400) {
        request.log.warn(logContext, `Client error: ${method} ${path} returned ${status}`);
      } else {
        request.log.debug(logContext, `${method} ${path} completed in ${duration}ms`);
      }
    }
  );

  // Add correlation ID to response headers
  fastify.addHook(
    'onSend',
    async (request: FastifyRequest, reply: FastifyReply) => {
      reply.header('x-correlation-id', request.correlationId);
      reply.header('x-request-id', request.id);
    }
  );
}

function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sensitive = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'password',
    'token',
  ];

  const sanitized = { ...headers };
  sensitive.forEach((key) => {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}
