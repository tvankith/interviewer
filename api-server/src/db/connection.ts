import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

export function initializeDatabase(): void {
  if (prisma) {
    return; // Already initialized
  }

  prisma = new PrismaClient({
    log: ['warn', 'error'],
  });
}

export async function testDatabaseConnection(): Promise<void> {
  if (!prisma) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  await prisma.$queryRaw`SELECT 1`;
}

export function getDatabase(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return prisma;
}

export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
