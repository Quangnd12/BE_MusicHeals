const swaggerJsdoc = require('swagger-jsdoc');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MusicHeals API',
      version: '1.0.0',
      description: 'API documentation for MusicHeals project',
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/models/*.js'], // Đường dẫn tới các file chứa routes và models
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;