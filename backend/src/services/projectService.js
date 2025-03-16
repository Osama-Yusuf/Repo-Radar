const util = require('util');
const fs = require('fs').promises;
const exec = util.promisify(require('child_process').exec);
const githubService = require('./githubService');
const { runAsync, getAsync, allAsync } = require('../config/database');

class ProjectService {
    constructor(db) {
        this.db = db;
        this.projectTimers = new Map();
    }

    async setupProjectTimer(project) {
        if (this.projectTimers.has(project.id)) {
            clearInterval(this.projectTimers.get(project.id));
        }

        const intervalMs = project.check_interval * 60 * 1000;
        const timerId = setInterval(async () => {
            try {
                await this.checkProjectChanges(project);
            } catch (error) {
                console.error(`Error checking project ${project.name}:`, error);
                // Log the error to the database
                await this.logCheckError(project.id, error);
            }
        }, intervalMs);

        this.projectTimers.set(project.id, timerId);
        console.log(`Set up timer for project ${project.name} with interval ${project.check_interval} minutes`);
    }

    async logCheckError(projectId, error) {
        try {
            await runAsync(this.db, `
                INSERT INTO check_logs 
                (project_id, status, commit_message)
                VALUES (?, ?, ?)
            `, [
                projectId,
                'error',
                error.message || 'Unknown error occurred'
            ]);
        } catch (logError) {
            console.error('Error logging check error:', logError);
        }
    }

    async executeScriptAction(action, branch, commit) {
        const secrets = await allAsync(this.db, 'SELECT name, value FROM secrets WHERE action_id = ?', [action.id]);
        
        const envVars = [
            ...secrets.map(secret => `export ${secret.name}="${secret.value}"`),
            `export BRANCH_NAME="${branch.branch_name}"`,
            `export COMMIT_SHA="${commit.sha}"`,
            `export COMMIT_MESSAGE="${(commit.commit?.message || '').replace(/"/g, '\\"')}"`,
            `export COMMIT_AUTHOR="${commit.commit?.author?.name || ''}"`,
            `export COMMIT_DATE="${commit.commit?.author?.date || new Date().toISOString()}"`
        ].join('\n');

        const fullScriptContent = `#!/bin/bash\n\n# Set environment variables\n${envVars}\n\n# Main script\n${action.script_content}`;
        const scriptPath = `/tmp/action_${action.id}_${Date.now()}.sh`;
        
        try {
            await fs.writeFile(scriptPath, fullScriptContent);
            await fs.chmod(scriptPath, '755');

            const { stdout, stderr } = await exec(scriptPath);
            console.log(`Script output for action ${action.id} on branch ${branch.branch_name}:`, stdout);
            if (stderr) console.error(`Script error for action ${action.id} on branch ${branch.branch_name}:`, stderr);
        } finally {
            await fs.unlink(scriptPath).catch(console.error);
        }
    }

    async executeActions(project, branch, latestCommit) {
        const actions = await allAsync(this.db, 'SELECT * FROM actions WHERE project_id = ?', [project.id]);

        for (const action of actions) {
            try {
                if (action.webhook_url) {
                    await githubService.sendWebhook(action.webhook_url, {
                        project: project.name,
                        branch: branch.branch_name,
                        commit: {
                            sha: latestCommit.sha,
                            message: latestCommit.commit?.message || '',
                            author: latestCommit.commit?.author?.name || '',
                            date: latestCommit.commit?.author?.date || new Date().toISOString(),
                        },
                    });
                }
                if (action.script_content) {
                    await this.executeScriptAction(action, branch, latestCommit);
                }
            } catch (actionError) {
                console.error(`Error executing action ${action.id} for branch ${branch.branch_name}:`, actionError);
            }
        }
    }

    async checkProjectChanges(project) {
        console.log(`Checking project ${project.name}...`);

        try {
            const branches = await allAsync(this.db, 'SELECT * FROM branches WHERE project_id = ?', [project.id]);

            for (const branch of branches) {
                try {
                    const branchDetails = await githubService.getBranchDetails(project.repo_url, branch.branch_name);
                    const latestCommit = branchDetails.commit;

                    if (!latestCommit || !latestCommit.sha) {
                        throw new Error('Invalid commit data received from GitHub');
                    }

                    if (latestCommit.sha !== branch.last_commit_sha) {
                        console.log(`Changes detected in ${project.name}/${branch.branch_name}`);

                        await runAsync(this.db, 'UPDATE branches SET last_commit_sha = ? WHERE id = ?', 
                            [latestCommit.sha, branch.id]);

                        await runAsync(this.db, 'UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                            [project.id]);

                        await runAsync(this.db, `
                            INSERT INTO check_logs 
                            (project_id, branch_name, commit_sha, commit_message, commit_author, commit_date, status)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `, [
                            project.id,
                            branch.branch_name,
                            latestCommit.sha,
                            latestCommit.commit?.message || '',
                            latestCommit.commit?.author?.name || '',
                            latestCommit.commit?.author?.date || new Date().toISOString(),
                            'changed'
                        ]);

                        await this.executeActions(project, branch, latestCommit);
                    } else {
                        // Log no changes
                        await runAsync(this.db, `
                            INSERT INTO check_logs 
                            (project_id, branch_name, commit_sha, status)
                            VALUES (?, ?, ?, ?)
                        `, [
                            project.id,
                            branch.branch_name,
                            branch.last_commit_sha,
                            'no_change'
                        ]);
                    }
                } catch (error) {
                    console.error(`Error checking branch ${branch.branch_name}:`, error);
                    await this.logCheckError(project.id, error);
                }
            }
        } catch (error) {
            console.error(`Error in checkProjectChanges for ${project.name}:`, error);
            await this.logCheckError(project.id, error);
        }
    }

    async initializeProjectTimers() {
        try {
            const projects = await allAsync(this.db, 'SELECT * FROM projects');
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
        }
    }
}

module.exports = ProjectService;
