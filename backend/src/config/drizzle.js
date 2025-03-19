const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const schema = require('../schema/schema');

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE || 'repo_radar',
  user: process.env.POSTGRESQL_USER || 'repo_radar_user',
  password: process.env.POSTGRESQL_PASSWORD,
  ssl: process.env.POSTGRESQL_SSL === 'true'
});

const db = drizzle(pool, { schema });

module.exports = {
  pool,
  db
};
