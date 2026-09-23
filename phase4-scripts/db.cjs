'use strict';
const { Client } = require('pg');

function client() {
  return new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'merit123',
    database: 'merit_api',
  });
}

module.exports = { client };
