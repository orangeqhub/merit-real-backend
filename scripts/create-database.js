'use strict';

require('dotenv').config();
const { Client } = require('pg');

async function createDatabase() {
  const dbName = process.env.DB_NAME || 'merit_api';

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log(`Connected to PostgreSQL on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}`);

    const exists = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (exists.rowCount > 0) {
      console.log(`Database "${dbName}" already exists. Skipping creation.`);
    } else {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Failed to create database:', error.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

createDatabase();
