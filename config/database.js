require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const config = {
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'merit_api',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true
  }
};

module.exports = {
  development: config,
  test: config,
  production: {
    ...config,
    logging: false
  }
};
