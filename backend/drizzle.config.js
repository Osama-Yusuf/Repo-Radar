require('dotenv').config();

/** @type { import("drizzle-kit").Config } */
module.exports = {
  dialect: 'postgresql', // Added dialect for PostgreSQL
  schema: "./src/schema/schema.js",
  out: "./drizzle",
  // driver: 'pg', // Removed driver field, dialect should be sufficient
  strict: true,
  verbose: true,
  dbCredentials: {
    url: `postgresql://${process.env.POSTGRESQL_USER || 'repo_radar_user'}:${process.env.POSTGRESQL_PASSWORD}@${process.env.POSTGRESQL_HOST || 'localhost'}:${process.env.POSTGRESQL_PORT || '5432'}/${process.env.POSTGRESQL_DATABASE || 'repo_radar'}`
  }
}
