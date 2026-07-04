import { getDatabase } from '../db/connection';
import type { User } from '@prisma/client';

export class AuthService {
  async syncUser(supabaseId: string, email?: string): Promise<User> {
    const prisma = getDatabase();

    try {
      // Try to find existing user
      let user = await prisma.user.findUnique({
        where: { id: supabaseId },
      });

      if (user) {
        // User exists, update email if provided and changed
        if (email && user.email !== email) {
          user = await prisma.user.update({
            where: { id: supabaseId },
            data: { email },
          });
        }
        // Otherwise return unchanged user (idempotent)
      } else {
        // Create new user
        if (!email) {
          throw new Error('Email is required when creating a new user');
        }

        user = await prisma.user.create({
          data: {
            id: supabaseId,
            email,
          },
        });
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const prisma = getDatabase();

    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }
}
