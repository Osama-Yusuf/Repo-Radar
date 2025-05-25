const { Octokit } = require('@octokit/rest');
const axios = require('axios');
const https = require('https');
const { db } = require('../config/drizzle-client'); // Import db
const { app_settings } = require('../schema/schema'); // Import app_settings
const { eq } = require('drizzle-orm'); // Import eq

class GitHubService {
    constructor(settings) { // Accept settings as a parameter
        if (!settings || !settings.github_api_url) {
            throw new Error('GitHub API URL is required from settings');
        }

        this.baseUrl = settings.github_api_url;
        this.hasToken = !!settings.github_token;

        // Create Octokit instance with or without token
        const octokitOptions = {
            userAgent: 'repo-radar v1.0',
            baseUrl: this.baseUrl,
            request: {
                agent: new https.Agent({
                    rejectUnauthorized: false
                })
            }
        };

        // Only add auth if token is provided
        if (settings.github_token) {
            octokitOptions.auth = settings.github_token;
        }

        this.octokit = new Octokit(octokitOptions);

        // Create a custom Axios instance for webhooks
        this.axiosInstance = axios.create({
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        });
    }

    extractRepoInfo(repoUrl) {
        try {
            const url = new URL(repoUrl);
            const pathParts = url.pathname.split('/').filter(Boolean);
            if (pathParts.length < 2) {
                throw new Error('Invalid repository URL format');
            }
            return {
                owner: pathParts[0],
                repo: pathParts[1].replace('.git', '')
            };
        } catch (error) {
            console.error('Error parsing repository URL:', error);
            throw new Error('Invalid repository URL');
        }
    }

    async getBranchDetails(repoUrl, branchName) {
        try {
            const repoInfo = this.extractRepoInfo(repoUrl);
            console.log('Fetching branch details for:', {
                baseUrl: this.baseUrl,
                owner: repoInfo.owner,
                repo: repoInfo.repo,
                branch: branchName
            });

            // First try to get the branch directly
            try {
                const response = await this.octokit.repos.getBranch({
                    owner: repoInfo.owner,
                    repo: repoInfo.repo,
                    branch: branchName,
                    headers: {
                        accept: 'application/vnd.github.v3+json'
                    }
                });
                return response.data;
            } catch (branchError) {
                // If direct branch fetch fails, try listing all branches
                const branches = await this.octokit.repos.listBranches({
                    owner: repoInfo.owner,
                    repo: repoInfo.repo,
                    headers: {
                        accept: 'application/vnd.github.v3+json'
                    }
                });

                const targetBranch = branches.data.find(b => b.name === branchName);
                if (!targetBranch) {
                    throw new Error(`Branch ${branchName} not found`);
                }

                // Get the specific branch details
                const commitResponse = await this.octokit.repos.getCommit({
                    owner: repoInfo.owner,
                    repo: repoInfo.repo,
                    ref: targetBranch.commit.sha,
                    headers: {
                        accept: 'application/vnd.github.v3+json'
                    }
                });

                // Format the response to match the expected structure
                return {
                    name: branchName,
                    commit: {
                        sha: commitResponse.data.sha,
                        commit: {
                            message: commitResponse.data.commit.message,
                            author: {
                                name: commitResponse.data.commit.author.name,
                                date: commitResponse.data.commit.author.date
                            }
                        }
                    }
                };
            }
        } catch (error) {
            console.error(`Failed to get branch details for ${repoUrl}#${branchName}:`, {
                message: error.message,
                status: error.status,
                response: error.response?.data
            });
            throw error;
        }
    }

    async sendWebhook(webhookUrl, payload) {
        try {
            await this.axiosInstance.post(webhookUrl, payload);
            console.log(`Successfully sent webhook for ${payload.project}/${payload.branch}`);
        } catch (error) {
            console.error(`Failed to send webhook for ${payload.project}/${payload.branch}:`, error.message);
            throw error;
        }
    }
}

// Asynchronous initialization function
async function createGitHubService() {
    const settingsResult = await db.select().from(app_settings).where(eq(app_settings.id, 1));
    if (settingsResult.length === 0) {
        throw new Error('GitHub settings not found in database. Cannot initialize GitHubService.');
    }
    const { github_api_url, github_token } = settingsResult[0];

    if (!github_api_url) {
        throw new Error('GitHub API URL is missing in settings. Cannot initialize GitHubService.');
    }

    // Token is now optional - will work for public repos without token
    return new GitHubService({ github_api_url, github_token });
}

// Export a promise that resolves to the service instance
module.exports = createGitHubService();
// This makes the module export a Promise. 
// Other modules importing it will need to use .then() or await.
// Example: const gitHubService = await require('./services/githubService');
