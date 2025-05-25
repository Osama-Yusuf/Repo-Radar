const { db } = require('../config/drizzle-client');
const { appSettings } = require('../schema/schema');
const { eq } = require('drizzle-orm');

const getSettings = async (req, res) => {
    try {
        const settings = await db.select().from(appSettings).where(eq(appSettings.id, 1));
        if (settings.length === 0) {
            // This case should ideally not happen if setup-db.js ensures a row exists
            return res.status(404).json({ message: 'Settings not found. Please ensure database setup is complete.' });
        }
        res.json(settings[0]);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
};

const updateSettings = async (req, res) => {
    const { github_api_url, github_token, kubernetes_namespaces } = req.body;

    // Basic validation
    if (github_api_url === undefined || github_token === undefined || kubernetes_namespaces === undefined) {
        return res.status(400).json({ message: 'Missing required fields: github_api_url, github_token, kubernetes_namespaces' });
    }

    if (!Array.isArray(kubernetes_namespaces)) {
        return res.status(400).json({ message: 'kubernetes_namespaces must be an array.' });
    }

    try {
        const updatedSettings = await db.update(appSettings)
            .set({
                github_api_url,
                github_token,
                kubernetes_namespaces,
                updatedAt: new Date()
            })
            .where(eq(appSettings.id, 1))
            .returning();

        if (updatedSettings.length === 0) {
            return res.status(404).json({ message: 'Settings not found to update. This should not happen.' });
        }
        
        res.json({ message: 'Settings updated successfully', settings: updatedSettings[0] });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Failed to update settings' });
    }
};

module.exports = {
    getSettings,
    updateSettings,
};
