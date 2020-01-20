'use strict';

const dbwriter = require('./dbwriter');
const dotenv = require('dotenv');

dotenv.config();

/*
const dbconfig = {
  host: '127.0.0.1',
  port: 5432,
  database: 'demo',
  user: 'postgres',
  password: 'qkation',
};
*/
const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};
console.log(dbconfig);

(async () => {
  const pg = dbwriter.open(dbconfig);
  const cursor = pg.insert('users');
  console.log('==== starting ===');
  const res = await cursor.value({ login: 'ttt', hash: '$2b$10$hbqwxeMh.M48ekZM/ZaihehWLKnAi5vV8FEndOOhSYO29L/7.dxFi' },
      { login: 'value', hash: 'value' });
  pg.close();
  console.log('res', res);
  console.log('==== ending ===');
})();
