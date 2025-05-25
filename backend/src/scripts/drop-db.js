require('dotenv').config();
const { db } = require('../config/drizzle-client');
const { sql } = require('drizzle-orm');
const schema = require('../schema/schema');

// Process command line arguments
const args = process.argv.slice(2);

// Display help if requested or if no arguments provided
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    displayHelp();
    process.exit(0);
}

async function main() {
    try {
        const command = args[0];
        const target = args[1];

        switch (command) {
            case 'db':
                if (target === 'tables') {
                    // Drop all tables with cascade
                    await dropAllTables();
                } else if (target === 'table' && args[2]) {
                    // Drop specific table with cascade
                    await dropSpecificTable(args[2]);
                } else {
                    console.error('Invalid command. Use --help for usage information.');
                    process.exit(1);
                }
                break;

            case 'tables':
                // Drop all tables data
                await dropAllTablesData();
                break;

            case 'table':
                if (target) {
                    // Drop specific table data - target is the table name
                    await dropSpecificTableData(target);
                } else {
                    console.error('Missing table name. Use --help for usage information.');
                    process.exit(1);
                }
                break;

            default:
                console.error('Invalid command. Use --help for usage information.');
                process.exit(1);
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        if (db.pool) {
            await db.pool.end();
        }
    }
}

function displayHelp() {
    console.log(`
Repo-Radar Database Management Script
====================================

Usage:
  node drop-db.js [command] [options]

Commands:
  db tables                 Drop all tables with cascade (schema remains)
  db table [table_name]     Drop specific table with cascade
  tables                    Drop all tables data (keep table structures)
  table [table_name]        Drop specific table data (keep table structure)
  --help, -h                Display this help message

Examples:
  node drop-db.js db tables
  node drop-db.js db table users
  node drop-db.js tables
  node drop-db.js table users

Note: Use with caution! These operations cannot be undone.
    `);
}

async function dropAllTables() {
    try {
        console.log('Starting to drop all tables with cascade...');

        // Get all tables from the schema
        const tables = Object.keys(schema);

        // Execute raw SQL to drop all tables with cascade
        await db.execute(sql`
            DO $$ 
            DECLARE
                tbl text;
            BEGIN
                FOR tbl IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
                LOOP
                    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(tbl) || ' CASCADE';
                END LOOP;
            END $$;
        `);

        console.log('All tables dropped successfully with cascade.');
    } catch (error) {
        console.error('Error dropping all tables:', error);
        throw error;
    }
}

async function dropSpecificTable(tableName) {
    try {
        // Check if table exists directly in schema
        if (schema[tableName]) {
            console.log(`Starting to drop table: ${tableName} with cascade...`);
            await db.execute(sql.raw(`DROP TABLE IF EXISTS ${tableName} CASCADE;`));
            console.log(`Table '${tableName}' dropped successfully with cascade.`);
            return;
        }

        // If not found directly, try to find the table by its database name
        // This handles cases where schema exports use camelCase but DB tables use snake_case
        const schemaEntries = Object.entries(schema);
        const matchingEntry = schemaEntries.find(([_, tableObj]) => {
            // Access the table name from the Drizzle table object
            // This works because Drizzle tables have a name property that contains the actual DB table name
            return tableObj.name === tableName;
        });

        if (matchingEntry) {
            console.log(`Starting to drop table: ${tableName} with cascade...`);
            await db.execute(sql.raw(`DROP TABLE IF EXISTS ${tableName} CASCADE;`));
            console.log(`Table '${tableName}' dropped successfully with cascade.`);
            return;
        }

        // If we get here, the table wasn't found
        console.error(`Table '${tableName}' not found in schema.`);
        console.log('Available tables:');
        schemaEntries.forEach(([key, tableObj]) => {
            console.log(`- ${tableObj.name} (schema key: ${key})`);
        });
        process.exit(1);
    } catch (error) {
        console.error(`Error dropping table '${tableName}':`, error);
        throw error;
    }
}

async function dropAllTablesData() {
    try {
        console.log('Starting to drop all tables data...');

        const tables = Object.keys(schema);

        for (const table of tables) {
            console.log(`Dropping data from table: ${table}`);
            await db.delete(schema[table]);
        }

        console.log('All tables data dropped successfully.');
    } catch (error) {
        console.error('Error dropping tables data:', error);
        throw error;
    }
}

async function dropSpecificTableData(tableName) {
    try {
        // Check if table exists directly in schema
        if (schema[tableName]) {
            console.log(`Starting to drop data from table: ${tableName}...`);
            await db.delete(schema[tableName]);
            console.log(`Data from table '${tableName}' dropped successfully.`);
            return;
        }

        // If not found directly, try to find the table by its database name
        const schemaEntries = Object.entries(schema);
        const matchingEntry = schemaEntries.find(([_, tableObj]) => {
            return tableObj.name === tableName;
        });

        if (matchingEntry) {
            console.log(`Starting to drop data from table: ${tableName}...`);
            await db.delete(schema[matchingEntry[0]]);
            console.log(`Data from table '${tableName}' dropped successfully.`);
            return;
        }

        // If we get here, the table wasn't found
        console.error(`Table '${tableName}' not found in schema.`);
        console.log('Available tables:');
        schemaEntries.forEach(([key, tableObj]) => {
            console.log(`- ${tableObj.name} (schema key: ${key})`);
        });
        process.exit(1);
    } catch (error) {
        console.error(`Error dropping data from table '${tableName}':`, error);
        throw error;
    }
}

// Run the main function
main();
