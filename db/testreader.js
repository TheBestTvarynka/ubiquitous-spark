'use strict';

const dbreader = require('./dbreader');
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
  const pg = dbreader.open(dbconfig);
  const cursor = pg.select('chat')
    .where({ time: '>2019-12-15T17:12:54.921Z' })
    .order('id', false)
    .fields([ 'id', 'author', 'time' ]);
  console.log('==== starting ===');
  const res = await cursor.limit(5);
  pg.close();
  console.log('res', res);
  console.log('==== ending ===');
})();
