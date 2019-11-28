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
  ssl: true,
};

function parseBooks(rows) {
  let arr = '';

  //console.log('Rows in parseBooks' + rows[0]);
  
  rows.forEach(row => {
    arr += '<div class=\'test\'><img class=\'cover\' src=\'' + row.photos[0]  + '\'><p class=\'description\'>' +
      row.author + ' - ' + row.name +
      '</p><div class=\'price\'>100$</div></div>';
  });

  //console.log('Arr in parseBooks' + arr);
 
  

 /* for(let i = 0; i < 7; ++i)
  arr += '<div class=\'test\'><img class=\'cover\' src=\'\'><p class=\'description\'>Your book</p><div class=\'price\'>100$</div></div>';*/

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

  //console.log(where);
	
  const pg = dbreader.open(dbconfig);
  pg.select('books')
    .where(where)
    .then(rows => {
      console.log(rows);
      const list = parseBooks(rows);
      console.log(list);
      res.render('views/search', { layout: 'default', message: list, where: where });
    });
});

module.exports = router;
