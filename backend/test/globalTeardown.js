module.exports = async () => {
  const sequelize = require('../src/db/sequelize');
  await sequelize.close();
};
