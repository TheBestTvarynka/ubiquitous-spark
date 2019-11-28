'use strict';

const express = require('express');
const dbreader = require('../db/dbreader');

const router = express.Router();

const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

router.get('/book/:id', (req, res) => {
  const id = req.params.id;
  console.log(id);
  const pg = dbreader.open(dbconfig);
  pg.select('books')
    .where({ id })
    .then(books => {
      pg.close();
      const book = books[0];
      res.render('views/book', { layout: 'default', book });
    });
});

module.exports = router;
