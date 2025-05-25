#!/usr/bin/env node

require('dotenv').config();
const { db } = require('../config/drizzle-client');
const { sql } = require('drizzle-orm');

/**
 * This script updates the tracked_images table by adding:
 * 1. A namespace column to track which namespace each image belongs to
 * 2. A last_seen_at column to track when each image was last observed
 * 
 * This is needed for multi-namespace image scanning support.
 */
async function updateTrackedImagesTable() {
    console.log('Updating tracked_images table for multi-namespace support...');

    try {
        // Check if the namespace column already exists
        const namespaceColumnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tracked_images' AND column_name = 'namespace'
    `);

        if (namespaceColumnCheck.length === 0) {
            // Add namespace column if it doesn't exist
            await db.execute(sql`
        ALTER TABLE tracked_images 
        ADD COLUMN IF NOT EXISTS namespace TEXT
      `);
            console.log('Successfully added namespace column to tracked_images table');

            // Update existing records to set namespace to 'default' if null
            await db.execute(sql`
        UPDATE tracked_images
        SET namespace = 'default'
        WHERE namespace IS NULL
      `);
            console.log('Successfully updated existing records with default namespace');
        } else {
            console.log('Namespace column already exists in tracked_images table');
        }

        // Check if the last_seen_at column already exists
        const lastSeenColumnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tracked_images' AND column_name = 'last_seen_at'
    `);

        if (lastSeenColumnCheck.length === 0) {
            // Add last_seen_at column if it doesn't exist
            await db.execute(sql`
        ALTER TABLE tracked_images 
        ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      `);
            console.log('Successfully added last_seen_at column to tracked_images table');
        } else {
            console.log('Last_seen_at column already exists in tracked_images table');
        }

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Error updating tracked_images table:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Run the migration
updateTrackedImagesTable();
