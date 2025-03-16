const { Octokit } = require('@octokit/rest');
const axios = require('axios');
const https = require('https');

class GitHubService {
    constructor() {
        const baseUrl = process.env.GITHUB_API_URL;
        if (!baseUrl) {
            throw new Error('GITHUB_API_URL environment variable is required');
        }

        this.baseUrl = baseUrl;
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
            userAgent: 'repo-radar v1.0',
            baseUrl: this.baseUrl,
            request: {
                agent: new https.Agent({
                    rejectUnauthorized: false
                })
            }
        });

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

module.exports = new GitHubService();
