'use strict';

const express = require('express');
const router = express.Router();
// const fs = require('fs');
// const path = require('path');
// const dotenv = require('dotenv');
const dbreader = require('../db/dbreader');

/* const dbconfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};
*/

const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

function parseBooks(rows) {
  let arr = '';

  rows.forEach(row => {
    arr += `<a href="/book/${row.id}"><div class="test"><img class="cover" src="https://${process.env.BUCKET}.s3.us-east-2.amazonaws.com/${row.photos[0]}"><p class="description">
      ${row.author} - ${row.name}
      </p><div class="price">100$</div></div></a>`;
  });
  return arr;
}

router.post('/search', (req, res) => {
  // req.body
  const where = {};
  for (const field in req.body) {
    if (req.body[field] !== '') {
      where[field] = req.body[field];
    }
  }
  delete where.find_books;
  console.log('Sending data: <<<');
  console.log(where);
  console.log('>>>');
  const pg = dbreader.open(dbconfig);
  pg.select('books')
    .where(where)
    .then(rows => {
      console.log(rows);
      const list = parseBooks(rows);
      res.render('views/search', { layout: 'default', message: list,
        where });
    });
});

module.exports = router;
