const util = require('util');
const fs = require('fs').promises;
const exec = util.promisify(require('child_process').exec);
const githubServicePromise = require('./githubService'); // Renamed to indicate it's a promise
const axios = require('axios');
const path = require('path');
const os = require('os');
const { db } = require('../config/drizzle');
const { eq, and } = require('drizzle-orm');
const schema = require('../schema/schema');

class ProjectService {
    constructor(dbInstance) {
        this.db = dbInstance || db; // Use provided db instance or default to the imported one
        this.projectTimers = new Map();
        this.projectCache = new Map();
        this.githubService = null; // Will be initialized in an async method
    }

    async initialize() {
        try {
            this.githubService = await githubServicePromise;
            if (!this.githubService) {
                console.error('Failed to initialize GitHubService in ProjectService. GitHub related features will not work.');
                // Optionally, you could throw an error here to prevent the app from starting
                // or set a flag to disable GitHub-dependent functionality.
            } else {
                console.log('GitHubService initialized successfully in ProjectService.');
            }
        } catch (error) {
            console.error('Error initializing GitHubService in ProjectService:', error);
            // Handle error appropriately, e.g., by setting this.githubService to null or re-throwing
        }
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
            await this.db.insert(schema.checkLogs).values({
                projectId: projectId,
                branchName: branchName,
                status: 'error',
                commitMessage: error.message || 'Unknown error occurred',
                commitDate: new Date(),
                commitAuthor: 'System'
            });
        } catch (logError) {
            console.error('Error logging check error:', logError);
        }
    }

    async executeScriptAction(action, branch, commit) {
        const secretsResult = await this.db.select().from(schema.secrets).where(eq(schema.secrets.actionId, action.id));

        const envVars = [
            ...secretsResult.map(secret => `export ${secret.name}="${secret.value}"`),
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
        // Get actions with webhook parameters
        const actionsResult = await this.db.select().from(schema.actions)
            .where(eq(schema.actions.projectId, project.id));

        for (const action of actionsResult) {
            try {
                // Get webhook parameters for this action
                const webhookParamsResult = await this.db.select()
                    .from(schema.webhookParameters)
                    .where(and(
                        eq(schema.webhookParameters.actionId, action.id),
                        eq(schema.webhookParameters.branch, branch.branchName)
                    ));

                if (action.webhookUrl) {
                    // Convert webhook parameters to object format
                    const params = webhookParamsResult.reduce((acc, param) => {
                        acc[param.name] = param.value;
                        return acc;
                    }, {});

                    console.log('Executing webhook with params:', {
                        actionId: action.id,
                        branchName: branch.branchName,
                        params
                    });

                    // Send webhook with project, branch, and branch-specific parameters
                    await axios.post(action.webhookUrl, {
                        project: {
                            id: project.id,
                            name: project.name,
                            repoUrl: project.repoUrl || project.repo_url || null
                        },
                        branch: branch.branchName,
                        commit: {
                            sha: latestCommit.sha,
                            message: latestCommit.commit?.message || '',
                            author: latestCommit.commit?.author?.name || '',
                            date: latestCommit.commit?.author?.date || new Date().toISOString()
                        },
                        isManualTrigger: false,
                        params
                    });
                } else if (action.scriptContent) {
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
            const branches = await this.db.select().from(schema.branches)
                .where(eq(schema.branches.projectId, project.id));

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
                    
                    if (!this.githubService) {
                        console.warn(`GitHubService not initialized. Skipping check for project ${project.name}, branch ${branch.branchName}.`);
                        await this.logCheckError(project.id, new Error('GitHubService not available'), branch.branchName);
                        continue; // Skip to the next branch
                    }

                    console.log(`Checking branch ${branch.branchName} (Current SHA: ${branch.lastCommitSha || 'none'})`);
                    const branchDetails = await this.githubService.getBranchDetails(repoUrl, branch.branchName);
                    if (!branchDetails) {
                        throw new Error('No branch details returned from GitHub');
                    }

                    const latestCommit = branchDetails.commit;
                    if (!latestCommit || !latestCommit.sha) {
                        throw new Error('Invalid commit data received from GitHub');
                    }

                    console.log(`Latest commit SHA for ${branch.branchName}: ${latestCommit.sha}`);

                    // If this is the first check (lastCommitSha is null), initialize it
                    if (branch.lastCommitSha === null) {
                        console.log(`Initializing SHA for ${project.name}/${branch.branchName} to ${latestCommit.sha}`);
                        await this.db.update(schema.branches)
                            .set({ lastCommitSha: latestCommit.sha })
                            .where(eq(schema.branches.id, branch.id));

                        // Log the initial commit
                        const commitData = latestCommit.commit || {};
                        const commitAuthor = commitData.author || {};

                        await this.db.insert(schema.checkLogs).values({
                            projectId: project.id,
                            branchName: branch.branchName,
                            commitSha: latestCommit.sha,
                            commitMessage: commitData.message || 'Initial commit',
                            commitAuthor: commitAuthor.name || 'Unknown',
                            commitDate: commitAuthor.date ? new Date(commitAuthor.date) : new Date(),
                            status: 'initialized'
                        });
                        continue;
                    }

                    // Compare with the stored SHA
                    const hasChanged = branch.lastCommitSha !== latestCommit.sha;

                    if (hasChanged) {
                        console.log(`Changes detected in ${project.name}/${branch.branchName}`);
                        console.log(`Old SHA: ${branch.lastCommitSha}`);
                        console.log(`New SHA: ${latestCommit.sha}`);

                        // Update branch SHA
                        await this.db.update(schema.branches)
                            .set({ lastCommitSha: latestCommit.sha })
                            .where(eq(schema.branches.id, branch.id));

                        // Update project timestamp
                        await this.db.update(schema.projects)
                            .set({ updatedAt: new Date() })
                            .where(eq(schema.projects.id, project.id));

                        const commitData = latestCommit.commit || {};
                        const commitAuthor = commitData.author || {};

                        // Log the change
                        await this.db.insert(schema.checkLogs).values({
                            projectId: project.id,
                            branchName: branch.branchName,
                            commitSha: latestCommit.sha,
                            commitMessage: commitData.message || 'No commit message provided',
                            commitAuthor: commitAuthor.name || 'Unknown',
                            commitDate: commitAuthor.date ? new Date(commitAuthor.date) : new Date(),
                            status: 'changed'
                        });

                        // Execute actions for the change
                        await this.executeActions(project, branch, latestCommit);
                    } else {
                        console.log(`No changes in ${project.name}/${branch.branchName}`);
                        console.log(`Current SHA: ${branch.lastCommitSha}`);
                        console.log(`Latest SHA: ${latestCommit.sha}`);

                        // Log the check even when no changes
                        await this.db.insert(schema.checkLogs).values({
                            projectId: project.id,
                            branchName: branch.branchName,
                            commitSha: branch.lastCommitSha,
                            commitMessage: 'No changes detected',
                            commitAuthor: 'System',
                            commitDate: new Date(),
                            status: 'no_change'
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
            let status = 'success';
            let error = null;

            // First fetch the complete action with webhook parameters
            const [actionResult] = await this.db.select()
                .from(schema.actions)
                .where(eq(schema.actions.id, action.id));

            if (!actionResult) {
                throw new Error('Action not found');
            }

            // Get branch-specific webhook parameters
            const webhookParamsResult = await this.db.select()
                .from(schema.webhookParameters)
                .where(and(
                    eq(schema.webhookParameters.actionId, action.id),
                    eq(schema.webhookParameters.branch, branchName)
                ));

            const params = webhookParamsResult.reduce((acc, param) => {
                acc[param.name] = param.value;
                return acc;
            }, {});

            console.log('Executing action with params:', {
                actionId: action.id,
                branchName,
                params
            });

            if (actionResult.actionType === 'webhook') {
                if (!actionResult.webhookUrl) {
                    throw new Error('Webhook URL is required');
                }

                try {
                    // Send webhook with project, branch, and branch-specific parameters
                    const webhookData = {
                        project: {
                            id: project.id,
                            name: project.name,
                            repoUrl: project.repo_url || null
                        },
                        branch: branchName,
                        isManualTrigger,
                        params
                    };

                    console.log('Sending webhook with data:', webhookData);
                    await axios.post(actionResult.webhookUrl, webhookData);
                } catch (err) {
                    throw new Error(`Failed to send webhook: ${err.message}`);
                }
            } else if (actionResult.actionType === 'script') {
                if (!actionResult.scriptContent) {
                    throw new Error('Script content is required');
                }

                try {
                    // Create a temporary script file
                    const scriptPath = path.join(os.tmpdir(), `script-${action.id}-${Date.now()}.sh`);
                    await fs.writeFile(scriptPath, actionResult.scriptContent, { mode: 0o755 });

                    // Execute the script with environment variables
                    const env = {
                        ...process.env,
                        PROJECT_ID: project.id.toString(),
                        PROJECT_NAME: project.name,
                        PROJECT_REPO_URL: project.repo_url,
                        BRANCH_NAME: branchName,
                        IS_MANUAL_TRIGGER: isManualTrigger.toString(),
                        ...params // Include branch-specific parameters as environment variables
                    };

                    console.log('Executing script with env:', env);
                    await new Promise((resolve, reject) => {
                        exec(scriptPath, { env }, (error, stdout, stderr) => {
                            if (error) {
                                reject(new Error(`Script execution failed: ${error.message}`));
                            } else {
                                resolve();
                            }
                        });
                    });

                    // Clean up the temporary script file
                    await fs.unlink(scriptPath);
                } catch (err) {
                    throw new Error(`Failed to execute script: ${err.message}`);
                }
            }

            return {
                status,
                error,
                actionId: action.id
            };
        } catch (err) {
            return {
                status: 'error',
                error: err.message,
                actionId: action.id
            };
        }
    }

    async initializeProjectTimers() {
        // Ensure GitHubService is initialized before setting up timers
        if (!this.githubService) {
            await this.initialize(); // Ensure this is called if not already
        }

        // If still not initialized (e.g. due to error), log and potentially abort/limit functionality
        if (!this.githubService) {
            console.error('Cannot initialize project timers because GitHubService failed to initialize.');
            return;
        }

        try {
            const projects = await this.db.select().from(schema.projects);
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
