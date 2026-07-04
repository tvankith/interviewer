import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui';

export const swaggerConfig = {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Profile API Server',
      description: 'REST API for managing user profiles and resume templates',
      version: '1.0.0',
      contact: {
        name: 'Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http' as const,
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token in Authorization header',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      {
        name: 'Profiles',
        description: 'User profile management endpoints',
      },
      {
        name: 'Resume Templates',
        description: 'Resume template management endpoints',
      },
      {
        name: 'Health',
        description: 'Health check endpoint',
      },
    ],
  },
};

export const swaggerUiConfig: FastifySwaggerUiOptions = {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
};
