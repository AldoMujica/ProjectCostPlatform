const path = require('path');
const fs = require('fs');
const { Umzug, SequelizeStorage } = require('umzug');
const sequelize = require('./sequelize');

const migrationsDir = path.join(__dirname, 'migrations');

const umzug = new Umzug({
  migrations: {
    glob: ['*.{js,sql}', { cwd: migrationsDir }],
    resolve: ({ name, path: filePath, context }) => {
      if (filePath.endsWith('.sql')) {
        const sql = fs.readFileSync(filePath, 'utf8');
        return {
          name,
          up: async () => context.sequelize.query(sql),
          down: async () => {
            throw new Error(`SQL migration ${name} is irreversible. Write an explicit down.`);
          },
        };
      }
      const mod = require(filePath);
      return {
        name,
        up: async () => mod.up({ context }),
        down: async () => mod.down({ context }),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'sequelize_meta' }),
  logger: console,
});

module.exports = { umzug, sequelize };

if (require.main === module) {
  const cmd = process.argv[2] || 'up';
  umzug[cmd]()
    .then(() => {
      console.log(`✓ migrator ${cmd} complete`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`✗ migrator ${cmd} failed`, err);
      process.exit(1);
    });
}
