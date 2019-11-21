'use strict';

const express = require('express');
const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const dbwriter = require('../db/dbwriter');
const { Pool } = require('pg');

dotenv.config();

const router = express.Router();

const dbconfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

const getBookId = async () => {
  const pool = new Pool(dbconfig);
  const client = await pool.connect();
  const result = await client.query({
    rowMode: 'array',
    text: `SELECT nextval('book_id')`,
  });
  return result.rows[0][0];
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
  const pgU = dbwriter.open(dbconfig);
  const updateUser = pgU.update('usersaccounts');
  updateUser.set({ uploaded_books: `array_cat(uploaded_books, ARRAY[${bookData.id}])` }, { uploaded_books: 'function' })
            .where({ login: bookData.login })
            .then(result => {
              console.log('=========UPDATE========');
              console.log(result);
              console.log('=========UPDATE========');
            });
  const types = [];
  for (const field in bookData) {
    types[field] = 'value';
  }
  types['path'] = 'array';
  types['preview'] = 'array';
  console.log('=================');
  console.log(bookData.path);
  console.log('=================');
  const pg = dbwriter.open(dbconfig);
  const writeData = pg.insert('books');
  writeData.value(bookData, types)
           .then(result => {
             pg.close();
             console.log(result);
             res.render('views/addbook', { layout: 'default', message: 'Your book has been added! Maybe you have something else?' });
           });
};

router.post('/addbook', async (req, res) => {
  const bookData = { path: [], preview: [] };
  const id = await getBookId();
  if (!req.session.name) {
    res.cookie('redirect', '/addbook');
    res.redirect('/login');
    return;
  }
  bookData['login'] = req.session.name;
  bookData['id'] = id;
  console.log(id);
  fs.mkdirSync(process.env.ROOT_DIR + `uploads/${id}/books`, { recursive: true }, err => { if(err) console.log(err) });
  fs.mkdirSync(process.env.ROOT_DIR + `uploads/${id}/photos`, { recursive: true }, err => { if(err) console.log(err) });
  const busboy = new Busboy({ headers: req.headers });
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (fieldname === 'photos') {
      const pathToFile = `uploads/${id}/photos/` + filename;
      bookData['preview'].push(pathToFile);
      file.pipe(fs.createWriteStream(path.join(process.env.ROOT_DIR, pathToFile)));
    } else if (fieldname === 'books') {
      const pathToFile = `uploads/${id}/books/` + filename;
      bookData['path'].push(pathToFile);
      file.pipe(fs.createWriteStream(path.join(process.env.ROOT_DIR, pathToFile)));
    }
  });
  busboy.on('field', (name, value) => {
    bookData[name] = value;
  });
  busboy.on('finish', () => {
    delete bookData.add;
    addBook(res, bookData);
  });
  return req.pipe(busboy);
});

router.get('/mybooks', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account/mybooks');
    res.redirect('/login');
    return;
  }
  res.render('views/account/mybooks', { layout: 'default' });
});

router.get('/likedbooks', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account/likedbooks');
    res.redirect('/login');
    return;
  }
  res.render('views/account/likedbooks', { layout: 'default' });
});

module.exports = router;
