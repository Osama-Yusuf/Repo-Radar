require('dotenv').config();
const bcrypt = require('bcrypt');
const { db } = require('../config/database');
const { users } = require('../schema/schema');
const { eq } = require('drizzle-orm');

async function createAdminUser() {
    try {
        // Default admin credentials - in production, these should be set via environment variables
        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD || 'admin123';

        // Check if user already exists
        const existingUser = await db.select().from(users).where(eq(users.username, username));

        if (existingUser.length > 0) {
            console.log(`User '${username}' already exists.`);
            return;
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create admin user
        const result = await db.insert(users).values({
            username,
            password: hashedPassword
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
