const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Savoria POS API Documentation',
      version: '1.0.0',
      description: 'Dokumentasi lengkap API untuk Backend POS System (Node.js, Express, Prisma)',
      contact: {
        name: 'Backend Developer',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'CASHIER'] },
            imageUrl: { type: 'string' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            sku: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            costPrice: { type: 'number' },
            stock: { type: 'integer' },
            imageUrl: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            userId: { type: 'integer' },
            customerId: { type: 'integer', nullable: true },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'integer' },
                  qty: { type: 'integer' },
                },
              },
            },
            payment: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['CASH', 'QRIS'] },
                amount: { type: 'number' },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], 
};

const specs = swaggerJsdoc(options);
module.exports = specs;