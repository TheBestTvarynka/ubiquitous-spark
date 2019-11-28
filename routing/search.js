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
  connectionString: process.env.DATABASE_URL
};

function parseBooks(rows) {
  let arr = '';

  rows.forEach(row => {
    arr += `<div class="test"><img class="cover" src="https://${process.env.BUCKET}.s3.us-east-2.amazonaws.com/${row.photos[0]}"><p class="description">
      ${row.author} - ${row.name}
      </p><div class="price">100$</div></div>`;
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
  console.log(where);
  console.log(where);
  const pg = dbreader.open(dbconfig);
  pg.select('books')
    .where(where)
    .then(rows => {
      console.log(rows);
      const list = parseBooks(rows);
      res.render('views/search', { layout: 'default', message: list, where: where });
    });
});

/*
  const filters = {
    filter: req.body.select_filter,
    value: req.body.value,
    //valueEmpty === 1 - value is empty
    valueEmpty: req.body.value === '',
    publisher: req.body.publisher,
    //publisherEmpty === 1 - publisher is empty
    publisherEmpty: req.body.publisher === '',
    year: req.body.year,
    //yearEmpty === 1 - year is empty
    yearEmpty: req.body.year === '',
  };
  console.log(filters);

  const pg = dbreader.open(dbconfig);
  let list = '';

  // testing the 'workability' of 'book' adding to the "results" div
  // list = '<div class=\'test\'><p>Your book</p><div class=\'price\'>100$</div></div><div class=\'test\'><p>Your book</p><div class=\'price\'>100$</div></div><div class=\'test\'><p>Your book</p><div class=\'price\'>100$</div></div>';
  // res.render('views/search', { layout: 'default', message: list });
  // return;

  if (!filters.valueEmpty && filters.publisherEmpty && filters.yearEmpty) {
    if (filters.filter === 'book') {
      pg.select('books')
        .where({ name: filters.value })
        .then(rows => {
          console.log(':=', rows);
          list += parseBooks(rows);
          console.log('list:', list);
        });
    } else {
      pg.select('books')
        .where({ author: filters.value })
        .then(rows => {
          list += parseBooks(rows);
        });
    }
  } else if (filters.valueEmpty && !filters.publisherEmpty && filters.yearEmpty) {
    pg.select('books')
      .where({ publishing: filters.publisher })
      .then(rows => {
        list += parseBooks(rows);
      });
  } else if (filters.valueEmpty && filters.publisherEmpty && !filters.yearEmpty) {
    pg.select('books')
      .where({ year: parseInt(filters.year) })
      .then(rows => {
        list += parseBooks(rows);
      });
  } else if (filters.valueEmpty && !filters.publisherEmpty && !filters.yearEmpty) {
    pg.select('books')
      .where({ year: parseInt(filters.year), publishing: filters.publisher })
      .then(rows => {
        list += parseBooks(rows);
      });
  } else if (!filters.valueEmpty && filters.publisherEmpty && !filters.yearEmpty) {
    if (filters.filter === 'book') {
      pg.select('books')
        .where({ name: filters.value, year: parseInt(filters.year) })
        .then(rows => {
          list += parseBooks(rows);
        });
    } else {
      pg.select('books')
        .where({ author: filters.value, year: parseInt(filters.year) })
        .then(rows => {
          list += parseBooks(rows);
        });
    }
  } else if (!filters.valueEmpty && !filters.publisherEmpty && filters.yearEmpty) {
    if (filters.filter === 'book') {
      pg.select('books')
        .where({ name: filters.value, publishing: filters.publisher })
        .then(rows => {
          list += parseBooks(rows);
        });
    } else {
      pg.select('books')
        .where({ author: filters.value, publishing: filters.publisher })
        .then(rows => {
          list += parseBooks(rows);
        });
    }
  } else if (!filters.valueEmpty && !filters.publisherEmpty && !filters.yearEmpty) {
    if (filters.filter === 'book') {
      pg.select('books')
        .where({
          name: filters.value,
          publishing: filters.publisher,
          year: parseInt(filters.year)
        })
        .then(rows => {
          list += parseBooks(rows);
        });
    } else {
      pg.select('books')
        .where({
          author: filters.value,
          publishing: filters.publisher,
          year: parseInt(filters.year)
        })
        .then(rows => {
          list += parseBooks(rows);
        });
    }
  }
  console.log('List = ' + list);
  res.render('views/search', { layout: 'default', message: list });
});
*/
module.exports = router;
