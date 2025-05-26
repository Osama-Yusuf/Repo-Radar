const { eq, desc, and, asc } = require('drizzle-orm'); // Added asc
const schema = require('../schema/schema');

class ProjectController {
    constructor(projectService, db) {
        this.projectService = projectService;
        this.db = db
    }

    async getAllProjects(req, res) {
        try {
            // Get all projects
            const projects = await this.db.select().from(schema.projects);

            // For each project, get its branches and actions
            const projectsWithRelations = await Promise.all(projects.map(async (project) => {
                const branches = await this.db.select().from(schema.branches)
                    .where(eq(schema.branches.projectId, project.id));

                const actions = await this.db.select().from(schema.actions)
                    .where(eq(schema.actions.projectId, project.id));

                // For each action, get its webhook parameters
                const actionsWithParams = await Promise.all(actions.map(async (action) => {
                    const webhookParams = await this.db.select().from(schema.webhookParameters)
                        .where(eq(schema.webhookParameters.actionId, action.id));

                    return {
                        ...action,
                        webhookParams: webhookParams || []
                    };
                }));

                return {
                    id: project.id,
                    name: project.name,
                    repo_url: project.repoUrl,
                    check_interval: project.checkInterval,
                    created_at: project.createdAt,
                    updated_at: project.updatedAt,
                    branches: branches.map(b => b.branchName),
                    actions: actionsWithParams
                };
            }));

            res.json(projectsWithRelations);
        } catch (err) {
            console.error('Error fetching projects:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async getProjectById(req, res) {
        const { id } = req.params;

        try {
            // Get the project
            const [project] = await this.db.select().from(schema.projects)
                .where(eq(schema.projects.id, parseInt(id)));

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            // Get project branches
            const branches = await this.db.select().from(schema.branches)
                .where(eq(schema.branches.projectId, project.id));

            // Get project actions
            const actions = await this.db.select().from(schema.actions)
                .where(eq(schema.actions.projectId, project.id));

            // For each action, get its webhook parameters
            const actionsWithParams = await Promise.all(actions.map(async (action) => {
                const webhookParams = await this.db.select().from(schema.webhookParameters)
                    .where(eq(schema.webhookParameters.actionId, action.id));

                return {
                    ...action,
                    webhookParams: webhookParams || []
                };
            }));

            const formattedProject = {
                id: project.id,
                name: project.name,
                repo_url: project.repoUrl,
                check_interval: project.checkInterval,
                created_at: project.createdAt,
                updated_at: project.updatedAt,
                branches: branches.map(b => b.branchName),
                actions: actionsWithParams
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
            // Create the project
            const [projectResult] = await this.db.insert(schema.projects)
                .values({
                    name,
                    repoUrl,
                    checkInterval: checkInterval || 5
                })
                .returning();

            // Create branches for the project
            for (const branch of branches) {
                await this.db.insert(schema.branches)
                    .values({
                        projectId: projectResult.id,
                        branchName: branch.trim()
                    });
            }

            // Get the created branches
            const createdBranches = await this.db.select()
                .from(schema.branches)
                .where(eq(schema.branches.projectId, projectResult.id));
            
            console.log('Created branches type:', typeof createdBranches);
            console.log('Created branches isArray:', Array.isArray(createdBranches));
            console.log('Created branches value:', JSON.stringify(createdBranches, null, 2));

            // Set up project timer
            const project = {
                ...projectResult,
                branches: Array.isArray(createdBranches) ? createdBranches : []
            };
            await this.projectService.setupProjectTimer(project);

            const formattedProject = {
                id: project.id,
                name: project.name,
                repo_url: project.repoUrl,
                check_interval: project.checkInterval,
                created_at: project.createdAt,
                updated_at: project.updatedAt,
                branches: Array.isArray(createdBranches) ? createdBranches.map(b => b.branchName) : [],
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

            // Update the project
            const [updatedProject] = await this.db.update(schema.projects)
                .set({
                    name,
                    repoUrl: repositoryUrl,
                    checkInterval: interval,
                    updatedAt: new Date()
                })
                .where(eq(schema.projects.id, parseInt(id)))
                .returning();

            if (!updatedProject) {
                return res.status(404).json({ error: 'Project not found' });
            }

            // Delete existing branches
            await this.db.delete(schema.branches)
                .where(eq(schema.branches.projectId, parseInt(id)));

            // Create new branches
            for (const branch of branches) {
                await this.db.insert(schema.branches)
                    .values({
                        projectId: parseInt(id),
                        branchName: branch.trim()
                    });
            }

            // Get updated branches
            const updatedBranches = await this.db.select()
                .from(schema.branches)
                .where(eq(schema.branches.projectId, parseInt(id)));

            // Get actions
            const actions = await this.db.select()
                .from(schema.actions)
                .where(eq(schema.actions.projectId, parseInt(id)));

            const formattedProject = {
                id: updatedProject.id,
                name: updatedProject.name,
                repo_url: updatedProject.repoUrl,
                check_interval: interval,
                created_at: updatedProject.createdAt,
                updated_at: updatedProject.updatedAt,
                branches: updatedBranches.map(b => b.branchName),
                actions: actions
            };

            // Setup new timer with validated interval
            this.projectService.setupProjectTimer(formattedProject);
            res.json(formattedProject);
        } catch (err) {
            console.error('Error updating project:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async deleteProject(req, res) {
        const { id } = req.params;

        try {
            this.projectService.clearTimer(parseInt(id));

            // Get the project to check if it exists
            const [project] = await this.db.select()
                .from(schema.projects)
                .where(eq(schema.projects.id, parseInt(id)));

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            // Delete the project (cascading will delete related records)
            await this.db.delete(schema.projects)
                .where(eq(schema.projects.id, parseInt(id)));

            res.json({ message: 'Project deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getProjectLogs(req, res) {
        const { projectId } = req.params;
        const { limit = 50 } = req.query;

        try {
            // Get logs for the project, ordered by checked_at desc
            const logs = await this.db.select({
                id: schema.checkLogs.id,
                projectId: schema.checkLogs.projectId,
                branchName: schema.checkLogs.branchName,
                commitSha: schema.checkLogs.commitSha,
                commitMessage: schema.checkLogs.commitMessage,
                commitAuthor: schema.checkLogs.commitAuthor,
                commitDate: schema.checkLogs.commitDate,
                checkedAt: schema.checkLogs.checkedAt,
                status: schema.checkLogs.status,
                project: schema.projects
            })
                .from(schema.checkLogs)
                .where(eq(schema.checkLogs.projectId, parseInt(projectId)))
                .orderBy(desc(schema.checkLogs.checkedAt))
                .limit(parseInt(limit))
                .leftJoin(schema.projects, eq(schema.checkLogs.projectId, schema.projects.id));

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
            // Get the project
            const [project] = await this.db.select()
                .from(schema.projects)
                .where(eq(schema.projects.id, parseInt(projectId)));

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            // Get branches for the project
            const branches = await this.db.select()
                .from(schema.branches)
                .where(eq(schema.branches.projectId, parseInt(projectId)));

            // Verify the branch exists in the project
            const branchExists = branches.some(b => b.branchName === branch);
            if (!branchExists) {
                return res.status(400).json({ error: 'Branch not found in project' });
            }

            // Get actions for the project
            const actions = await this.db.select()
                .from(schema.actions)
                .where(eq(schema.actions.projectId, parseInt(projectId)));

            // Execute all actions for the project
            const results = await Promise.allSettled(actions.map(async (action) => {
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

            // Create the action
            const [action] = await this.db.insert(schema.actions)
                .values({
                    name,
                    actionType,
                    webhookUrl,
                    scriptContent,
                    projectId: parseInt(projectId)
                })
                .returning();

            // Create webhook parameters if they exist
            if (webhookParams?.length > 0) {
                for (const param of webhookParams) {
                    await this.db.insert(schema.webhookParameters)
                        .values({
                            ...param,
                            actionId: action.id
                        });
                }
            }

            // Get the created webhook parameters
            const createdParams = await this.db.select()
                .from(schema.webhookParameters)
                .where(eq(schema.webhookParameters.actionId, action.id));

            const actionWithParams = {
                ...action,
                webhookParams: createdParams
            };

            console.log('Created action:', actionWithParams);
            res.json(actionWithParams);
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

            // Delete existing webhook parameters
            await this.db.delete(schema.webhookParameters)
                .where(eq(schema.webhookParameters.actionId, parseInt(actionId)));

            // Update the action
            const [updatedAction] = await this.db.update(schema.actions)
                .set({
                    name,
                    actionType,
                    webhookUrl,
                    scriptContent,
                    updatedAt: new Date()
                })
                .where(eq(schema.actions.id, parseInt(actionId)))
                .returning();

            // Create new webhook parameters if they exist
            if (webhookParams?.length > 0) {
                for (const param of webhookParams) {
                    await this.db.insert(schema.webhookParameters)
                        .values({
                            ...param,
                            actionId: parseInt(actionId)
                        });
                }
            }

            // Get the updated webhook parameters
            const updatedParams = await this.db.select()
                .from(schema.webhookParameters)
                .where(eq(schema.webhookParameters.actionId, parseInt(actionId)));

            const actionWithParams = {
                ...updatedAction,
                webhookParams: updatedParams
            };

            console.log('Updated action:', actionWithParams);
            res.json(actionWithParams);
        } catch (error) {
            console.error('Error updating action:', error);
            res.status(500).json({ error: 'Failed to update action' });
        }
    }

    async exportProjects(req, res) {
        try {
            // Get all projects
            const projects = await this.db.select().from(schema.projects);

            // For each project, get its branches and actions
            const projectsWithRelations = await Promise.all(projects.map(async (project) => {
                const branches = await this.db.select().from(schema.branches)
                    .where(eq(schema.branches.projectId, project.id));

                const actions = await this.db.select().from(schema.actions)
                    .where(eq(schema.actions.projectId, project.id));

                // For each action, get its webhook parameters
                const actionsWithParams = await Promise.all(actions.map(async (action) => {
                    const webhookParams = await this.db.select().from(schema.webhookParameters)
                        .where(eq(schema.webhookParameters.actionId, action.id));

                    return {
                        name: action.name,
                        actionType: action.actionType,
                        webhookUrl: action.webhookUrl,
                        scriptContent: action.scriptContent,
                        webhookParams: webhookParams.map(param => ({
                            branch: param.branch,
                            name: param.name,
                            value: param.value
                        }))
                    };
                }));

                return {
                    name: project.name,
                    repo_url: project.repoUrl,
                    check_interval: project.checkInterval,
                    branches: branches.map(b => b.branchName),
                    actions: actionsWithParams
                };
            }));

            res.json(projectsWithRelations);
        } catch (error) {
            console.error('Error exporting projects:', error);
            res.status(500).json({ error: 'Failed to export projects' });
        }
    }

    async importProjects(req, res) {
        const projects = req.body;

        if (!Array.isArray(projects)) {
            return res.status(400).json({ error: 'Input must be an array of projects' });
        }

        try {
            const results = await Promise.allSettled(projects.map(async (projectData) => {
                try {
                    // Create the project
                    const [project] = await this.db.insert(schema.projects)
                        .values({
                            name: projectData.name,
                            repoUrl: projectData.repo_url,
                            checkInterval: projectData.check_interval || 5
                        })
                        .returning();

                    // Create branches for the project
                    for (const branch of projectData.branches) {
                        await this.db.insert(schema.branches)
                            .values({
                                projectId: project.id,
                                branchName: branch
                            });
                    }

                    // Create actions for the project if they exist
                    if (projectData.actions && projectData.actions.length > 0) {
                        for (const actionData of projectData.actions) {
                            // Create action
                            const [action] = await this.db.insert(schema.actions)
                                .values({
                                    name: actionData.name,
                                    actionType: actionData.actionType,
                                    webhookUrl: actionData.webhookUrl,
                                    scriptContent: actionData.scriptContent,
                                    projectId: project.id
                                })
                                .returning();

                            // Create webhook parameters if they exist
                            if (actionData.webhookParams && actionData.webhookParams.length > 0) {
                                for (const param of actionData.webhookParams) {
                                    await this.db.insert(schema.webhookParameters)
                                        .values({
                                            branch: param.branch,
                                            name: param.name,
                                            value: param.value,
                                            actionId: action.id
                                        });
                                }
                            }
                        }
                    }

                    // Set up project timer
                    await this.projectService.setupProjectTimer(project);
                    return { status: 'success', name: projectData.name };
                } catch (err) {
                    return { status: 'error', name: projectData.name, error: err.message };
                }
            }));

            const successful = results.filter(r => r.value?.status === 'success');
            const failed = results.filter(r => r.value?.status === 'error');

            res.json({
                message: `Imported ${successful.length} projects successfully${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
                successful: successful.map(r => r.value.name),
                failed: failed.map(r => ({ name: r.value.name, error: r.value.error }))
            });
        } catch (error) {
            console.error('Error importing projects:', error);
            res.status(500).json({ error: 'Failed to import projects' });
        }
    }

    async getProjectSecretFindings(req, res) {
        const { projectId } = req.params;

        try {
            const findings = await this.db.select()
                .from(schema.gitleaks_findings)
                .where(eq(schema.gitleaks_findings.projectId, parseInt(projectId)))
                .orderBy(asc(schema.gitleaks_findings.filePath), asc(schema.gitleaks_findings.lineNumber));

            if (!findings) {
                // This case might not be strictly necessary if an empty array is acceptable for no findings.
                // However, if .select() could return null/undefined in some scenarios (e.g. DB error before query execution),
                // it could be useful. Drizzle typically returns [] for no rows found.
                return res.status(404).json({ error: 'No findings found for this project or project does not exist.' });
            }
            
            res.json(findings);
        } catch (err) {
            console.error(`Error fetching secret findings for project ${projectId}:`, err);
            res.status(500).json({ error: `Failed to fetch secret findings: ${err.message}` });
        }
    }
}

module.exports = ProjectController;
