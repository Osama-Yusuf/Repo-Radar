require('dotenv').config();
const { db } = require('../config/drizzle-client');
const { sql } = require('drizzle-orm');

async function setupDatabase() {
  try {
    console.log('Setting up database using Drizzle...');
    
    // Create tables in the correct order to handle foreign key relationships
    const createTables = sql`
      -- Create projects table
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        repo_url TEXT NOT NULL,
        check_interval INTEGER NOT NULL DEFAULT 5,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create branches table
      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        branch_name TEXT NOT NULL,
        last_commit_sha TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- Create check_logs table
      CREATE TABLE IF NOT EXISTS check_logs (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        branch_name TEXT NOT NULL,
        commit_sha TEXT,
        commit_message TEXT,
        commit_author TEXT,
        commit_date TIMESTAMP,
        checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- Create actions table
      CREATE TABLE IF NOT EXISTS actions (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        name TEXT,
        action_type TEXT NOT NULL,
        webhook_url TEXT,
        script_content TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- Create secrets table
      CREATE TABLE IF NOT EXISTS secrets (
        id SERIAL PRIMARY KEY,
        action_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
      );

      -- Create webhook_parameters table
      CREATE TABLE IF NOT EXISTS webhook_parameters (
        id SERIAL PRIMARY KEY,
        action_id INTEGER NOT NULL,
        branch TEXT NOT NULL,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE,
        UNIQUE(action_id, branch, name)
      );

      -- Create users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create scanned_images table
      CREATE TABLE IF NOT EXISTS scanned_images (
        id SERIAL PRIMARY KEY,
        image_name TEXT NOT NULL UNIQUE,
        last_scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL,
        raw_trivy_output JSONB
      );

      -- Create vulnerabilities table
      CREATE TABLE IF NOT EXISTS vulnerabilities (
        id SERIAL PRIMARY KEY,
        scanned_image_id INTEGER NOT NULL REFERENCES scanned_images(id) ON DELETE CASCADE,
        vulnerability_id TEXT NOT NULL,
        pkg_name TEXT NOT NULL,
        installed_version TEXT NOT NULL,
        fixed_version TEXT,
        severity TEXT NOT NULL,
        title TEXT,
        description TEXT,
        datasource TEXT
      );

      -- Create indexes for vulnerabilities table
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_scanned_image_id ON vulnerabilities(scanned_image_id);
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_vulnerability_id ON vulnerabilities(vulnerability_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vulnerabilities_unique_vuln ON vulnerabilities(scanned_image_id, vulnerability_id, pkg_name, installed_version);
    `;

    await db.execute(createTables);
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to set up database:', error);
      process.exit(1);
    });
}

module.exports = setupDatabase;
