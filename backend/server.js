const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const { initializeDatabase } = require('./src/config/database');
const { pool } = require('./src/config/drizzle');
const specs = require('./src/config/swagger');
const ProjectService = require('./src/services/projectService');
const ProjectController = require('./src/controllers/projectController');
const ActionController = require('./src/controllers/actionController');
const AuthController = require('./src/controllers/authController');
const setupProjectRoutes = require('./src/routes/projectRoutes');
const setupActionRoutes = require('./src/routes/actionRoutes');
const setupAuthRoutes = require('./src/routes/authRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes'); // Import settings routes
const k8sRoutes = require('./src/routes/k8s');
const tektonRoutes = require('./src/routes/tekton');
const vulnerabilityRoutes = require('./src/routes/vulnerabilities');
const appStatusRoutes = require('./src/routes/appStatusRoutes'); // Import app status routes
const { startMonitoring: startK8sImageMonitoring } = require('./src/services/k8sImageMonitorService');
const { startSchedulers: startAppStatusSchedulers } = require('./src/services/appStatusSchedulerService'); // Import app status scheduler

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize database and services
async function initializeApp() {
    try {
        // Initialize database first
        const db = await initializeDatabase();
        console.log('Database initialized successfully');

        // Initialize services with database instance
        const projectService = new ProjectService(db);
        await projectService.initialize(); // Initialize ProjectService (which includes GitHubService)
        console.log('Project service initialized');

        // Initialize controllers with database instance
        const projectController = new ProjectController(projectService, db);
        const actionController = new ActionController(db);
        const authController = new AuthController(db);
        console.log('Controllers initialized');

        // Setup routes
        const projectRouter = setupProjectRoutes(projectController);
        const actionRouter = setupActionRoutes(actionController);
        const authRouter = setupAuthRoutes(authController);
        console.log('Routes initialized');

        // API routes
        app.use('/api/projects', projectRouter);
        app.use('/api', actionRouter);
        app.use('/api/auth', authRouter);
        app.use('/api/settings', settingsRoutes); // Use settings routes
        app.use('/api/k8s', k8sRoutes);
        app.use('/api/tekton', tektonRoutes);
        app.use('/api/vulnerabilities', vulnerabilityRoutes); // Mount vulnerability routes
        app.use('/api/status', appStatusRoutes); // Mount app status routes

        // Swagger documentation
        app.use('/', swaggerUi.serve);
        app.get('/', swaggerUi.setup(specs));

        // Initialize project timers after everything is set up
        await projectService.initializeProjectTimers();
        console.log('Project timers initialized');

        // Start Kubernetes Image Monitoring
        if (startK8sImageMonitoring) { // Check if the import was successful / function exists
            await startK8sImageMonitoring(); // Await the async function
            console.log('Kubernetes image monitoring service started.');
        } else {
            console.warn('Kubernetes image monitoring service could not be started (startMonitoring function not found).');
        }
        
        // Start Application Status Schedulers
        if (startAppStatusSchedulers) {
            startAppStatusSchedulers();
            console.log('Application status monitoring schedulers started.');
        } else {
            console.warn('Application status monitoring schedulers could not be started (startSchedulers function not found).');
        }

        // Start server
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });

        // Handle graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('SIGTERM signal received: closing HTTP server');
            await pool.end();
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
