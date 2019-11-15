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
  res.render('views/addbook', { layout: 'default', message: 'Have a book? Good idea to sell it' });
});

router.post('/addbook', (req, res) => {
  const bookData = {};
  const busboy = new Busboy({ headers: req.headers });
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    const pathFile = path.join(process.env.ROOT_DIR, 'uploads/' + filename);
    bookData['path'] = pathFile;
    file.pipe(fs.createWriteStream(pathFile));
  });
  busboy.on('field', (name, value) => {
    bookData[name] = value;
  });
  busboy.on('finish', () => {
    res.writeHead(200, { 'Connection': 'close' });
    console.log(bookData);
    res.end("That's all folks!");
  });
  return req.pipe(busboy);
});

module.exports = router;
