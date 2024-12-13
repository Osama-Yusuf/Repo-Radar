const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Repo Radar API',
      version: '1.0.0',
      description: 'API documentation for Repo Radar backend service',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Project: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            repo_url: { type: 'string' },
            check_interval: { type: 'integer' },
            last_check: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
            branches: {
              type: 'array',
              items: { type: 'string' }
            },
            actions: {
              type: 'array',
              items: { $ref: '#/components/schemas/Action' }
            }
          }
        },
        Action: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            project_id: { type: 'integer' },
            name: { type: 'string' },
            action_type: {
              type: 'string',
              enum: ['webhook', 'script']
            },
            webhook_url: { type: 'string' },
            script_content: { type: 'string' }
          }
        },
        Log: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            project_id: { type: 'integer' },
            commit_hash: { type: 'string' },
            commit_message: { type: 'string' },
            branch: { type: 'string' },
            status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./server.js'], // Path to the API docs
};

module.exports = swaggerJsdoc(options);
