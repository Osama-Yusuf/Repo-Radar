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
        role VARCHAR(10) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create app_settings table
      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        github_api_url TEXT,
        github_token TEXT,
        kubernetes_namespaces JSONB DEFAULT '[]',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT app_settings_single_row CHECK (id = 1)
      );

      -- Create tracked_images table
      CREATE TABLE IF NOT EXISTS tracked_images (
        id SERIAL PRIMARY KEY,
        image_name TEXT NOT NULL,
        image_tag TEXT NOT NULL,
        image_digest TEXT,
        namespace TEXT,
        last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        scan_status TEXT NOT NULL,
        raw_trivy_output JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(image_name, image_tag, image_digest)
      );

      -- Create image_vulnerabilities table
      CREATE TABLE IF NOT EXISTS image_vulnerabilities (
        id SERIAL PRIMARY KEY,
        tracked_image_id INTEGER NOT NULL REFERENCES tracked_images(id) ON DELETE CASCADE,
        vulnerability_cve_id TEXT NOT NULL,
        pkg_name TEXT NOT NULL,
        installed_version TEXT NOT NULL,
        fixed_version TEXT,
        severity TEXT NOT NULL,
        title TEXT,
        description TEXT,
        datasource TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create gitleaks_findings table
      CREATE TABLE IF NOT EXISTS gitleaks_findings (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        secret TEXT NOT NULL,
        file_path TEXT NOT NULL,
        line_number INTEGER,
        commit_hash TEXT NOT NULL,
        author TEXT,
        date TIMESTAMP,
        tags JSONB,
        rule_id TEXT NOT NULL,
        scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        commit_url TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- Create monitored_endpoints table
      CREATE TABLE IF NOT EXISTS monitored_endpoints (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        check_interval_seconds INTEGER NOT NULL DEFAULT 60,
        type TEXT NOT NULL DEFAULT 'custom',
        source_namespace TEXT,
        source_resource_name TEXT,
        source_resource_kind TEXT,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        last_checked_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create endpoint_status_history table
      CREATE TABLE IF NOT EXISTS endpoint_status_history (
        id SERIAL PRIMARY KEY,
        endpoint_id INTEGER NOT NULL REFERENCES monitored_endpoints(id) ON DELETE CASCADE,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status_code INTEGER,
        status_ok BOOLEAN NOT NULL,
        response_time_ms INTEGER,
        error_message TEXT
      );

      -- Create index for endpoint_status_history table
      CREATE INDEX IF NOT EXISTS endpoint_history_idx ON endpoint_status_history (endpoint_id, timestamp);

      -- Create indexes for image_vulnerabilities table
      CREATE INDEX IF NOT EXISTS idx_image_vulnerabilities_tracked_image_id ON image_vulnerabilities(tracked_image_id);
      CREATE INDEX IF NOT EXISTS idx_image_vulnerabilities_vulnerability_cve_id ON image_vulnerabilities(vulnerability_cve_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_image_vulnerabilities_unique_vuln ON image_vulnerabilities(tracked_image_id, vulnerability_cve_id, pkg_name, installed_version);
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
