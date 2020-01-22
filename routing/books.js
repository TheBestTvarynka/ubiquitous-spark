'use strict';

const express = require('express');
const Busboy = require('busboy');
const dotenv = require('dotenv');
const dbwriter = require('../db/dbwriter');
const dbreader = require('../db/dbreader');
const { Pool } = require('pg');
const cloud = require('../cloud/s3');

dotenv.config();

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

const getBookId = async () => {
  const pool = new Pool(dbconfig);
  const client = await pool.connect();
  const result = await client.query({
    rowMode: 'array',
    text: 'SELECT nextval(\'book_id\')',
  });
  await client.end();
  return result.rows[0][0];
};

router.get('/addbook', (req, res) => {
  if (!req.session.name) {
    res.cookie('redirect', '/addbook');
    res.redirect('login');
  } else {
    res.render('views/addbook', {
      layout: 'default',
      message: 'Have a book? Good idea to sell it'
    });
  }
});

const addBook = (res, bookData) => {
  const pgU = dbwriter.open(dbconfig);
  const updateUser = pgU.update('usersdata');
  updateUser.set({
    uploadedbooks: `array_cat(uploadedbooks, ARRAY[${bookData.id}])` }, {
    uploadedbooks: 'function'
  })
    .where({ login: bookData.login })
    .then(result => {
      console.log(result);
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
      res.render('views/addbook', {
        layout: 'default',
        message: 'Your book has been added! Maybe you have something else?'
      });
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
    s3.upload(process.env.BUCKET, file, key, mimetype, err => {
      if (err) console.log(err);
    });
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

/* const createBook = async (type, id, style) => {
  let book = '';
  const pool = new Pool(dbconfig);
  const client = await pool.connect();
  const result = await client.query({
    rowMode: 'object',
    text: `SELECT * FROM books WHERE id = ${id};`,
  });
  await client.end();
  const bookData = result.rows[0];
  if (!style) {
    book = `<div class="book" id="${bookData.id}">
    <a href="javascript:void(0))" onclick="delete_book(${bookData.id},` +
      `'/delete/${type}/${bookData.id}')" class="delete_button">&#x274C;</a>
    <a href="/book/${bookData.id}">
    <img src="https://${process.env.BUCKET}.s3.${process.env.REGION}.` +
      `amazonaws.com/${bookData.photos[0]}">
    <p>${bookData.name}</p>
    <div class="year">${bookData.year}</div>
    <div class="price">${bookData.price} $</div>
    </a></div>`;
  } else {
    book = `<div class="test">
    <a href="javascript:void(0))" onclick="delete_book(${bookData.id},` +
     `'/delete/${type}/${bookData.id}')" class="delete_button">&#x274C;</a>
    <img class="cover" src="https://${process.env.BUCKET}.s3.` +
    `${process.env.REGION}.amazonaws.com/${bookData.photos[0]}">
    <a href="/account">&#x274C;</p>
    <p class="description">${bookData.name}</p>
    <div class="price">${bookData.price} $</div>
    </a></div>`;
  }
  return book;
};
*/
const createBooks = async (type, ids, style) => {
  if (ids.length === 0) {
    return [];
  }
  const pool = new Pool(dbconfig);
  const client = await pool.connect();
  const text = `SELECT id, name, year, price, photos FROM books WHERE id =
    ANY(ARRAY[${ids.join(', ')}]);`;
  const result = await client.query({
    rowMode: 'object',
    text,
  });
  await client.end();
  // const bookData = result.rows[0];

  const books = result.rows.reduce((arr, bookData) => {
    let book;
    if (!style) {
      book = `<div class="book" id="${bookData.id}">
      <a href="javascript:void(0)" onclick="delete_book(${bookData.id},` +
        `'/delete/${type}/${bookData.id}')" class="delete_button">&#x274C;</a>
      <a href="/book/${bookData.id}">
      <img src="https://${process.env.BUCKET}.s3.${process.env.REGION}` +
        `.amazonaws.com/${bookData.photos[0]}">
      <p>${bookData.name}</p>
      <div class="year">${bookData.year}</div>
      <div class="price">${bookData.price} $</div>
      </a></div>`;
    } else {
      book = `<div class="test" id="${bookData.id}">
      <a href="javascript:void(0))" onclick="delete_book(${bookData.id},` +
        `'/delete/${type}/${bookData.id}')" class="delete_button">&#x274C;</a>
      <img class="cover" src="https://${process.env.BUCKET}.s3` +
        `.${process.env.REGION}.amazonaws.com/${bookData.photos[0]}">
      <a href="/account">&#x274C;</p>
      <p class="description">${bookData.name}</p>
      <div class="price">${bookData.price} $</div>
      </a></div>`;
    }
    arr.push(book);
    return arr;
  }, []);
  return books;
};

const createPagination = (pagesCount, url, page) => {
  if (pagesCount < 2) {
    return [];
  }
  const pagination = [];
  for (let i = 1; i <= pagesCount; i++) {
    pagination.push(`<a href="${url}/page/${i}" class="pagenumber">${i}</a>`);
  }
  pagination[page - 1] = `<a href="${url}/page/${page}"
  class="pagenumber_selected">${page}</a>`;
  if (parseInt(page) !== 1) {
    pagination.unshift(`<a href="${url}/page/${page - 1}"
    class="pagenumber">&lt</a>`);
  }
  if (parseInt(page) < pagesCount) {
    pagination.push(`<a href="${url}/page/${page + 1}"
    class="pagenumber">&gt</a>`);
  }
  return pagination;
};

const getBooks = (login, bookType, url, page, res) => {
  console.log(login, bookType);
  const pg = dbreader.open(dbconfig);
  pg.select('usersdata')
    .where({ login })
    .fields([ bookType ])
    .then(async result => {
      pg.close();
      console.log(result);
      const books = result[0][bookType];
      console.log('Books in getBooks: ', books);
      const currentBooks = books.slice((page - 1) * 8, (page - 1) * 8 + 8);
      // load books from db
      const booksRender = await createBooks(bookType, currentBooks, 0);
      const type = bookType.split('')
        .map(item => ((item === '_') ? ' ' : item))
        .join('');
      console.log(type);
      const disclaimer = (books.length === 0) ?
        '<p class="disclaimer">There are no ' +
        type + ' at the moment :(</p>' : '';
      // set up pagination for page
      const pagesCount = Math.ceil(books.length / 8);
      const pagination = createPagination(pagesCount, url, page);
      // render the page
      res.render('views' + url, { layout: 'default', pagination,
        books: booksRender, disclaimer });
    });
};

router.get('/uploadedbooks', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account/uploadedbooks');
    res.redirect('/login');
    return;
  }
  getBooks(login, 'uploadedbooks', '/account/mybooks', 1, res);
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
  getBooks(login, 'uploadedbooks', '/account/mybooks', req.params.page, res);
});

router.get('/likedbooks', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account/likedbooks');
    res.redirect('/login');
    return;
  }
  getBooks(login, 'likedbooks', '/account/likedbooks', 1, res);
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
  getBooks(login, 'likedbooks', '/account/likedbooks', req.params.page, res);
});

router.get('/boughtbooks', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account/boughtbooks');
    res.redirect('/login');
    return;
  }
  getBooks(login, 'boughtbooks', '/account/boughtbooks', 1, res);
});

router.get('/cart', (req, res) => {
  const login = req.session.name;
  console.log('login: ', login);

  if (!login) {
    res.cookie('redirect', '/cart');
    res.redirect('/login');
    return;
  }

  const pg = dbreader.open(dbconfig);
  pg.select('usersdata')
    .where({ login })
    .then(async result => {
      const cartItems = result[0].cart;
      console.log(cartItems);

      const items = await createBooks('cart', cartItems, 0);

      const button = (cartItems.length !== 0) ?
        '<a href="/payment">' +
        '<input type="button" class="pay" value="Proceed to payment"></a>' :
        '<a href="/"><input type="button" class="pay" value="Go shopping"></a>';
      const title = (cartItems.length !== 0) ?
        'Your cart items:' : 'Your cart is empty at the moment :(';
      pg.close();
      res.render('views/cart', {
        layout: 'default',
        books: items,
        disclaimer: title,
        button
      });
    });
});

/* const deleteCart = async login => {
  const pool = new Pool(dbconfig);
  const client = await pool.connect();
  await client.query({
    rowMode: 'object',
    text: `UPDATE TABLE usersdata SET cart = '{}::integer[]' WHERE` +
    `login = ${login};`,
  });
  await client.end();
};
*/

router.get('/payment', (req, res) => {
  const pg = dbreader.open(dbconfig);
  const login = req.session.name;

  if (!login) {
    res.cookie('redirect', '/cart');
    res.redirect('/login');
    return;
  }

  console.log('login :', login);
  pg.select('usersdata')
    .where({ login })
    .then(async result => {
      console.log(result);

      if (!result[0].activated) {
        res.cookie('redirect', '/cart');
        res.redirect('/activate');
      }

      const books = result[0].cart;
      const boughtbooks = result[0].boughtbooks;
      const boughtBooks = boughtbooks.concat(books);
      const boughtBooksFinal = Array.from(new Set(boughtBooks));
      const pgU = dbwriter.open(dbconfig);
      pgU.query(`UPDATE usersdata SET cart = '{}' WHERE login = '${login}'`,
        0,
        () => { });
      pgU.query(`UPDATE usersdata SET boughtbooks =
      '{${boughtBooksFinal.toString()}}' WHERE login = '${login}'`,
      0,
      () => {
        res.redirect('/purchases');
      });
      pgU.close();
      pg.close();
    });
});

router.post('/delete/:type/:id', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.redirect('login');
    return;
  }
  const type = req.params.type;
  const id = req.params.id;
  const values = {};
  values[type] = `array_remove(${type}, '${id}')`;
  const types = {};
  types[type] = 'function';
  const pg = dbwriter.open(dbconfig);
  pg.update('usersdata')
    .where({ login })
    .set(values, types)
    .then(result => {
      console.log(result);
      pg.close();
      res.status(200).end('Deleted');
    });
});

module.exports = router;
