const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const { initializeDatabase } = require('./src/config/database');
const specs = require('./src/config/swagger');
const ProjectService = require('./src/services/projectService');
const ProjectController = require('./src/controllers/projectController');
const ActionController = require('./src/controllers/actionController');
const setupProjectRoutes = require('./src/routes/projectRoutes');
const setupActionRoutes = require('./src/routes/actionRoutes');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize database and services
async function initializeApp() {
    try {
        // Initialize database first
        const prisma = await initializeDatabase();
        console.log('Database initialized successfully');

        // Initialize services with database instance
        const projectService = new ProjectService(prisma);
        console.log('Project service initialized');

        // Initialize controllers with database instance
        const projectController = new ProjectController(projectService, prisma);
        const actionController = new ActionController(prisma);
        console.log('Controllers initialized');

        // Setup routes
        const projectRouter = setupProjectRoutes(projectController);
        const actionRouter = setupActionRoutes(actionController);
        console.log('Routes initialized');

        // API routes
        app.use('/api/projects', projectRouter);
        app.use('/api', actionRouter);

        // Swagger documentation
        app.use('/', swaggerUi.serve);
        app.get('/', swaggerUi.setup(specs));

        // Initialize project timers after everything is set up
        await projectService.initializeProjectTimers();
        console.log('Project timers initialized');

        // Start server
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });

        // Handle graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('SIGTERM signal received: closing HTTP server');
            await prisma.$disconnect();
            console.log('Database connection closed');
            process.exit(0);
        });

    } catch (err) {
        console.error('Failed to initialize application:', err);
        process.exit(1);
    }
}

// Initialize the application
initializeApp();
