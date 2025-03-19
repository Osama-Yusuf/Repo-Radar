const { db } = require('../config/drizzle');
const { eq, and } = require('drizzle-orm');
const schema = require('../schema/schema');

class ActionController {
    constructor(dbInstance) {
        this.db = dbInstance || db; // Use provided db instance or default to the imported one
    }

    async getProjectActions(req, res) {
        const { projectId } = req.params;

        try {
            const actions = await this.db.select()
                .from(schema.actions)
                .where(eq(schema.actions.projectId, parseInt(projectId)));

            // For each action, get its webhook parameters
            const actionsWithParams = await Promise.all(actions.map(async (action) => {
                const webhookParams = await this.db.select()
                    .from(schema.webhookParameters)
                    .where(eq(schema.webhookParameters.actionId, action.id));

                return {
                    ...action,
                    webhookParams: webhookParams || []
                };
            }));

            res.json(actionsWithParams);
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
            const [action] = await this.db.insert(schema.actions)
                .values({
                    projectId: parseInt(projectId),
                    name: name || null,
                    actionType,
                    webhookUrl,
                    scriptContent
                })
                .returning();

            // Then add webhook parameters if they exist
            if (webhookParams && webhookParams.length > 0) {
                for (const param of webhookParams) {
                    await this.db.insert(schema.webhookParameters)
                        .values({
                            actionId: action.id,
                            branch: param.branch,
                            name: param.name,
                            value: param.value
                        });
                }
            }

            // Fetch the webhook parameters for the action
            const webhookParamsResult = await this.db.select()
                .from(schema.webhookParameters)
                .where(eq(schema.webhookParameters.actionId, action.id));

            const actionWithParams = {
                ...action,
                webhookParams: webhookParamsResult
            };

            console.log('Created action:', actionWithParams);
            res.status(201).json(actionWithParams);
        } catch (err) {
            console.error('Error creating action:', err);
            if (err.code === '23505') { // PostgreSQL unique constraint violation
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
            // Verify action exists and belongs to the project
            const [existingAction] = await this.db.select()
                .from(schema.actions)
                .where(and(
                    eq(schema.actions.id, parseInt(actionId)),
                    eq(schema.actions.projectId, parseInt(projectId))
                ));

            if (!existingAction) {
                return res.status(404).json({ error: 'Action not found' });
            }

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

            // Add new webhook parameters if they exist
            if (webhookParams && webhookParams.length > 0) {
                for (const param of webhookParams) {
                    await this.db.insert(schema.webhookParameters)
                        .values({
                            actionId: parseInt(actionId),
                            branch: param.branch,
                            name: param.name,
                            value: param.value
                        });
                }
            }

            // Fetch the updated webhook parameters
            const webhookParamsResult = await this.db.select()
                .from(schema.webhookParameters)
                .where(eq(schema.webhookParameters.actionId, parseInt(actionId)));

            const actionWithParams = {
                ...updatedAction,
                webhookParams: webhookParamsResult
            };

            res.json(actionWithParams);
        } catch (err) {
            console.error('Error updating action:', err);
            if (err.code === '23505') { // PostgreSQL unique constraint violation
                res.status(400).json({ error: 'Duplicate webhook parameter names are not allowed for the same branch' });
            } else {
                res.status(500).json({ error: err.message });
            }
        }
    }

    async deleteAction(req, res) {
        const { projectId, actionId } = req.params;

        try {
            // Verify action exists and belongs to the project
            const [existingAction] = await this.db.select()
                .from(schema.actions)
                .where(and(
                    eq(schema.actions.id, parseInt(actionId)),
                    eq(schema.actions.projectId, parseInt(projectId))
                ));

            if (!existingAction) {
                return res.status(404).json({ error: 'Action not found' });
            }

            // Delete action (will cascade to webhook parameters)
            await this.db.delete(schema.actions)
                .where(eq(schema.actions.id, parseInt(actionId)));

            res.json({ message: 'Action deleted successfully' });
        } catch (err) {
            console.error('Error deleting action:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async getActionSecrets(req, res) {
        const { actionId } = req.params;

        try {
            const secrets = await this.db.select()
                .from(schema.secrets)
                .where(eq(schema.secrets.actionId, parseInt(actionId)));
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
            // Verify action exists
            const [existingAction] = await this.db.select()
                .from(schema.actions)
                .where(eq(schema.actions.id, parseInt(actionId)));

            if (!existingAction) {
                return res.status(404).json({ error: 'Action not found' });
            }

            // Check for existing secret with same name
            const [existingSecret] = await this.db.select()
                .from(schema.secrets)
                .where(and(
                    eq(schema.secrets.actionId, parseInt(actionId)),
                    eq(schema.secrets.name, name)
                ));

            if (existingSecret) {
                return res.status(409).json({ error: 'Secret with this name already exists' });
            }

            // Create secret
            const [secret] = await this.db.insert(schema.secrets)
                .values({
                    actionId: parseInt(actionId),
                    name,
                    value
                })
                .returning();

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
            // Verify secret exists and belongs to the action
            const [existingSecret] = await this.db.select()
                .from(schema.secrets)
                .where(and(
                    eq(schema.secrets.id, parseInt(secretId)),
                    eq(schema.secrets.actionId, parseInt(actionId))
                ));

            if (!existingSecret) {
                return res.status(404).json({ error: 'Secret not found' });
            }

            // Update secret
            const [updatedSecret] = await this.db.update(schema.secrets)
                .set({ value })
                .where(eq(schema.secrets.id, parseInt(secretId)))
                .returning();

            res.json(updatedSecret);
        } catch (err) {
            console.error('Error updating secret:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async deleteSecret(req, res) {
        const { actionId, secretId } = req.params;

        try {
            // Verify secret exists and belongs to the action
            const [existingSecret] = await this.db.select()
                .from(schema.secrets)
                .where(and(
                    eq(schema.secrets.id, parseInt(secretId)),
                    eq(schema.secrets.actionId, parseInt(actionId))
                ));

            if (!existingSecret) {
                return res.status(404).json({ error: 'Secret not found' });
            }

            // Delete secret
            await this.db.delete(schema.secrets)
                .where(eq(schema.secrets.id, parseInt(secretId)));

            res.json({ message: 'Secret deleted successfully' });
        } catch (err) {
            console.error('Error deleting secret:', err);
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = ActionController;
