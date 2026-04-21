const path = require('path');

// Load .env.test if present; CI passes env vars directly.
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

process.env.NODE_ENV = 'test';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_secret_at_least_32_characters_long__';
}

module.exports = async () => {
  const { umzug, sequelize } = require('../src/db/migrator');
  await sequelize.authenticate();
  await umzug.up();
};
