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
    req.cookie('redirect', '/addbook');
    res.redirect('login');
  } else {
    console.log('get [book]: ', req.session.name);
    res.render('views/addbook', { layout: 'default', message: 'Have a book? Good idea to sell it' });
  }
});

const addBook = (res, bookData) => {
  const fieldsOrder = [];
  const values = { value: [], function: [], array: [] };
  const paths = bookData['path'];
  const previews = bookData['preview'];
  delete bookData.path;
  delete bookData.preview;
  for (const propereties in bookData) {
    fieldsOrder.push(propereties);
    values['value'].push(bookData[propereties]);
  }
  fieldsOrder.push('id');
  values['function'].push(`nextval('book_id')`);
  fieldsOrder.push('path');
  values['array'].push(paths);
  fieldsOrder.push('preview');
  values['array'].push(previews);
  const pg = dbwriter.open(dbconfig);
  const writeData = pg.insert('books');
  writeData.fields(fieldsOrder)
           .value(values)
           .then(result => {
             pg.close();
             console.log(result);
             res.render('views/addbook', { layout: 'default', message: 'Your book has been added! Maybe you have something else?' });
           });
};

router.post('/addbook', (req, res) => {
  const bookData = { path: [], preview: [] };
  if (!req.session.name) {
    req.cookies('redirect', '/addbook');
    res.redirect('/login');
    return;
  }
  bookData['login'] = req.session.name;
  const busboy = new Busboy({ headers: req.headers });
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
  busboy.on('field', (name, value) => {
    bookData[name] = value;
  });
  busboy.on('finish', () => {
    // write all book data in db
    delete bookData.add;
    addBook(res, bookData);
  });
  return req.pipe(busboy);
});

module.exports = router;
