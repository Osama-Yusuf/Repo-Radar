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
                    actions: {
                        include: {
                            webhookParams: true
                        }
                    }
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
                actions: project.actions.map(action => ({
                    ...action,
                    webhookParams: action.webhookParams || []
                }))
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
                    actions: {
                        include: {
                            webhookParams: true
                        }
                    }
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
                actions: project.actions.map(action => ({
                    ...action,
                    webhookParams: action.webhookParams || []
                }))
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

    async triggerActions(req, res) {
        const { projectId } = req.params;
        const { branch } = req.body;

        if (!branch) {
            return res.status(400).json({ error: 'Branch name is required' });
        }

        try {
            const project = await this.db.project.findUnique({
                where: { id: parseInt(projectId) },
                include: {
                    branches: true,
                    actions: true
                }
            });

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            // Verify the branch exists in the project
            const branchExists = project.branches.some(b => b.branchName === branch);
            if (!branchExists) {
                return res.status(400).json({ error: 'Branch not found in project' });
            }

            // Execute all actions for the project
            const results = await Promise.allSettled(project.actions.map(async (action) => {
                try {
                    // Pass isManualTrigger as true for manual action triggers
                    await this.projectService.executeAction(project, action, branch, true);
                    return { actionId: action.id, status: 'success' };
                } catch (actionError) {
                    console.error(`Error executing action ${action.id}:`, actionError);
                    return {
                        actionId: action.id,
                        status: 'error',
                        error: actionError.message
                    };
                }
            }));

            // Check if any actions succeeded
            const successfulActions = results.filter(r => r.value?.status === 'success');
            const failedActions = results.filter(r => r.value?.status === 'error');

            if (successfulActions.length === 0 && failedActions.length > 0) {
                // All actions failed
                return res.status(500).json({
                    error: 'All actions failed to execute',
                    details: failedActions.map(r => ({
                        actionId: r.value.actionId,
                        error: r.value.error
                    }))
                });
            }

            // Some actions succeeded
            res.json({
                message: failedActions.length > 0 ? 'Some actions triggered successfully' : 'All actions triggered successfully',
                results: {
                    successful: successfulActions.map(r => r.value.actionId),
                    failed: failedActions.map(r => ({
                        actionId: r.value.actionId,
                        error: r.value.error
                    }))
                }
            });
        } catch (err) {
            console.error('Error triggering actions:', err);
            res.status(500).json({ error: 'Failed to trigger actions' });
        }
    }

    async createAction(req, res) {
        try {
            const { projectId } = req.params;
            const { name, actionType, webhookUrl, scriptContent, webhookParams } = req.body;

            console.log('Creating action with data:', {
                projectId,
                name,
                actionType,
                webhookUrl,
                scriptContent,
                webhookParams
            });

            // Create action with webhook parameters
            const action = await this.db.action.create({
                data: {
                    name,
                    actionType,
                    webhookUrl,
                    scriptContent,
                    projectId: parseInt(projectId),
                    webhookParams: webhookParams?.length > 0 ? {
                        createMany: {
                            data: webhookParams
                        }
                    } : undefined
                },
                include: {
                    webhookParams: true
                }
            });

            console.log('Created action:', action);
            res.json(action);
        } catch (error) {
            console.error('Error creating action:', error);
            res.status(500).json({ error: 'Failed to create action' });
        }
    }

    async updateAction(req, res) {
        try {
            const { actionId } = req.params;
            const { name, actionType, webhookUrl, scriptContent, webhookParams } = req.body;

            console.log('Updating action:', {
                actionId,
                name,
                actionType,
                webhookUrl,
                scriptContent,
                webhookParams
            });

            // First delete existing webhook parameters
            await this.db.webhookParameter.deleteMany({
                where: { actionId: parseInt(actionId) }
            });

            // Then update the action with new parameters
            const action = await this.db.action.update({
                where: { id: parseInt(actionId) },
                data: {
                    name,
                    actionType,
                    webhookUrl,
                    scriptContent,
                    webhookParams: webhookParams?.length > 0 ? {
                        createMany: {
                            data: webhookParams
                        }
                    } : undefined
                },
                include: {
                    webhookParams: true
                }
            });

            console.log('Updated action:', action);
            res.json(action);
        } catch (error) {
            console.error('Error updating action:', error);
            res.status(500).json({ error: 'Failed to update action' });
        }
    }
}

module.exports = ProjectController;
