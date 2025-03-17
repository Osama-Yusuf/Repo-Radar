const { runAsync, getAsync, allAsync } = require('../config/database');

class ActionController {
    constructor(db) {
        this.db = db;
    }

    async getProjectActions(req, res) {
        const { projectId } = req.params;

        try {
            const actions = await this.db.action.findMany({
                where: { projectId: parseInt(projectId) }
            });
            res.json(actions);
        } catch (err) {
            console.error('Error fetching project actions:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async createAction(req, res) {
        const { projectId } = req.params;
        const { name, actionType, webhookUrl, scriptContent, webhookParams } = req.body;

        if (!actionType || (!webhookUrl && !scriptContent)) {
            return res.status(400).json({ error: 'Action type and either webhook URL or script content are required' });
        }

        try {
            console.log('Creating action with webhook params:', webhookParams);

            // Create action first
            const action = await this.db.action.create({
                data: {
                    projectId: parseInt(projectId),
                    name: name || null,
                    actionType,
                    webhookUrl,
                    scriptContent
                }
            });

            // Then add webhook parameters if they exist
            if (webhookParams && webhookParams.length > 0) {
                await this.db.webhookParameter.createMany({
                    data: webhookParams.map(param => ({
                        actionId: action.id,
                        branch: param.branch,
                        name: param.name,
                        value: param.value
                    }))
                });
            }

            // Fetch the complete action with webhook parameters
            const actionWithParams = await this.db.action.findUnique({
                where: { id: action.id },
                include: { webhookParams: true }
            });

            console.log('Created action:', actionWithParams);
            res.status(201).json(actionWithParams);
        } catch (err) {
            console.error('Error creating action:', err);
            if (err.code === 'P2002') {
                res.status(400).json({ error: 'Duplicate webhook parameter names are not allowed for the same branch' });
            } else {
                res.status(500).json({ error: err.message });
            }
        }
    }

    async updateAction(req, res) {
        const { projectId, actionId } = req.params;
        const { name, actionType, webhookUrl, scriptContent, webhookParams } = req.body;

        if (!actionType || (!webhookUrl && !scriptContent)) {
            return res.status(400).json({ error: 'Action type and either webhook URL or script content are required' });
        }

        try {
            console.log('Updating action with webhook params:', webhookParams);
            
            // First delete existing webhook parameters
            await this.db.webhookParameter.deleteMany({
                where: { actionId: parseInt(actionId) }
            });

            // Update the action
            const action = await this.db.action.update({
                where: {
                    id: parseInt(actionId),
                    projectId: parseInt(projectId)
                },
                data: {
                    name: name || null,
                    actionType,
                    webhookUrl,
                    scriptContent,
                    updatedAt: new Date()
                }
            });

            if (!action) {
                return res.status(404).json({ error: 'Action not found' });
            }

            // Add new webhook parameters if they exist
            if (webhookParams && webhookParams.length > 0) {
                await this.db.webhookParameter.createMany({
                    data: webhookParams.map(param => ({
                        actionId: action.id,
                        branch: param.branch,
                        name: param.name,
                        value: param.value
                    }))
                });
            }

            // Fetch the complete action with webhook parameters
            const actionWithParams = await this.db.action.findUnique({
                where: { id: action.id },
                include: { webhookParams: true }
            });

            console.log('Updated action:', actionWithParams);
            res.json(actionWithParams);
        } catch (err) {
            console.error('Error updating action:', err);
            if (err.code === 'P2002') {
                res.status(400).json({ error: 'Duplicate webhook parameter names are not allowed for the same branch' });
            } else {
                res.status(500).json({ error: err.message });
            }
        }
    }

    async deleteAction(req, res) {
        const { projectId, actionId } = req.params;

        try {
            const action = await this.db.action.delete({
                where: {
                    id: parseInt(actionId),
                    projectId: parseInt(projectId)
                }
            });

            if (!action) {
                return res.status(404).json({ error: 'Action not found' });
            }

            res.json({ message: 'Action deleted successfully' });
        } catch (err) {
            console.error('Error deleting action:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async getActionSecrets(req, res) {
        const { actionId } = req.params;

        try {
            const secrets = await this.db.secret.findMany({
                where: { actionId: parseInt(actionId) },
                select: {
                    id: true,
                    name: true,
                    createdAt: true
                }
            });
            res.json(secrets);
        } catch (err) {
            console.error('Error fetching action secrets:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async createSecret(req, res) {
        const { actionId } = req.params;
        const { name, value } = req.body;

        if (!name || !value) {
            return res.status(400).json({ error: 'Name and value are required' });
        }

        try {
            // Check if action exists
            const action = await this.db.action.findUnique({
                where: { id: parseInt(actionId) }
            });

            if (!action) {
                return res.status(404).json({ error: 'Action not found' });
            }

            // Check for existing secret with same name
            const existingSecret = await this.db.secret.findFirst({
                where: {
                    actionId: parseInt(actionId),
                    name
                }
            });

            if (existingSecret) {
                return res.status(409).json({ error: 'Secret with this name already exists' });
            }

            const secret = await this.db.secret.create({
                data: {
                    actionId: parseInt(actionId),
                    name,
                    value
                },
                select: {
                    id: true,
                    name: true,
                    createdAt: true
                }
            });

            res.status(201).json(secret);
        } catch (err) {
            console.error('Error creating secret:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async updateSecret(req, res) {
        const { actionId, secretId } = req.params;
        const { value } = req.body;

        if (!value) {
            return res.status(400).json({ error: 'Value is required' });
        }

        try {
            const secret = await this.db.secret.update({
                where: {
                    id: parseInt(secretId),
                    actionId: parseInt(actionId)
                },
                data: { value }
            });

            if (!secret) {
                return res.status(404).json({ error: 'Secret not found' });
            }

            res.json({ message: 'Secret updated successfully' });
        } catch (err) {
            console.error('Error updating secret:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async deleteSecret(req, res) {
        const { actionId, secretId } = req.params;

        try {
            const secret = await this.db.secret.delete({
                where: {
                    id: parseInt(secretId),
                    actionId: parseInt(actionId)
                }
            });

            if (!secret) {
                return res.status(404).json({ error: 'Secret not found' });
            }

            res.json({ message: 'Secret deleted successfully' });
        } catch (err) {
            console.error('Error deleting secret:', err);
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = ActionController;
