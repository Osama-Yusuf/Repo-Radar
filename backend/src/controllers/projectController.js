const { runAsync, getAsync, allAsync } = require('../config/database');

class ProjectController {
    constructor(projectService, db) {
        this.projectService = projectService;
        this.db = db;
    }

    async getAllProjects(req, res) {
        try {
            const projects = await allAsync(this.db, `
                SELECT p.*, GROUP_CONCAT(b.branch_name) as branches
                FROM projects p
                LEFT JOIN branches b ON p.id = b.project_id
                GROUP BY p.id
            `);

            const projectsWithActions = await Promise.all(projects.map(async (project) => {
                const actions = await allAsync(this.db, 'SELECT * FROM actions WHERE project_id = ?', [project.id]);
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
    }

    async getProjectById(req, res) {
        const { id } = req.params;

        try {
            const project = await getAsync(this.db, 'SELECT * FROM projects WHERE id = ?', [id]);
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const branches = await allAsync(this.db, 'SELECT branch_name FROM branches WHERE project_id = ?', [id]);
            project.branches = branches.map(b => b.branch_name);

            const actions = await allAsync(this.db, 'SELECT * FROM actions WHERE project_id = ?', [id]);
            project.actions = actions;

            res.json(project);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async createProject(req, res) {
        const { name, repoUrl, branches, checkInterval } = req.body;

        if (checkInterval && checkInterval < 1) {
            return res.status(400).json({ error: 'Check interval must be at least 1 minute' });
        }

        try {
            const projectId = await runAsync(this.db, 
                'INSERT INTO projects (name, repo_url, check_interval) VALUES (?, ?, ?)',
                [name, repoUrl, checkInterval || 5]
            ).then(result => result.lastID);

            const branchPromises = branches.map(branch => {
                return runAsync(this.db, 
                    'INSERT INTO branches (project_id, branch_name) VALUES (?, ?)',
                    [projectId, branch.trim()]
                );
            });

            await Promise.all(branchPromises);

            const project = {
                id: projectId,
                name,
                repo_url: repoUrl,
                check_interval: checkInterval || 5
            };

            this.projectService.setupProjectTimer(project);
            res.status(201).json(project);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async updateProject(req, res) {
        const { id } = req.params;
        const { name, repoUrl, branches, checkInterval } = req.body;

        if (checkInterval && checkInterval < 1) {
            return res.status(400).json({ error: 'Check interval must be at least 1 minute' });
        }

        try {
            await runAsync(this.db, 'BEGIN TRANSACTION');

            await runAsync(this.db, 
                'UPDATE projects SET name = ?, repo_url = ?, check_interval = ? WHERE id = ?',
                [name, repoUrl, checkInterval, id]
            );

            await runAsync(this.db, 'DELETE FROM branches WHERE project_id = ?', [id]);

            const branchPromises = branches.map(branch => {
                return runAsync(this.db, 
                    'INSERT INTO branches (project_id, branch_name) VALUES (?, ?)',
                    [id, branch.trim()]
                );
            });

            await Promise.all(branchPromises);
            await runAsync(this.db, 'COMMIT');

            const project = {
                id: parseInt(id),
                name,
                repo_url: repoUrl,
                check_interval: checkInterval,
                branches
            };

            this.projectService.setupProjectTimer(project);
            res.json(project);
        } catch (err) {
            await runAsync(this.db, 'ROLLBACK');
            console.error('Error updating project:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async deleteProject(req, res) {
        const { id } = req.params;

        try {
            this.projectService.clearTimer(parseInt(id));
            await runAsync(this.db, 'DELETE FROM branches WHERE project_id = ?', [id]);
            await runAsync(this.db, 'DELETE FROM projects WHERE id = ?', [id]);

            if (await getAsync(this.db, 'SELECT id FROM projects WHERE id = ?', [id])) {
                res.status(404).json({ error: 'Project not found' });
            } else {
                res.json({ message: 'Project deleted successfully' });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getProjectLogs(req, res) {
        const { projectId } = req.params;
        const { limit = 50 } = req.query;

        try {
            const logs = await allAsync(this.db, `
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
    }
}

module.exports = ProjectController;
