'use strict';

const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const connectingString = `postgressql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: connectingString,
  ssl: isProduction,
});

pool.connect();

module.exports = { pool };
