// Ensures src/config/env.ts's required-variable validation passes during
// `npm test`, since tests don't go through main.ts / docker-compose env injection.
process.env.PORT ||= '3002';
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';
process.env.DIRECT_URL ||= 'postgresql://test:test@localhost:5432/test';
process.env.AI_SERVER_URL ||= 'http://localhost:3004';
process.env.SUPABASE_URL ||= 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_JWT_SECRET ||= 'test-secret';
process.env.GOOGLE_API_KEY ||= 'test-google-api-key';
