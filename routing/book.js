'use strict';

const express = require('express');
const dbreader = require('../db/dbreader');

const router = express.Router();

const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

const renderBook = (b, id, res) => {
  console.log(id, b);
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
        id: book.id, bought: String(b) });
    });
};

const purchasedBook = (id, login, res) => {
  if (!login) {
    renderBook(false, id, res);
    return;
  }
  const pg = dbreader.open(dbconfig);
  pg.select('usersdata')
    .where({ login })
    .fields([ 'bought_books' ])
    .then(result => {
      const books = result[0].bought_books;
      renderBook(books.includes(Number(id)), id, res);
    });
};

router.get('/book/:id', (req, res) => {
  const id = req.params.id;
  const login = req.session.name;
  console.log('in get: ', id, login);
  purchasedBook(id, login, res);
});

module.exports = router;
