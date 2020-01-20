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
  let res = await cursor.value({ login: 'ttt', hash: '$2b$10$hbqwxeMh.M48ekZM/ZaihehWLKnAi5vV8FEndOOhSYO29L/7.dxFi' },
      { login: 'value', hash: 'value' });
  console.log('Result of inserting:', res);
  console.log('==== ending ===');

  const update = pg.update('users');
  console.log('==== starting ===');
  res = await update.where({ login: 'ttt' })
    .set({ hash: '$2b$10$HBQWXEMH.M48EKZM/ZAIHEHWLKNAI5VV8FENDOOHSYO29L/7.DXFI' },
         { hash: 'value' });
  pg.close();
  console.log('Result of updating:', res);
  console.log('==== ending ===');
})();
