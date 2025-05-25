require('dotenv').config();
const { db } = require('../config/drizzle-client');
const { app_settings } = require('../schema/schema');
const { eq, sql } = require('drizzle-orm');

async function initializeSettings() {
    try {
        console.log('Checking if settings already exist...');

        // Check if settings already exist
        const existingSettings = await db.select().from(app_settings).where(eq(app_settings.id, 1));

        if (existingSettings.length > 0) {
            console.log('Settings already exist. No action needed.');
            return;
        }

        console.log('Creating initial settings...');

        // Use raw SQL to ensure proper insertion with correct types
        await db.execute(sql`
            INSERT INTO app_settings (
                id, 
                github_api_url, 
                github_token, 
                kubernetes_namespaces, 
                created_at, 
                updated_at
            ) 
            VALUES (
                1, 
                'https://api.github.com', 
                '', 
                '["default"]'::jsonb, 
                NOW(), 
                NOW()
            )
        `);

        // Verify the settings were created
        const result = await db.select().from(app_settings).where(eq(app_settings.id, 1));
        console.log('Settings initialized successfully:', result[0]);
    } catch (error) {
        console.error('Error initializing settings:', error);
    } finally {
        if (db.pool) {
            await db.pool.end();
        }
        process.exit(0);
    }
}

// Run the initialization
initializeSettings();
