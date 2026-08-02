import swaggerJsdoc from 'swagger-jsdoc';
import env from './env.js';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Recharge CRM API',
      version: env.app.version,
      description:
        'Production-ready Recharge Reseller CRM — Wallet, BBPS, Mobile Recharge, DTH, Utility payments.',
      contact: {
        name: 'Recharge CRM Support',
        email: 'support@rechargecrmapp.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: `${env.app.url}/api/v1`,
        description: 'Current environment',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Enter your API key',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                items: { type: 'array', items: {} },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    totalPages: { type: 'integer' },
                    hasNext: { type: 'boolean' },
                    hasPrev: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
