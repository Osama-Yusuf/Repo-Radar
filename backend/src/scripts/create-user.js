require('dotenv').config();
const bcrypt = require('bcrypt');
const { db } = require('../config/database');
const { users } = require('../schema/schema');
const { eq, sql } = require('drizzle-orm');

/**
 * Script to create a new user (admin only)
 * 
 * Usage:
 * node src/scripts/create-user.js <username> <password>
 */

async function createUser() {
    try {
        // Check if role column exists and add it if it doesn't
        try {
            // Try to query the role column to see if it exists
            await db.execute(sql`SELECT role FROM users LIMIT 1`);
            console.log('Role column exists in users table');
        } catch (error) {
            // If error contains "column does not exist", add the column
            if (error.message.includes('column "role" does not exist')) {
                console.log('Role column does not exist, adding it...');
                await db.execute(sql`ALTER TABLE users ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'user'`);
                console.log('Role column added successfully');
            } else {
                // If it's a different error, just log it and continue
                console.warn('Error checking role column:', error.message);
            }
        }

        // Get username and password from command line arguments
        const args = process.argv.slice(2);

        if (args.length !== 2) {
            console.error('Usage: node src/scripts/create-user.js <username> <password>');
            process.exit(1);
        }

        const [username, password] = args;

        // Validate inputs
        if (!username || username.length < 3) {
            console.error('Username must be at least 3 characters long');
            process.exit(1);
        }

        if (!password || password.length < 6) {
            console.error('Password must be at least 6 characters long');
            process.exit(1);
        }

        // Check if user already exists
        const existingUser = await db.select().from(users).where(eq(users.username, username));

        if (existingUser.length > 0) {
            console.error(`User '${username}' already exists.`);
            process.exit(1);
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user in database with 'user' role
        const result = await db.insert(users).values({
            username,
            password: hashedPassword,
            role: 'user'
        }).returning();

        console.log(`User '${username}' created successfully.`);
    } catch (error) {
        console.error('Error creating user:', error);
    } finally {
        process.exit(0);
    }
}

// Run the function
createUser();
