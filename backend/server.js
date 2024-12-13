const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { Octokit } = require('@octokit/rest');
const axios = require('axios');
const fs = require('fs').promises;
const util = require('util');
const exec = util.promisify(require('child_process').exec);
require('dotenv').config();
const swaggerUi = require('swagger-ui-express');
const specs = require('./swagger');

const app = express();
const port = process.env.PORT || 3001;

// Initialize Octokit
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    userAgent: 'github-watcher-app v1.0',
    baseUrl: 'https://api.github.com'
});

// Helper function to extract repo info from URL
function extractRepoInfo(repoUrl) {
    const url = repoUrl.trim();
    const parts = url
        .replace('https://github.com/', '')
        .replace('.git', '')
        .split('/');
    return {
        owner: parts[0],
        repo: parts[1]
    };
}

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database connection and initialization
const dbFile = './database.sqlite';

async function initializeDatabase() {
    // Check if database file exists
    try {
        await fs.access(dbFile);
        console.log('Database file exists');
    } catch {
        console.log('Creating new database file');
        await fs.writeFile(dbFile, '');
    }

    // Connect to database
    const db = new sqlite3.Database(dbFile, async (err) => {
        if (err) {
            console.error('Error connecting to SQLite database:', err);
        } else {
            console.log('Connected to SQLite database');
            await createTables(db);
        }
    });

    return db;
}

// Promisify database operations
function runAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function getAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function allAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Create tables if they don't exist
async function createTables(db) {
    try {
        // Begin transaction
        await runAsync(db, 'BEGIN TRANSACTION');

        // Create projects table
        await runAsync(db, `
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                repo_url TEXT NOT NULL,
                check_interval INTEGER DEFAULT 5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Projects table ready');

        // Create branches table
        await runAsync(db, `
            CREATE TABLE IF NOT EXISTS branches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                branch_name TEXT NOT NULL,
                last_commit_sha TEXT,
                FOREIGN KEY (project_id) REFERENCES projects (id)
                ON DELETE CASCADE
            )
        `);
        console.log('Branches table ready');

        // Create check_logs table
        await runAsync(db, `
            CREATE TABLE IF NOT EXISTS check_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                branch_name TEXT NOT NULL,
                commit_sha TEXT,
                commit_message TEXT,
                commit_author TEXT,
                commit_date DATETIME,
                checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT,
                FOREIGN KEY (project_id) REFERENCES projects (id)
                ON DELETE CASCADE
            )
        `);
        console.log('Check logs table ready');

        // Create actions table
        await runAsync(db, `
            CREATE TABLE IF NOT EXISTS actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                name TEXT,
                action_type TEXT NOT NULL,
                webhook_url TEXT,
                script_content TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects (id)
                ON DELETE CASCADE
            )
        `);
        console.log('Actions table ready');

        // Create secrets table
        await runAsync(db, `
            CREATE TABLE IF NOT EXISTS secrets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_id INTEGER,
                name TEXT NOT NULL,
                value TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (action_id) REFERENCES actions (id)
                ON DELETE CASCADE
            )
        `);
        console.log('Secrets table ready');

        // Commit transaction
        await runAsync(db, 'COMMIT');
        console.log('Database initialization completed successfully');

    } catch (err) {
        // Rollback transaction on error
        await runAsync(db, 'ROLLBACK');
        console.error('Error initializing database:', err);
        throw err;
    }
}

// Initialize database
let db;
(async () => {
    try {
        db = await initializeDatabase();
        // Initialize project timers after database is ready
        await initializeProjectTimers();
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
})();

// Store project timers
const projectTimers = new Map();

// Function to setup project timer
function setupProjectTimer(project) {
    // Clear existing timer if any
    if (projectTimers.has(project.id)) {
        clearInterval(projectTimers.get(project.id));
    }

    // Convert check interval from minutes to milliseconds
    const intervalMs = project.check_interval * 60 * 1000;
    
    // Create new timer
    const timerId = setInterval(async () => {
        try {
            await checkProjectChanges(project);
        } catch (error) {
            console.error(`Error checking project ${project.name}:`, error);
        }
    }, intervalMs);

    // Store timer reference
    projectTimers.set(project.id, timerId);
    console.log(`Set up timer for project ${project.name} with interval ${project.check_interval} minutes`);
}

// Function to check a single project
async function checkProjectChanges(project) {
    console.log(`Checking project ${project.name}...`);
    
    try {
        const branches = await allAsync(db, 'SELECT * FROM branches WHERE project_id = ?', [project.id]);

        for (const branch of branches) {
            try {
                const repoInfo = extractRepoInfo(project.repo_url);
                const response = await octokit.repos.getBranch({
                    owner: repoInfo.owner,
                    repo: repoInfo.repo,
                    branch: branch.branch_name,
                });

                const latestCommit = response.data.commit;
                if (latestCommit.sha !== branch.last_commit_sha) {
                    console.log(`Changes detected in ${project.name}/${branch.branch_name}`);
                    
                    // Update branch with new commit SHA
                    await runAsync(db, 'UPDATE branches SET last_commit_sha = ? WHERE id = ?', [latestCommit.sha, branch.id]);

                    // Update project's updated_at timestamp
                    await runAsync(db, 'UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [project.id]);

                    // Log the change
                    await runAsync(db, `
                        INSERT INTO check_logs 
                        (project_id, branch_name, commit_sha, commit_message, commit_author, commit_date, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                        project.id,
                        branch.branch_name,
                        latestCommit.sha,
                        latestCommit.commit.message,
                        latestCommit.commit.author.name,
                        latestCommit.commit.author.date,
                        'CHANGE_DETECTED'
                    ]);

                    // Execute actions for this project
                    const actions = await allAsync(db, 'SELECT * FROM actions WHERE project_id = ?', [project.id]);

                    for (const action of actions) {
                        try {
                            if (action.webhook_url) {
                                // Execute webhook action
                                await axios.post(action.webhook_url, {
                                    project: project.name,
                                    branch: branch.branch_name,
                                    commit: {
                                        sha: latestCommit.sha,
                                        message: latestCommit.commit.message,
                                        author: latestCommit.commit.author.name,
                                        date: latestCommit.commit.author.date
                                    }
                                });
                            }

                            if (action.script_content) {
                                // Get action secrets
                                const secrets = await allAsync(db, 'SELECT name, value FROM secrets WHERE action_id = ?', [action.id]);
                                
                                // Create environment variables string
                                const envVars = secrets.map(secret => `export ${secret.name}="${secret.value}"`).join('\n');
                                
                                // Combine env vars with script content
                                const fullScriptContent = `#!/bin/bash\n\n# Set environment variables\n${envVars}\n\n# Main script\n${action.script_content}`;
                                
                                // Execute bash script
                                const scriptPath = `/tmp/action_${action.id}_${Date.now()}.sh`;
                                await fs.promises.writeFile(scriptPath, fullScriptContent);
                                await fs.promises.chmod(scriptPath, '755');
                                
                                try {
                                    const { stdout, stderr } = await util.promisify(exec)(scriptPath);
                                    console.log(`Script output for action ${action.id}:`, stdout);
                                    if (stderr) console.error(`Script error for action ${action.id}:`, stderr);
                                } finally {
                                    // Clean up the temporary script file
                                    await fs.promises.unlink(scriptPath).catch(console.error);
                                }
                            }
                        } catch (actionError) {
                            console.error(`Error executing action ${action.id}:`, actionError);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error checking branch ${branch.branch_name}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error in checkProjectChanges for ${project.name}:`, error);
    }
}

// Function to get secrets for an action
async function getActionSecrets(actionId) {
    return allAsync(db, 'SELECT name, value FROM secrets WHERE action_id = ?', [actionId]);
}

// Function to initialize all project timers
async function initializeProjectTimers() {
    try {
        const projects = await allAsync(db, 'SELECT * FROM projects');

        for (const project of projects) {
            setupProjectTimer(project);
        }
        
        console.log(`Initialized timers for ${projects.length} projects`);
    } catch (error) {
        console.error('Error initializing project timers:', error);
    }
}

// Routes
app.use('/', swaggerUi.serve);
app.get('/', swaggerUi.setup(specs));

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all projects
 *     description: Retrieve a list of all projects with their branches and actions
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: A list of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/projects', async (req, res) => {
    try {
        // First get projects with branches
        const projects = await allAsync(db, `
            SELECT p.*, GROUP_CONCAT(b.branch_name) as branches
            FROM projects p
            LEFT JOIN branches b ON p.id = b.project_id
            GROUP BY p.id
        `);

        // Then fetch actions for each project
        const projectsWithActions = await Promise.all(projects.map(async (project) => {
            const actions = await allAsync(db, 'SELECT * FROM actions WHERE project_id = ?', [project.id]);
            return {
                ...project,
                branches: project.branches ? project.branches.split(',') : [],
                actions: actions || []
            };
        }));
        
        res.json(projectsWithActions);
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     description: Create a new project with branches
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - repoUrl
 *               - branches
 *               - checkInterval
 *             properties:
 *               name:
 *                 type: string
 *               repoUrl:
 *                 type: string
 *               branches:
 *                 type: array
 *                 items:
 *                   type: string
 *               checkInterval:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/projects', async (req, res) => {
    const { name, repoUrl, branches, checkInterval } = req.body;
    
    if (checkInterval && checkInterval < 1) {
        return res.status(400).json({ error: 'Check interval must be at least 1 minute' });
    }

    try {
        const projectId = await runAsync(db, 'INSERT INTO projects (name, repo_url, check_interval) VALUES (?, ?, ?)',
            [name, repoUrl, checkInterval || 5]).then(result => result.lastID);

        const branchPromises = branches.map(branch => {
            return runAsync(db, 'INSERT INTO branches (project_id, branch_name) VALUES (?, ?)',
                [projectId, branch.trim()]);
        });

        await Promise.all(branchPromises);

        const project = {
            id: projectId,
            name,
            repo_url: repoUrl,
            check_interval: checkInterval || 5
        };
        setupProjectTimer(project);
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /projects/{projectId}/actions:
 *   get:
 *     summary: Get project actions
 *     description: Retrieve all actions for a specific project
 *     tags: [Actions]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of actions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Action'
 */
app.get('/api/projects/:projectId/actions', async (req, res) => {
    const { projectId } = req.params;
    
    try {
        const actions = await allAsync(db, 'SELECT * FROM actions WHERE project_id = ?', [projectId]);
        res.json(actions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /projects/{projectId}/actions:
 *   post:
 *     summary: Create project action
 *     description: Create a new action for a specific project
 *     tags: [Actions]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - actionType
 *             properties:
 *               name:
 *                 type: string
 *               actionType:
 *                 type: string
 *                 enum: [webhook, script]
 *               webhookUrl:
 *                 type: string
 *               scriptContent:
 *                 type: string
 *     responses:
 *       201:
 *         description: Action created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Action'
 */
app.post('/api/projects/:projectId/actions', (req, res) => {
    const { projectId } = req.params;
    const { name, actionType, webhookUrl, scriptContent } = req.body;

    if (!actionType || (!webhookUrl && !scriptContent)) {
        return res.status(400).json({ error: 'Action type and either webhook URL or script content are required' });
    }

    db.run(
        'INSERT INTO actions (project_id, name, action_type, webhook_url, script_content) VALUES (?, ?, ?, ?, ?)',
        [projectId, name || null, actionType, webhookUrl, scriptContent],
        function(err) {
            if (err) {
                console.error('Error creating action:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                id: this.lastID,
                project_id: projectId,
                name,
                action_type: actionType,
                webhook_url: webhookUrl,
                script_content: scriptContent
            });
        }
    );
});

/**
 * @swagger
 * /projects/{projectId}/logs:
 *   get:
 *     summary: Get project logs
 *     description: Retrieve execution logs for a specific project
 *     tags: [Logs]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Log'
 */
app.get('/api/projects/:projectId/logs', async (req, res) => {
    const { projectId } = req.params;
    const { limit = 50 } = req.query;

    try {
        const logs = await allAsync(db, `
            SELECT 
                cl.*,
                p.name as project_name,
                p.repo_url
            FROM check_logs cl
            JOIN projects p ON cl.project_id = p.id
            WHERE cl.project_id = ?
            ORDER BY cl.checked_at DESC
            LIMIT ?
        `, [projectId, limit]);

        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    const { id } = req.params;

    // Clear the timer if it exists
    if (projectTimers.has(parseInt(id))) {
        clearInterval(projectTimers.get(parseInt(id)));
        projectTimers.delete(parseInt(id));
    }

    try {
        await runAsync(db, 'DELETE FROM projects WHERE id = ?', [id]);

        if (await getAsync(db, 'SELECT id FROM projects WHERE id = ?', [id])) {
            res.status(404).json({ error: 'Project not found' });
        } else {
            res.json({ message: 'Project deleted successfully' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Actions endpoints
app.put('/api/projects/:projectId/actions/:actionId', async (req, res) => {
    const { projectId, actionId } = req.params;
    const { name, actionType, webhookUrl, scriptContent } = req.body;

    if (!actionType || (!webhookUrl && !scriptContent)) {
        return res.status(400).json({ error: 'Action type and either webhook URL or script content are required' });
    }

    try {
        await runAsync(db, `UPDATE actions 
            SET name = ?, action_type = ?, webhook_url = ?, script_content = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND project_id = ?`,
            [name || null, actionType, webhookUrl, scriptContent, actionId, projectId]);

        if (await getAsync(db, 'SELECT id FROM actions WHERE id = ? AND project_id = ?', [actionId, projectId])) {
            res.status(404).json({ error: 'Action not found' });
        } else {
            res.json({
                id: actionId,
                projectId,
                name,
                actionType,
                webhookUrl,
                scriptContent
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:projectId/actions/:actionId', async (req, res) => {
    const { projectId, actionId } = req.params;

    try {
        await runAsync(db, 'DELETE FROM actions WHERE id = ? AND project_id = ?', [actionId, projectId]);

        if (await getAsync(db, 'SELECT id FROM actions WHERE id = ? AND project_id = ?', [actionId, projectId])) {
            res.status(404).json({ error: 'Action not found' });
        } else {
            res.json({ message: 'Action deleted successfully' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Secrets endpoints
app.get('/api/actions/:actionId/secrets', async (req, res) => {
    const { actionId } = req.params;
    
    try {
        const secrets = await allAsync(db, 'SELECT id, name, created_at FROM secrets WHERE action_id = ?', [actionId]);
        res.json(secrets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/actions/:actionId/secrets', async (req, res) => {
    const { actionId } = req.params;
    const { name, value } = req.body;

    if (!name || !value) {
        res.status(400).json({ error: 'Name and value are required' });
        return;
    }

    try {
        // Check if action exists
        if (!await getAsync(db, 'SELECT id FROM actions WHERE id = ?', [actionId])) {
            res.status(404).json({ error: 'Action not found' });
            return;
        }

        // Check if secret with same name exists
        if (await getAsync(db, 'SELECT id FROM secrets WHERE action_id = ? AND name = ?', [actionId, name])) {
            res.status(409).json({ error: 'Secret with this name already exists' });
            return;
        }

        // Insert new secret
        const secretId = await runAsync(db, 'INSERT INTO secrets (action_id, name, value) VALUES (?, ?, ?)',
            [actionId, name, value]).then(result => result.lastID);

        res.json({
            id: secretId,
            name,
            created_at: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/actions/:actionId/secrets/:secretId', async (req, res) => {
    const { actionId, secretId } = req.params;
    const { value } = req.body;

    if (!value) {
        res.status(400).json({ error: 'Value is required' });
        return;
    }

    try {
        await runAsync(db, 'UPDATE secrets SET value = ? WHERE id = ? AND action_id = ?',
            [value, secretId, actionId]);

        if (await getAsync(db, 'SELECT id FROM secrets WHERE id = ? AND action_id = ?', [secretId, actionId])) {
            res.status(404).json({ error: 'Secret not found' });
        } else {
            res.json({ message: 'Secret updated successfully' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/actions/:actionId/secrets/:secretId', async (req, res) => {
    const { actionId, secretId } = req.params;

    try {
        await runAsync(db, 'DELETE FROM secrets WHERE id = ? AND action_id = ?',
            [secretId, actionId]);

        if (await getAsync(db, 'SELECT id FROM secrets WHERE id = ? AND action_id = ?', [secretId, actionId])) {
            res.status(404).json({ error: 'Secret not found' });
        } else {
            res.json({ message: 'Secret deleted successfully' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Initialize project timers when server starts
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
