'use strict';

const express = require('express');
const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();

router.get('/addbook', (req, res) => {
  console.log('add book GET');
  res.render('views/addbook', { layout: 'default', message: 'Have a book? Good idea to sell it' });
});

router.post('/addbook', (req, res) => {
  const busboy = new Busboy({ headers: req.headers });
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    const saveTo = path.join(process.env.ROOT_DIR, 'uploads/' + filename);
    file.pipe(fs.createWriteStream(saveTo));
  });
  busboy.on('field', (...args) => {
    console.log('--------------------');
    console.dir(args);
  });
  busboy.on('finish', () => {
    res.writeHead(200, { 'Connection': 'close' });
    res.end("That's all folks!");
  });
  return req.pipe(busboy);
});

module.exports = router;
