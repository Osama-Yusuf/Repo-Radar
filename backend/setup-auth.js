/**
 * Repo Radar Authentication Setup Script
 * 
 * This script helps set up the authentication system for Repo Radar.
 * It will:
 * 1. Add the necessary environment variables to your .env file
 * 2. Create the initial admin user in the database
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Generate a secure random JWT secret
const generateJwtSecret = () => {
    return crypto.randomBytes(64).toString('hex');
};

// Add authentication variables to .env file if they don't exist
const setupEnvFile = () => {
    const envPath = path.join(__dirname, '.env');

    try {
        // Check if .env file exists
        if (!fs.existsSync(envPath)) {
            console.error('.env file not found. Please create one based on .env.example first.');
            process.exit(1);
        }

        // Read current .env content
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Check if JWT_SECRET already exists
        if (!envContent.includes('JWT_SECRET=')) {
            const jwtSecret = generateJwtSecret();
            envContent += `\n# Authentication settings\nJWT_SECRET=${jwtSecret}\n`;

            // Add admin credentials if not present
            if (!envContent.includes('ADMIN_USERNAME=')) {
                envContent += `ADMIN_USERNAME=admin\n`;
            }

            if (!envContent.includes('ADMIN_PASSWORD=')) {
                envContent += `ADMIN_PASSWORD=admin123\n`;
            }

            // Write updated content back to .env
            fs.writeFileSync(envPath, envContent);
            console.log('Authentication environment variables added to .env file.');
        } else {
            console.log('Authentication environment variables already exist in .env file.');
        }
    } catch (error) {
        console.error('Error updating .env file:', error);
        process.exit(1);
    }
};

// Create admin user in the database
const createAdminUser = () => {
    try {
        console.log('Creating admin user...');
        execSync('node src/scripts/create-admin-user.js', { stdio: 'inherit' });
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

// Main function
const main = async () => {
    console.log('Setting up Repo Radar authentication system...');

    // Setup environment variables
    setupEnvFile();

    // Create admin user
    createAdminUser();

    console.log('\nAuthentication setup complete!');
    console.log('You can now log in with:');
    console.log(`Username: ${process.env.ADMIN_USERNAME || 'admin'}`);
    console.log(`Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log('\nIMPORTANT: Please change the default password after first login for security reasons.');
};

// Run the script
main();
