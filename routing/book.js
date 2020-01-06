'use strict';

const express = require('express');
const dbreader = require('../db/dbreader');
const cloud = require('../cloud/s3');

const router = express.Router();

const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

const s3config = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION,
};

const renderBook = (l, b, id, res) => {
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
        id: book.id, bought: b, liked: l, path: book.path[0] });
    });
};

const purchasedBook = (id, login, res) => {
  if (!login) {
    renderBook(false, false, id, res);
    return;
  }
  const pg = dbreader.open(dbconfig);
  pg.select('usersdata')
    .where({ login })
    .fields([ 'boughtbooks', 'likedbooks' ])
    .then(result => {
      const boughtbooks = result[0].boughtbooks;
      const likedbooks = result[0].likedbooks;
      renderBook(likedbooks.includes(Number(id)), boughtbooks.includes(Number(id)), id, res);
    });
};

router.get('/book/:id', (req, res) => {
  const id = req.params.id;
  const login = req.session.name;
  console.log('in get: ', id, login);
  purchasedBook(id, login, res);
});

const downloadBook = (id, name, res) => {
  console.log('in downloadBook function');
  const s3 = cloud.open(s3config);
  console.log(process.env.BUCKET, `books/${id}/${name}`);
  s3.download(process.env.BUCKET, `books/${id}/${name}`, (err, data) => {
    if (err){
      console.error(err);
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.write('Error: can not download the book: server is not available or book not found. Service Unavailable!')
      res.end();
      return;
    }
    console.log('downloaded from amazon. start sending to client');
    res.writeHead(200, { 'Content-Type': 'application/pdf' });
    res.write(data.Body);
    res.end();
  });
};

router.get('/books/:id/:name', (req, res) => {
  const bookid = req.params.id;
  const bookname = req.params.name;
  const login = req.session.name;
  if (!login) {
    console.log('not login');
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    res.write('Error: user not login. Unauthorized');
    res.end();
    return;
  }
  const pg = dbreader.open(dbconfig);
  pg.select('usersdata')
    .where({ login })
    .fields([ 'login', 'boughtbooks' ])
    .then(result => {
      const books = result[0].boughtbooks;
      console.log(books, bookid);
      if (books.includes(Number(bookid))) {
        downloadBook(bookid, bookname, res);
      } else {
        console.log('not bought');
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.write('Error: user not bought this book. Bad Request!');
        res.end();
      }
    });
});

module.exports = router;
