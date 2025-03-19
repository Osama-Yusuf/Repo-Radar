const { pgTable, serial, text, integer, timestamp, varchar, primaryKey, unique } = require('drizzle-orm/pg-core');

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

module.exports = {
    projects,
    branches,
    checkLogs,
    actions,
    secrets,
    webhookParameters
};