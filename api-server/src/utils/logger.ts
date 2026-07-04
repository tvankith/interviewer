import type { FastifyInstance } from 'fastify';

export interface LogContext {
  userId?: string;
  correlationId?: string;
  requestId?: string;
  [key: string]: any;
}

export class Logger {
  private fastifyLogger: any;
  private context: LogContext = {};

  constructor(fastifyLogger: any) {
    this.fastifyLogger = fastifyLogger;
  }

  withContext(context: LogContext): Logger {
    this.context = { ...this.context, ...context };
    return this;
  }

  private mergeContext(extra?: Record<string, any>) {
    return { ...this.context, ...extra };
  }

  info(message: string, extra?: Record<string, any>) {
    this.fastifyLogger.info(this.mergeContext(extra), message);
  }

  debug(message: string, extra?: Record<string, any>) {
    this.fastifyLogger.debug(this.mergeContext(extra), message);
  }

  warn(message: string, extra?: Record<string, any>) {
    this.fastifyLogger.warn(this.mergeContext(extra), message);
  }

  error(message: string | Error, extra?: Record<string, any>) {
    const errorMessage = message instanceof Error ? message.message : message;
    const errorStack = message instanceof Error ? message.stack : undefined;
    this.fastifyLogger.error(
      this.mergeContext({ ...extra, stack: errorStack }),
      errorMessage
    );
  }

  // Auth-specific logging
  authAttempt(details: {
    method: string;
    provider?: string;
    email?: string;
    success: boolean;
    reason?: string;
  }) {
    const level = details.success ? 'info' : 'warn';
    this.fastifyLogger[level](
      this.mergeContext({
        event: 'auth_attempt',
        method: details.method,
        provider: details.provider,
        email: details.email,
        success: details.success,
        reason: details.reason,
      }),
      `Authentication ${details.success ? 'succeeded' : 'failed'}: ${details.method}`
    );
  }

  tokenValidation(details: {
    success: boolean;
    algorithm?: string;
    source?: 'header' | 'cookie';
    userId?: string;
    error?: string;
  }) {
    const level = details.success ? 'debug' : 'warn';
    this.fastifyLogger[level](
      this.mergeContext({
        event: 'token_validation',
        success: details.success,
        algorithm: details.algorithm,
        source: details.source,
        userId: details.userId,
        error: details.error,
      }),
      `Token validation ${details.success ? 'succeeded' : 'failed'}`
    );
  }

  databaseOperation(details: {
    operation: string;
    table: string;
    success: boolean;
    duration: number;
    error?: string;
    recordCount?: number;
  }) {
    const level = details.success ? 'debug' : 'error';
    this.fastifyLogger[level](
      this.mergeContext({
        event: 'db_operation',
        operation: details.operation,
        table: details.table,
        success: details.success,
        duration: details.duration,
        recordCount: details.recordCount,
        error: details.error,
      }),
      `Database ${details.operation} on ${details.table} (${details.duration}ms)`
    );
  }

  externalRequest(details: {
    service: string;
    endpoint: string;
    method: string;
    status?: number;
    duration: number;
    success: boolean;
    error?: string;
  }) {
    const level = details.success ? 'debug' : 'warn';
    this.fastifyLogger[level](
      this.mergeContext({
        event: 'external_request',
        service: details.service,
        endpoint: details.endpoint,
        method: details.method,
        status: details.status,
        duration: details.duration,
        success: details.success,
        error: details.error,
      }),
      `External request to ${details.service} ${details.method} ${details.endpoint} (${details.duration}ms)`
    );
  }

  performanceWarning(details: {
    operation: string;
    duration: number;
    threshold: number;
  }) {
    this.fastifyLogger.warn(
      this.mergeContext({
        event: 'performance_warning',
        operation: details.operation,
        duration: details.duration,
        threshold: details.threshold,
      }),
      `Slow operation detected: ${details.operation} took ${details.duration}ms (threshold: ${details.threshold}ms)`
    );
  }
}

export function createLogger(fastify: FastifyInstance): Logger {
  return new Logger(fastify.log);
}
