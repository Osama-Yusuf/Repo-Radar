const util = require('util');
const fs = require('fs').promises;
const exec = util.promisify(require('child_process').exec);
const githubService = require('./githubService');
const { runAsync, getAsync, allAsync } = require('../config/database');

class ProjectService {
    constructor(db) {
        this.db = db;
        this.projectTimers = new Map();
        this.projectCache = new Map();
    }

    async setupProjectTimer(project) {
        // Clear any existing timer first
        this.clearTimer(project.id);

        // Store project data in memory to reduce database queries
        const currentCache = this.projectCache.get(project.id);
        this.projectCache.set(project.id, {
            ...project,
            lastCheck: currentCache?.lastCheck || null,
            consecutiveErrors: currentCache?.consecutiveErrors || 0,
            branches: currentCache?.branches || project.branches // Preserve branch data
        });

        // Validate and ensure minimum interval
        const minInterval = 1; // 1 minute minimum
        const checkInterval = Math.max(minInterval, parseInt(project.check_interval || project.checkInterval) || 5);
        const intervalMs = checkInterval * 60 * 1000;

        console.log(`Setting up timer for project ${project.name} with interval ${checkInterval} minutes`);

        // Add a small random delay to prevent all checks happening simultaneously
        const initialDelay = Math.random() * 5000; // Random delay up to 5 seconds

        // Set up the timer with initial delay
        setTimeout(() => {
            // Set up recurring checks first
            const timerId = setInterval(async () => {
                try {
                    // Check if timer is still valid
                    if (!this.projectTimers.has(project.id)) {
                        this.clearTimer(project.id);
                        return;
                    }

                    // Get cached project data
                    const cachedProject = this.projectCache.get(project.id);
                    if (!cachedProject) {
                        console.error(`No cached data found for project ${project.id}`);
                        return;
                    }

                    // Add rate limiting
                    const now = Date.now();
                    if (cachedProject.lastCheck && (now - cachedProject.lastCheck) < 60000) { // Minimum 1 minute between checks
                        console.log(`Skipping check for ${project.name} - too soon since last check`);
                        return;
                    }

                    // Update last check time
                    cachedProject.lastCheck = now;
                    this.projectCache.set(project.id, cachedProject);

                    await this.checkProjectChanges(cachedProject);
                } catch (error) {
                    console.error(`Error checking project ${project.name}:`, error);
                    await this.logCheckError(project.id, error);
                }
            }, intervalMs);

            this.projectTimers.set(project.id, timerId);
            console.log(`Timer set up successfully for project ${project.name}`);

            // Only perform initial check if this is a new project or hasn't been checked before
            const cachedProject = this.projectCache.get(project.id);
            if (cachedProject && !cachedProject.lastCheck) {
                setTimeout(() => {
                    this.checkProjectChanges(cachedProject).catch(error => {
                        console.error(`Error in initial check for project ${project.name}:`, error);
                    });
                }, 5000); // 5 second delay for initial check
            } else {
                console.log(`Skipping initial check for ${project.name} as it was already checked before`);
            }
        }, initialDelay);
    }

    async logCheckError(projectId, error, branchName = 'unknown') {
        try {
            await this.db.checkLog.create({
                data: {
                    projectId: projectId,
                    branchName: branchName,
                    status: 'error',
                    commitMessage: error.message || 'Unknown error occurred',
                    commitDate: new Date().toISOString(),
                    commitAuthor: 'System'
                }
            });
        } catch (logError) {
            console.error('Error logging check error:', logError);
        }
    }

    async executeScriptAction(action, branch, commit) {
        const secrets = await allAsync(this.db, 'SELECT name, value FROM secrets WHERE actionId = ?', [action.id]);

        const envVars = [
            ...secrets.map(secret => `export ${secret.name}="${secret.value}"`),
            `export BRANCH_NAME="${branch.branchName}"`,
            `export COMMIT_SHA="${commit.sha}"`,
            `export COMMIT_MESSAGE="${(commit.commit?.message || '').replace(/"/g, '\\"')}"`,
            `export COMMIT_AUTHOR="${commit.commit?.author?.name || ''}"`,
            `export COMMIT_DATE="${commit.commit?.author?.date || new Date().toISOString()}"`
        ].join('\n');

        const fullScriptContent = `#!/bin/bash\n\n# Set environment variables\n${envVars}\n\n# Main script\n${action.scriptContent}`;
        const scriptPath = `/tmp/action_${action.id}_${Date.now()}.sh`;

        try {
            await fs.writeFile(scriptPath, fullScriptContent);
            await fs.chmod(scriptPath, '755');

            const { stdout, stderr } = await exec(scriptPath);
            console.log(`Script output for action ${action.id} on branch ${branch.branchName}:`, stdout);
            if (stderr) console.error(`Script error for action ${action.id} on branch ${branch.branchName}:`, stderr);
        } finally {
            await fs.unlink(scriptPath).catch(console.error);
        }
    }

    async executeActions(project, branch, latestCommit) {
        const actions = await allAsync(this.db, 'SELECT * FROM actions WHERE project_id = ?', [project.id]);

        for (const action of actions) {
            try {
                if (action.webhookUrl) {
                    await githubService.sendWebhook(action.webhookUrl, {
                        project: project.name,
                        branch: branch.branchName,
                        commit: {
                            sha: latestCommit.sha,
                            message: latestCommit.commit?.message || '',
                            author: latestCommit.commit?.author?.name || '',
                            date: latestCommit.commit?.author?.date || new Date().toISOString(),
                        },
                    });
                }
                if (action.scriptContent) {
                    await this.executeScriptAction(action, branch, latestCommit);
                }
            } catch (actionError) {
                console.error(`Error executing action ${action.id} for branch ${branch.branchName}:`, actionError);
            }
        }
    }

    async checkProjectChanges(project) {
        // Add a lock to prevent concurrent checks of the same project
        const lockKey = `project_check_${project.id}`;
        if (this[lockKey]) {
            console.log(`Project ${project.name} check already in progress, skipping...`);
            return;
        }

        this[lockKey] = true;
        console.log(`Checking project ${project.name}...`);

        try {
            // Get current branches with their SHA
            const branches = await this.db.branch.findMany({
                where: { projectId: project.id }
            });

            if (!branches || branches.length === 0) {
                console.log(`No branches found for project ${project.name}`);
                return;
            }

            // Update cache with current branch information
            const cachedProject = this.projectCache.get(project.id);
            if (cachedProject) {
                cachedProject.branches = branches;
                this.projectCache.set(project.id, cachedProject);
            }

            for (const branch of branches) {
                try {
                    const repoUrl = project.repo_url || project.repoUrl;
                    if (!repoUrl) {
                        throw new Error('Repository URL is missing');
                    }

                    const branchDetails = await githubService.getBranchDetails(repoUrl, branch.branchName);
                    if (!branchDetails) {
                        throw new Error('No branch details returned from GitHub');
                    }

                    const latestCommit = branchDetails.commit;
                    if (!latestCommit || !latestCommit.sha) {
                        throw new Error('Invalid commit data received from GitHub');
                    }

                    // Compare with the actual branch SHA from database
                    const hasChanged = branch.lastCommitSha !== latestCommit.sha && branch.lastCommitSha !== null;
                    
                    if (hasChanged) {
                        console.log(`Changes detected in ${project.name}/${branch.branchName} (${branch.lastCommitSha} -> ${latestCommit.sha})`);

                        await this.db.branch.update({
                            where: { id: branch.id },
                            data: { lastCommitSha: latestCommit.sha }
                        });

                        await this.db.project.update({
                            where: { id: project.id },
                            data: { updatedAt: new Date() }
                        });

                        const commitData = latestCommit.commit || {};
                        const commitAuthor = commitData.author || {};

                        await this.db.checkLog.create({
                            data: {
                                projectId: project.id,
                                branchName: branch.branchName,
                                commitSha: latestCommit.sha,
                                commitMessage: commitData.message || 'No commit message provided',
                                commitAuthor: commitAuthor.name || 'Unknown',
                                commitDate: commitAuthor.date || new Date().toISOString(),
                                status: 'changed'
                            }
                        });

                        await this.executeActions(project, branch, latestCommit);
                    } else {
                        // If this is the first check (lastCommitSha is null), update the SHA without marking as changed
                        if (branch.lastCommitSha === null) {
                            console.log(`Initializing SHA for ${project.name}/${branch.branchName} to ${latestCommit.sha}`);
                            await this.db.branch.update({
                                where: { id: branch.id },
                                data: { lastCommitSha: latestCommit.sha }
                            });
                        } else {
                            console.log(`No changes in ${project.name}/${branch.branchName} (SHA: ${branch.lastCommitSha})`);
                        }

                        // Log no changes
                        await this.db.checkLog.create({
                            data: {
                                projectId: project.id,
                                branchName: branch.branchName,
                                commitSha: branch.lastCommitSha || latestCommit.sha,
                                commitMessage: 'No changes detected',
                                commitAuthor: 'System',
                                commitDate: new Date().toISOString(),
                                status: 'no_change'
                            }
                        });
                    }
                } catch (error) {
                    console.error(`Error checking branch ${branch.branchName}:`, error);
                    await this.logCheckError(project.id, error, branch.branchName);
                }
            }
        } catch (error) {
            console.error(`Error in checkProjectChanges for ${project.name}:`, error);
            await this.logCheckError(project.id, error);
        } finally {
            // Release the lock
            delete this[lockKey];
        }
    }

    async executeAction(project, action, branchName, isManualTrigger = false) {
        try {
            // Get branch details from GitHub
            const repoUrl = project.repo_url || project.repoUrl;
            if (!repoUrl) {
                throw new Error('Repository URL is missing');
            }

            const branchDetails = await githubService.getBranchDetails(repoUrl, branchName);
            if (!branchDetails) {
                throw new Error('No branch details returned from GitHub');
            }

            const latestCommit = branchDetails.commit;

            if (action.webhookUrl) {
                await githubService.sendWebhook(action.webhookUrl, {
                    project: project.name,
                    branch: branchName,
                    commit: {
                        sha: latestCommit.sha,
                        message: latestCommit.commit?.message || '',
                        author: latestCommit.commit?.author?.name || '',
                        date: latestCommit.commit?.author?.date || new Date().toISOString(),
                    },
                    trigger_type: isManualTrigger ? 'manual' : 'auto'
                });
            }

            if (action.scriptContent) {
                const secrets = await this.db.secret.findMany({
                    where: { actionId: action.id }
                });

                const envVars = [
                    ...secrets.map(secret => `export ${secret.name}="${secret.value}"`),
                    `export BRANCH_NAME="${branchName}"`,
                    `export COMMIT_SHA="${latestCommit.sha}"`,
                    `export COMMIT_MESSAGE="${(latestCommit.commit?.message || '').replace(/"/g, '\\"')}"`,
                    `export COMMIT_AUTHOR="${latestCommit.commit?.author?.name || ''}"`,
                    `export COMMIT_DATE="${latestCommit.commit?.author?.date || new Date().toISOString()}"`,
                    `export TRIGGER_TYPE="${isManualTrigger ? 'manual' : 'auto'}"`
                ].join('\n');

                const fullScriptContent = `#!/bin/bash\n\n# Set environment variables\n${envVars}\n\n# Main script\n${action.scriptContent}`;
                const scriptPath = `/tmp/action_${action.id}_${Date.now()}.sh`;

                try {
                    await fs.writeFile(scriptPath, fullScriptContent);
                    await fs.chmod(scriptPath, '755');

                    const { stdout, stderr } = await exec(scriptPath);
                    console.log(`Script output for action ${action.id} on branch ${branchName}:`, stdout);
                    if (stderr) console.error(`Script error for action ${action.id} on branch ${branchName}:`, stderr);
                } finally {
                    await fs.unlink(scriptPath).catch(console.error);
                }
            }

            // Log execution with appropriate status
            await this.db.checkLog.create({
                data: {
                    projectId: project.id,
                    branchName: branchName,
                    status: isManualTrigger ? 'manual_trigger' : 'changed',
                    commitSha: latestCommit.sha,
                    commitMessage: latestCommit.commit?.message || '',
                    commitDate: latestCommit.commit?.author?.date || new Date().toISOString(),
                    commitAuthor: latestCommit.commit?.author?.name || '',
                }
            });

        } catch (error) {
            console.error(`Error executing action ${action.id}:`, error);
            // Log error with appropriate status
            await this.db.checkLog.create({
                data: {
                    projectId: project.id,
                    branchName: branchName,
                    status: `error: ${error.message} (${isManualTrigger ? 'manual trigger' : 'auto check'})`,
                    commitDate: new Date().toISOString(),
                    commitAuthor: 'System',
                }
            });
            throw error;
        }
    }

    async initializeProjectTimers() {
        try {
            const projects = await this.db.project.findMany();
            for (const project of projects) {
                await this.setupProjectTimer(project);
            }
            console.log(`Initialized timers for ${projects.length} projects`);
        } catch (error) {
            console.error('Error initializing project timers:', error);
        }
    }

    clearTimer(projectId) {
        if (this.projectTimers.has(projectId)) {
            clearInterval(this.projectTimers.get(projectId));
            this.projectTimers.delete(projectId);
            // Clear cached data
            if (this.projectCache) {
                this.projectCache.delete(projectId);
            }
        }
    }
}

module.exports = ProjectService;
