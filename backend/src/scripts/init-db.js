require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Initializing Repo-Radar Application...');

// Function to run a script and return a promise
function runScript(scriptPath) {
    return new Promise((resolve, reject) => {
        console.log(`\n📋 Running ${path.basename(scriptPath)}...`);

        const child = spawn('node', [scriptPath], {
            stdio: 'inherit',
            env: process.env
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${path.basename(scriptPath)} completed successfully`);
                resolve();
            } else {
                console.error(`❌ ${path.basename(scriptPath)} failed with code ${code}`);
                reject(new Error(`Script ${scriptPath} exited with code ${code}`));
            }
        });

        child.on('error', (err) => {
            console.error(`❌ Failed to start ${path.basename(scriptPath)}: ${err.message}`);
            reject(err);
        });
    });
}

// Define script paths relative to this file
const scriptsDir = __dirname;
const setupDbPath = path.join(scriptsDir, 'setup-db.js');
const initSettingsPath = path.join(scriptsDir, 'init-settings.js');
const createAdminUserPath = path.join(scriptsDir, 'create-admin-user.js');

// Run scripts in sequence
async function initializeApp() {
    try {
        console.log('🔧 Step 1/3: Setting up database schema...');
        await runScript(setupDbPath);

        console.log('🔧 Step 2/3: Initializing application settings...');
        await runScript(initSettingsPath);

        console.log('🔧 Step 3/3: Creating admin user...');
        await runScript(createAdminUserPath);

        console.log('\n🎉 Repo-Radar initialization completed successfully!');
        console.log('🚀 You can now start the application with: npm start');
    } catch (error) {
        console.error('\n❌ Initialization failed:', error.message);
        process.exit(1);
    }
}

// Run the initialization process
initializeApp();
