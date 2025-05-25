require('dotenv').config();
const bcrypt = require('bcrypt');
const { db } = require('../config/drizzle-client');
const { users } = require('../schema/schema');
const { eq, sql } = require('drizzle-orm');

async function createAdminUser() {
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

        // Default admin credentials - in production, these should be set via environment variables
        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD || 'admin123';

        // Check if user already exists
        const existingUser = await db.select().from(users).where(eq(users.username, username));

        if (existingUser.length > 0) {
            console.log(`User '${username}' already exists.`);

            // Update the existing user to have admin role
            await db.execute(sql`UPDATE users SET role = 'admin' WHERE username = ${username}`);
            console.log(`Updated user '${username}' to have admin role.`);
            return;
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create admin user with role field
        const result = await db.insert(users).values({
            username,
            password: hashedPassword,
            role: 'admin'
        }).returning();

        console.log(`Admin user '${username}' created successfully.`);
        console.log('Please change the default password after first login.');
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        process.exit(0);
    }
}

// Run the function
createAdminUser();
