const { pgTable, serial, text, integer, timestamp, varchar, primaryKey, unique, jsonb, index: pgIndex } = require('drizzle-orm/pg-core');

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
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Tracked Images table (formerly scannedImages)
const tracked_images = pgTable('tracked_images', {
    id: serial('id').primaryKey(),
    image_name: text('image_name').notNull(), // No longer unique on its own
    image_tag: text('image_tag').notNull(),
    image_digest: text('image_digest'), // Nullable
    last_scanned_at: timestamp('last_scanned_at').defaultNow().notNull(),
    scan_status: text('scan_status').notNull(), // e.g., 'pending', 'scanning', 'success', 'failed'
    // rawTrivyOutput removed as per new requirements for this table, will be in image_scan_results if needed
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
    return {
        // Unique constraint for image_name, image_tag, and image_digest combination
        unq: unique().on(table.image_name, table.image_tag, table.image_digest)
    };
});

// Image Vulnerabilities table (formerly vulnerabilitiesTable)
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

module.exports = {
    projects,
    branches,
    checkLogs,
    actions,
    secrets,
    webhookParameters,
    users,
    tracked_images, // Updated export
    image_vulnerabilities // Updated export
};