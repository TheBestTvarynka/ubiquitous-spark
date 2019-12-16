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
      console.log('The book : <<<');
      console.log(book);
      console.log('>>>');
      const imageSource = 'https://' + process.env.BUCKET +
        '.s3.us-east-2.amazonaws.com/' + book.photos[0];
      res.render('views/book', { layout: 'default', image: imageSource,
        description: book.description, author: book.author, year: book.year,
        publishing: book.publishing, price: book.price, name: book.name,
        id: book.id });
    });
});

module.exports = router;
