'use strict';

const express = require('express');
const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const dbwriter = require('../db/dbwriter');

dotenv.config();

const router = express.Router();

const dbconfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

router.get('/addbook', (req, res) => {
  if (!req.session.name) {
    res.cookie('redirect', '/addbook');
    res.redirect('login');
  } else {
    console.log('get [book]: ', req.session.name);
    res.render('views/addbook', { layout: 'default', message: 'Have a book? Good idea to sell it' });
  }
});

const addBook = (res, bookData) => {
  const types = [];
  for (const field in bookData) {
    types[field] = 'value';
  }
  types['path'] = 'array';
  types['preview'] = 'array';
  types['id'] = 'function';
  bookData['id'] = `nextval('book_id')`;
  const pg = dbwriter.open(dbconfig);
  const writeData = pg.insert('books');
  writeData.value(bookData, types)
           .then(result => {
             pg.close();
             console.log(result);
             res.render('views/addbook', { layout: 'default', message: 'Your book has been added! Maybe you have something else?' });
           });
};

router.post('/addbook', (req, res) => {
  const bookData = { path: [], preview: [] };
  if (!req.session.name) {
    res.cookie('redirect', '/addbook');
    res.redirect('/login');
    return;
  }
  bookData['login'] = req.session.name;
  const busboy = new Busboy({ headers: req.headers });
  // when we get a file
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    const pathFile = path.join(process.env.ROOT_DIR, 'uploads/' + filename);
    if (fieldname === 'photos') {
      bookData['preview'].push(filename);
    }
    if (fieldname === 'books') {
      bookData['path'].push(filename);
    }
    file.pipe(fs.createWriteStream(pathFile));
  });
  // when we get just a field
  busboy.on('field', (name, value) => {
    bookData[name] = value;
  });
  // when we finish
  busboy.on('finish', () => {
    // write all book data in db
    delete bookData.add;
    addBook(res, bookData);
  });
  return req.pipe(busboy);
});

module.exports = router;
