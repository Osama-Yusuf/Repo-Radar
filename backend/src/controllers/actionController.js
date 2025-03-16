const { runAsync, getAsync, allAsync } = require('../config/database');

class ActionController {
    constructor(db) {
        this.db = db;
    }

    async getProjectActions(req, res) {
        const { projectId } = req.params;

        try {
            const actions = await allAsync(this.db, 'SELECT * FROM actions WHERE project_id = ?', [projectId]);
            res.json(actions);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async createAction(req, res) {
        const { projectId } = req.params;
        const { name, actionType, webhookUrl, scriptContent } = req.body;

        if (!actionType || (!webhookUrl && !scriptContent)) {
            return res.status(400).json({ error: 'Action type and either webhook URL or script content are required' });
        }

        try {
            const result = await runAsync(this.db,
                'INSERT INTO actions (project_id, name, action_type, webhook_url, script_content) VALUES (?, ?, ?, ?, ?)',
                [projectId, name || null, actionType, webhookUrl, scriptContent]
            );

            res.status(201).json({
                id: result.lastID,
                project_id: projectId,
                name,
                action_type: actionType,
                webhook_url: webhookUrl,
                script_content: scriptContent
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async updateAction(req, res) {
        const { projectId, actionId } = req.params;
        const { name, actionType, webhookUrl, scriptContent } = req.body;

        if (!actionType || (!webhookUrl && !scriptContent)) {
            return res.status(400).json({ error: 'Action type and either webhook URL or script content are required' });
        }

        try {
            await runAsync(this.db,
                `UPDATE actions 
                SET name = ?, action_type = ?, webhook_url = ?, script_content = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND project_id = ?`,
                [name || null, actionType, webhookUrl, scriptContent, actionId, projectId]
            );

            const action = await getAsync(this.db, 'SELECT * FROM actions WHERE id = ? AND project_id = ?', [actionId, projectId]);
            if (!action) {
                return res.status(404).json({ error: 'Action not found' });
            }

            res.json(action);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async deleteAction(req, res) {
        const { projectId, actionId } = req.params;

        try {
            const action = await getAsync(this.db, 'SELECT id FROM actions WHERE id = ? AND project_id = ?', [actionId, projectId]);
            if (!action) {
                return res.status(404).json({ error: 'Action not found' });
            }

            await runAsync(this.db, 'DELETE FROM actions WHERE id = ? AND project_id = ?', [actionId, projectId]);
            res.json({ message: 'Action deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getActionSecrets(req, res) {
        const { actionId } = req.params;

        try {
            const secrets = await allAsync(this.db, 
                'SELECT id, name, created_at FROM secrets WHERE action_id = ?', 
                [actionId]
            );
            res.json(secrets);
        } catch (err) {
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
            const action = await getAsync(this.db, 'SELECT id FROM actions WHERE id = ?', [actionId]);
            if (!action) {
                return res.status(404).json({ error: 'Action not found' });
            }

            const existingSecret = await getAsync(this.db, 
                'SELECT id FROM secrets WHERE action_id = ? AND name = ?', 
                [actionId, name]
            );
            if (existingSecret) {
                return res.status(409).json({ error: 'Secret with this name already exists' });
            }

            const result = await runAsync(this.db,
                'INSERT INTO secrets (action_id, name, value) VALUES (?, ?, ?)',
                [actionId, name, value]
            );

            res.status(201).json({
                id: result.lastID,
                name,
                created_at: new Date().toISOString()
            });
        } catch (err) {
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
            await runAsync(this.db,
                'UPDATE secrets SET value = ? WHERE id = ? AND action_id = ?',
                [value, secretId, actionId]
            );

            const secret = await getAsync(this.db, 'SELECT id FROM secrets WHERE id = ? AND action_id = ?', [secretId, actionId]);
            if (!secret) {
                return res.status(404).json({ error: 'Secret not found' });
            }

            res.json({ message: 'Secret updated successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async deleteSecret(req, res) {
        const { actionId, secretId } = req.params;

        try {
            const secret = await getAsync(this.db, 'SELECT id FROM secrets WHERE id = ? AND action_id = ?', [secretId, actionId]);
            if (!secret) {
                return res.status(404).json({ error: 'Secret not found' });
            }

            await runAsync(this.db,
                'DELETE FROM secrets WHERE id = ? AND action_id = ?',
                [secretId, actionId]
            );

            res.json({ message: 'Secret deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = ActionController;
