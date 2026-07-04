import dotenv from 'dotenv';

dotenv.config();

/**
 * Single source of truth for api-server environment configuration.
 * Any required variable that's missing fails startup immediately instead
 * of surfacing as a runtime error deep in a request handler.
 */

function fail(message: string): never {
  // eslint-disable-next-line no-console
  console.error(`[config] ${message}`);
  if (process.env.NODE_ENV === 'test') {
    throw new Error(message);
  }
  process.exit(1);
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    fail(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(required('PORT'), 10),
  host: process.env.HOST || '0.0.0.0',
  frontendOrigin: required("FRONTEND_ORIGIN"),
  logLevel: process.env.LOG_LEVEL || 'info',
  databaseUrl: required('DATABASE_URL'),
  directUrl: required('DIRECT_URL'),
  aiServerUrl: required('AI_SERVER_URL'),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  jwtSecret: required('SUPABASE_JWT_SECRET'),
  googleApiKey: required('GOOGLE_API_KEY'),
} as const;
