'use strict';

const express = require('express');
const Busboy = require('busboy');
const path = require('path');
const dotenv = require('dotenv');
const dbwriter = require('../db/dbwriter');
const dbreader = require('../db/dbreader');
const { Pool } = require('pg');
const cloud = require('../cloud/s3');

dotenv.config();

const router = express.Router();

/* const dbconfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};*/
const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

const s3config = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION,
};

const getBookId = async () => {
  const pool = new Pool(dbconfig);
  const client = await pool.connect();
  const result = await client.query({
    rowMode: 'array',
    text: `SELECT nextval('book_id')`,
  });
  await client.end();
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
  const updateUser = pgU.update('usersdata');
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
  types['photos'] = 'array';
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
  const bookData = { path: [], photos: [] };
  const id = await getBookId();
  if (!req.session.name) {
    res.cookie('redirect', '/addbook');
    res.redirect('/login');
    return;
  }
  bookData['login'] = req.session.name;
  bookData['id'] = id;
  console.log(s3config);
  const s3 = cloud.open(s3config);
  const busboy = new Busboy({ headers: req.headers });
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    let key = '';
    if (fieldname === 'photos') {
      key = `photos/${id}/` + filename;
      bookData['photos'].push(key);
    } else if (fieldname === 'books') {
      key = `books/${id}/` + filename;
      bookData['path'].push(key);
    } else return;
    console.log('filename:', key);
    s3.upload(process.env.BUCKET, file, key, mimetype, err => { if(err) console.log(err); });
  });
  busboy.on('field', (name, value) => {
    bookData[name] = value;
  });
  busboy.on('finish', () => {
    delete bookData.add;
    console.log('BookData:', bookData);
    addBook(res, bookData);
  });
  return req.pipe(busboy);
});

const createBook = async id => {
  let book = '';
  const pool = new Pool(dbconfig);
  const client = await pool.connect();
  const result = await client.query({
    rowMode: 'object',
    text: `SELECT * FROM books WHERE id = ${id};`,
  });
  await client.end();
  const bookData = result.rows[0];
  book = `<div class="book">
  <a href="/book/${bookData.id}">
  <img src="https://${process.env.BUCKET}.s3.us-east-2.amazonaws.com/${bookData.photos[0]}">
  <p>${bookData.name}</p>
  <div class="price">${bookData.year}</div>
  <div class="price">${bookData.price} $</div>
  </a></div>`;
  return book;
};

const createPagination = (pagesCount, url, page) => {
  if (pagesCount < 2) {
    return [];
  }
  const pagination = [];
  for (let i = 1; i <= pagesCount; i++) {
    pagination.push(`<a href="${url}/page/${i}" class="pagenumber">${i}</a>`);
  }
  pagination[page - 1] = `<a href="${url}/page/${page}" class="pagenumber_selected">${page}</a>`;
  if (parseInt(page) !== 1) {
    pagination.unshift(`<a href="${url}/page/${page - 1}" class="pagenumber">&lt</a>`);
  }
  if (parseInt(page) < pagesCount) {
    pagination.push(`<a href="${url}/page/${page + 1}" class="pagenumber">&gt</a>`);
  }
  return pagination;
};

const getBooks = (login, bookType, url, page, res) => {
  const pg = dbreader.open(dbconfig);
  pg.select('usersdata')
    .where({ login })
    .fields([ bookType ])
    .then(async result => {
      pg.close();
      const books = result[0][bookType];
      const currentBooks = books.slice((page - 1) * 8, (page - 1) * 8 + 8);
      // load books from db
      const booksRender = [];
      for (let bookId of currentBooks) {
        const bookHtml = await createBook(bookId);
        booksRender.push(bookHtml);
      }
      // set up pagination for page
      const pagesCount = Math.ceil(books.length / 8);
      const pagination = createPagination(pagesCount, url, page);
      // render the page
      res.render('views' + url, { layout: 'default', pagination: pagination, books: booksRender });
    });
};

router.get('/mybooks', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account/mybooks');
    res.redirect('/login');
    return;
  }
  getBooks(login, 'uploaded_books', '/account/mybooks', 1, res);
});

router.get('/mybooks/page/:page', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account' + req.url);
    res.redirect('/login');
    return;
  }
  if (req.params.page === '0') {
    res.redirect('/account/mybooks');
    return;
  }
  getBooks(login, 'uploaded_books', '/account/mybooks', req.params.page, res);
});

router.get('/likedbooks', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account/likedbooks');
    res.redirect('/login');
    return;
  }
  getBooks(login, 'liked_books', '/account/likedbooks', 1, res);
});

router.get('/likedbooks/page/:page', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account' + req.url);
    res.redirect('/login');
    return;
  }
  if (req.params.page === '0') {
    res.redirect('/account/likedbooks');
    return;
  }
  getBooks(login, 'liked_books', '/account/likedbooks', req.params.page, res);
});

router.get('/boughtbooks', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account/boughtbooks');
    res.redirect('/login');
    return;
  }
  getBooks(login, 'bought_books', '/account/boughtbooks', 1, res);
});

module.exports = router;
