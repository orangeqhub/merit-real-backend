'use strict';

const { sequelize } = require('../models');

async function main() {
  await sequelize.query('DROP TABLE IF EXISTS "PropertyAttributeValues" CASCADE');
  await sequelize.query('DROP TABLE IF EXISTS "PropertyImages" CASCADE');
  await sequelize.query('DROP TABLE IF EXISTS "Properties" CASCADE');
  await sequelize.query('DROP TABLE IF EXISTS "PropertyAttributes" CASCADE');
  await sequelize.query('DROP TABLE IF EXISTS "PropertyCategories" CASCADE');
  await sequelize.query('DROP TYPE IF EXISTS "enum_PropertyAttributes_type" CASCADE');
  await sequelize.query('DROP TYPE IF EXISTS "enum_Properties_status" CASCADE');
  console.log('dropped');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
