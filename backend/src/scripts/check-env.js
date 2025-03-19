require('dotenv').config();

function checkEnvironment() {
  const requiredVars = [
    'POSTGRESQL_USER',
    'POSTGRESQL_PASSWORD',
    'POSTGRESQL_DATABASE',
    'POSTGRESQL_HOST',
    'POSTGRESQL_PORT'
  ];

  const missing = [];
  const config = {};

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
    } else {
      config[varName] = value;
    }
  }

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`  - ${varName}`);
    });
    console.error('\nPlease ensure these variables are set in your .env file or environment.');
    console.error('Current configuration:');
    console.error(`  POSTGRESQL_USER=${process.env.POSTGRESQL_USER || 'repo_radar_user'} (default: repo_radar_user)`);
    console.error(`  POSTGRESQL_DATABASE=${process.env.POSTGRESQL_DATABASE || 'repo_radar'} (default: repo_radar)`);
    console.error(`  POSTGRESQL_HOST=${process.env.POSTGRESQL_HOST || 'localhost'} (default: localhost)`);
    console.error(`  POSTGRESQL_PORT=${process.env.POSTGRESQL_PORT || '5432'} (default: 5432)`);
    console.error('  POSTGRESQL_PASSWORD=<not shown> (required, no default)');
    process.exit(1);
  }

  console.log('Environment configuration is valid.');
  console.log('Database connection string will be:');
  console.log(`postgresql://${config.POSTGRESQL_USER}:***@${config.POSTGRESQL_HOST}:${config.POSTGRESQL_PORT}/${config.POSTGRESQL_DATABASE}`);
}

if (require.main === module) {
  checkEnvironment();
}

module.exports = checkEnvironment;
