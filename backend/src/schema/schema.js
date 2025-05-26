const { pgTable, serial, text, integer, timestamp, varchar, primaryKey, unique, jsonb, index: pgIndex, boolean } = require('drizzle-orm/pg-core');

// Project table
const projects = pgTable('projects', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    repoUrl: text('repo_url').notNull(),
    checkInterval: integer('check_interval').notNull().default(5),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Branch table
const branches = pgTable('branches', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    branchName: text('branch_name').notNull(),
    lastCommitSha: text('last_commit_sha')
});

// CheckLog table
const checkLogs = pgTable('check_logs', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    branchName: text('branch_name').notNull(),
    commitSha: text('commit_sha'),
    commitMessage: text('commit_message'),
    commitAuthor: text('commit_author'),
    commitDate: timestamp('commit_date'),
    checkedAt: timestamp('checked_at').defaultNow().notNull(),
    status: text('status').notNull()
});

// Action table
const actions = pgTable('actions', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name'),
    actionType: text('action_type').notNull(),
    webhookUrl: text('webhook_url'),
    scriptContent: text('script_content'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Secret table
const secrets = pgTable('secrets', {
    id: serial('id').primaryKey(),
    actionId: integer('action_id').notNull().references(() => actions.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    value: text('value').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// WebhookParameter table
const webhookParameters = pgTable('webhook_parameters', {
    id: serial('id').primaryKey(),
    actionId: integer('action_id').notNull().references(() => actions.id, { onDelete: 'cascade' }),
    branch: text('branch').notNull(),
    name: text('name').notNull(),
    value: text('value').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
    return {
        unq: unique().on(table.actionId, table.branch, table.name)
    };
});

// User table for authentication
const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    password: text('password').notNull(), // Will store hashed passwords
    role: varchar('role', { length: 10 }).notNull().default('user'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// App Settings table
const app_settings = pgTable('app_settings', {
    id: serial('id').primaryKey(),
    github_api_url: text('github_api_url'),
    github_token: text('github_token'),
    kubernetes_namespaces: jsonb('kubernetes_namespaces').default([]),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
    return {
        // Ensure only one row can be inserted into app_settings
        singleRowConstraint: unique().on(table.id), // This doesn't enforce id=1, Drizzle doesn't support CHECK constraints directly in schema
        // A CHECK constraint like CHECK(id = 1) needs to be added manually in the database or via raw SQL migration.
    };
});

// Tracked Images table
const tracked_images = pgTable('tracked_images', {
    id: serial('id').primaryKey(),
    image_name: text('image_name').notNull(), // No longer unique on its own
    image_tag: text('image_tag').notNull(),
    image_digest: text('image_digest'), // Nullable
    namespace: text('namespace'), // Add namespace column to track which namespace the image was found in
    last_seen_at: timestamp('last_seen_at').defaultNow().notNull(), // Track when the image was last seen
    last_scanned_at: timestamp('last_scanned_at').defaultNow().notNull(),
    scan_status: text('scan_status').notNull(), // e.g., 'pending', 'scanning', 'success', 'failed'
    raw_trivy_output: jsonb('raw_trivy_output'), // Added back to match database structure
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
    return {
        // Unique constraint for image_name, image_tag, and image_digest combination
        unq: unique().on(table.image_name, table.image_tag, table.image_digest)
    };
});

// Image Vulnerabilities table
const image_vulnerabilities = pgTable('image_vulnerabilities', {
    id: serial('id').primaryKey(),
    tracked_image_id: integer('tracked_image_id').notNull().references(() => tracked_images.id, { onDelete: 'cascade' }),
    vulnerability_cve_id: text('vulnerability_cve_id').notNull(), // e.g., CVE-2023-12345
    pkgName: text('pkg_name').notNull(),
    installedVersion: text('installed_version').notNull(),
    fixedVersion: text('fixed_version'), // Nullable
    severity: text('severity').notNull(), // CRITICAL, HIGH, MEDIUM, LOW
    title: text('title'), // Nullable
    description: text('description'), // Nullable
    datasource: text('datasource'), // Nullable, e.g., from Trivy's DataSource.Name
    created_at: timestamp('created_at').defaultNow().notNull()
    // updated_at can be added if vulnerability details can change over time post-creation
}, (table) => {
    return {
        // Ensure unique vulnerability per image, CVE, package and version
        vulnerabilityIdx: unique().on(table.tracked_image_id, table.vulnerability_cve_id, table.pkgName, table.installedVersion),
        // Index on vulnerability_cve_id for faster lookups
        vulnerabilityIdIdx: pgIndex('vulnerability_cve_id_idx').on(table.vulnerability_cve_id)
        // Drizzle ORM typically creates an index for foreign keys automatically (tracked_image_id)
    };
});

// Gitleaks Findings table
const gitleaks_findings = pgTable('gitleaks_findings', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    secret: text('secret').notNull(),
    filePath: text('file_path').notNull(),
    lineNumber: integer('line_number'),
    commitHash: text('commit_hash').notNull(),
    author: text('author'),
    date: timestamp('date'),
    tags: jsonb('tags'),
    ruleId: text('rule_id').notNull(),
    scannedAt: timestamp('scanned_at').defaultNow().notNull(),
    commitUrl: text('commit_url'),
});

module.exports = {
    projects,
    branches,
    checkLogs,
    actions,
    secrets,
    webhookParameters,
    users,
    tracked_images, // Updated export
    image_vulnerabilities, // Updated export
    app_settings, // Export app_settings table
    gitleaks_findings // Export gitleaks_findings table
};

// Monitored Endpoints table
const monitored_endpoints = pgTable('monitored_endpoints', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    url: text('url').notNull().unique(),
    check_interval_seconds: integer('check_interval_seconds').notNull().default(60),
    type: text('type').notNull().default('custom'), // 'auto-discovered', 'custom'
    source_namespace: text('source_namespace'),
    source_resource_name: text('source_resource_name'),
    source_resource_kind: text('source_resource_kind'), // e.g., 'Ingress', 'Route'
    is_deleted: boolean('is_deleted').default(false).notNull(),
    last_checked_at: timestamp('last_checked_at'), // Nullable
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Endpoint Status History table
const endpoint_status_history = pgTable('endpoint_status_history', {
    id: serial('id').primaryKey(),
    endpoint_id: integer('endpoint_id').notNull().references(() => monitored_endpoints.id, { onDelete: 'cascade' }),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    status_code: integer('status_code'), // Nullable if network error
    status_ok: boolean('status_ok').notNull(),
    response_time_ms: integer('response_time_ms'), // Nullable
    error_message: text('error_message') // Nullable
}, (table) => {
    return {
        endpointHistoryIdx: pgIndex('endpoint_history_idx').on(table.endpoint_id, table.timestamp),
    };
});

module.exports = {
    projects,
    branches,
    checkLogs,
    actions,
    secrets,
    webhookParameters,
    users,
    tracked_images,
    image_vulnerabilities,
    app_settings,
    gitleaks_findings,
    monitored_endpoints,     // Export monitored_endpoints table
    endpoint_status_history  // Export endpoint_status_history table
};