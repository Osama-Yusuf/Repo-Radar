const { runAsync, getAsync, allAsync } = require('../config/database');

class ProjectController {
    constructor(projectService, db) {
        this.projectService = projectService;
        this.db = db;
    }

    async getAllProjects(req, res) {
        try {
            const projects = await this.db.project.findMany({
                include: {
                    branches: true,
                    actions: true
                }
            });

            const projectsWithFormattedData = projects.map(project => ({
                id: project.id,
                name: project.name,
                repo_url: project.repoUrl,
                check_interval: project.checkInterval,
                created_at: project.createdAt,
                updated_at: project.updatedAt,
                branches: project.branches.map(b => b.branchName),
                actions: project.actions
            }));

            res.json(projectsWithFormattedData);
        } catch (err) {
            console.error('Error fetching projects:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async getProjectById(req, res) {
        const { id } = req.params;

        try {
            const project = await this.db.project.findUnique({
                where: { id: parseInt(id) },
                include: {
                    branches: true,
                    actions: true
                }
            });

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const formattedProject = {
                id: project.id,
                name: project.name,
                repo_url: project.repoUrl,
                check_interval: project.checkInterval,
                created_at: project.createdAt,
                updated_at: project.updatedAt,
                branches: project.branches.map(b => b.branchName),
                actions: project.actions
            };

            res.json(formattedProject);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async createProject(req, res) {
        const { name, repoUrl, branches, checkInterval } = req.body;

        if (!name || !repoUrl || !branches || !Array.isArray(branches) || branches.length === 0) {
            return res.status(400).json({ error: 'Name, repository URL, and at least one branch are required' });
        }

        if (checkInterval && checkInterval < 1) {
            return res.status(400).json({ error: 'Check interval must be at least 1 minute' });
        }

        try {
            const project = await this.db.project.create({
                data: {
                    name,
                    repoUrl,
                    checkInterval: checkInterval || 5,
                    branches: {
                        create: branches.map(branch => ({
                            branchName: branch.trim()
                        }))
                    }
                },
                include: {
                    branches: true
                }
            });

            await this.projectService.setupProjectTimer(project);
            const formattedProject = {
                id: project.id,
                name: project.name,
                repo_url: project.repoUrl,
                check_interval: project.checkInterval,
                created_at: project.createdAt,
                updated_at: project.updatedAt,
                branches: project.branches.map(b => b.branchName),
                actions: []
            };
            res.status(201).json(formattedProject);
        } catch (err) {
            console.error('Error creating project:', err);
            res.status(500).json({ error: 'Failed to create project. Please try again.' });
        }
    }

    async updateProject(req, res) {
        const { id } = req.params;
        const { name, repositoryUrl, branches, checkInterval } = req.body;

        // Validate check interval more strictly
        const interval = parseInt(checkInterval) || 5;
        if (interval < 1 || interval > 1440) { // Max 24 hours
            return res.status(400).json({ error: 'Check interval must be between 1 and 1440 minutes' });
        }

        try {
            // Clear existing timer before update to prevent duplicate timers
            this.projectService.clearTimer(parseInt(id));

            const project = await this.db.project.update({
                where: { id: parseInt(id) },
                data: {
                    name,
                    repoUrl: repositoryUrl,
                    checkInterval: interval,
                    branches: {
                        deleteMany: {},
                        create: branches.map(branch => ({
                            branchName: branch.trim()
                        }))
                    }
                },
                include: {
                    branches: true,
                    actions: true
                }
            });

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const formattedProject = {
                id: project.id,
                name: project.name,
                repo_url: project.repoUrl,
                check_interval: interval,
                created_at: project.createdAt,
                updated_at: project.updatedAt,
                branches: project.branches.map(b => b.branchName),
                actions: project.actions
            };

            // Setup new timer with validated interval
            this.projectService.setupProjectTimer(formattedProject);
            res.json(formattedProject);
        } catch (err) {
            // Error handling for transaction is managed by Prisma
            console.error('Error updating project:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async deleteProject(req, res) {
        const { id } = req.params;

        try {
            this.projectService.clearTimer(parseInt(id));

            const project = await this.db.project.delete({
                where: { id: parseInt(id) },
                include: {
                    branches: true,
                    actions: true
                }
            }).catch(() => null);

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            res.json({ message: 'Project deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getProjectLogs(req, res) {
        const { projectId } = req.params;
        const { limit = 50 } = req.query;

        try {
            const logs = await this.db.checkLog.findMany({
                where: {
                    projectId: parseInt(projectId)
                },
                include: {
                    project: {
                        select: {
                            name: true,
                            repoUrl: true
                        }
                    }
                },
                orderBy: {
                    checkedAt: 'desc'
                },
                take: parseInt(limit)
            });

            const formattedLogs = logs.map(log => ({
                id: log.id,
                project_id: log.projectId,
                branch_name: log.branchName,
                commit_sha: log.commitSha,
                commit_message: log.commitMessage,
                commit_author: log.commitAuthor,
                commit_date: log.commitDate,
                checked_at: log.checkedAt,
                status: log.status,
                project: {
                    name: log.project.name,
                    repo_url: log.project.repoUrl
                }
            }));

            res.json(formattedLogs);
        } catch (err) {
            console.error('Error fetching project logs:', err);
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = ProjectController;
