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

// Scanned Images table
const scannedImages = pgTable('scanned_images', {
    id: serial('id').primaryKey(),
    imageName: text('image_name').notNull().unique(), // Unique constraint for image_name
    lastScannedAt: timestamp('last_scanned_at').defaultNow().notNull(),
    status: text('status').notNull(), // e.g., 'scanned', 'pending_scan', 'failed_scan', 'image_not_found', 'trivy_error'
    rawTrivyOutput: jsonb('raw_trivy_output') // Storing raw Trivy JSON output
});

// Vulnerabilities table
const vulnerabilitiesTable = pgTable('vulnerabilities', {
    id: serial('id').primaryKey(),
    scannedImageId: integer('scanned_image_id').notNull().references(() => scannedImages.id, { onDelete: 'cascade' }),
    vulnerabilityId: text('vulnerability_id').notNull(), // e.g., CVE-2023-12345
    pkgName: text('pkg_name').notNull(),
    installedVersion: text('installed_version').notNull(),
    fixedVersion: text('fixed_version'), // Nullable
    severity: text('severity').notNull(), // CRITICAL, HIGH, MEDIUM, LOW
    title: text('title'), // Nullable
    description: text('description'), // Nullable
    datasource: text('datasource') // Nullable, e.g., from Trivy's DataSource.Name
}, (table) => {
    return {
        vulnerabilityIdx: unique().on(table.scannedImageId, table.vulnerabilityId, table.pkgName, table.installedVersion), // Ensure unique vulnerability per image, package and version
        vulnerabilityIdIdx: pgIndex('vulnerability_id_idx').on(table.vulnerabilityId) // Index on vulnerability_id for faster lookups
        // Drizzle ORM typically creates an index for foreign keys automatically (scannedImageId)
        // An index on scanned_images.image_name is implicitly created due to the .unique() constraint.
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
    scannedImages, // Now defined before export
    vulnerabilities: vulnerabilitiesTable // Now defined before export
};