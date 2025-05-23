require('dotenv').config();
const { db } = require('../config/drizzle-client');
const { sql } = require('drizzle-orm');

const excludedTables = ['users'];

const schema = require('../schema/schema');

async function dropAllTablesData() {
    try {
        console.log('Starting to drop all tables data...');

        const tables = Object.keys(schema).filter(table => !excludedTables.includes(table));

        for (const table of tables) {
            console.log(`Dropping data from table: ${table}`);
            await db.delete(schema[table]);
        }

        console.log('All tables data dropped successfully (except excluded tables).');
    } catch (error) {
        console.error('Error dropping tables data:', error);
    } finally {
        if (db.pool) {
            await db.pool.end();
        }
    }
}

dropAllTablesData();
