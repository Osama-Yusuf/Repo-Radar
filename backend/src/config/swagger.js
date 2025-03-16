const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Repo Radar API',
            version: '1.0.0',
            description: 'API documentation for Repo Radar - GitHub Repository Monitoring Tool',
        },
        components: {
            schemas: {
                Project: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        repo_url: { type: 'string' },
                        check_interval: { type: 'integer' },
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
                        branch_name: { type: 'string' },
                        commit_sha: { type: 'string' },
                        commit_message: { type: 'string' },
                        commit_author: { type: 'string' },
                        commit_date: { type: 'string' },
                        checked_at: { type: 'string' },
                        status: { type: 'string' }
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
    apis: ['./src/routes/*.js']
};

module.exports = swaggerJsdoc(options);
