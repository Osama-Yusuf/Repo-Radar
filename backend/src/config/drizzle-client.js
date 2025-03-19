require('dotenv').config();
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const schema = require('../schema/schema');

// Using standard PostgreSQL environment variables to match docker-compose.yaml
const pool = new Pool({
    host: process.env.POSTGRESQL_HOST || 'localhost',
    port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
    database: process.env.POSTGRESQL_DATABASE || 'repo_radar',
    user: process.env.POSTGRESQL_USER || 'repo_radar_user',
    password: process.env.POSTGRESQL_PASSWORD || 'postgres'
});

const db = drizzle(pool, { schema });

// Clean up pool on exit
process.on('exit', () => {
    pool.end();
});

module.exports = {
    pool,
    db,
    schema
};
