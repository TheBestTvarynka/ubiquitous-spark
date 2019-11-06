'use strict';

const express = require('express');
const { pool } = require('./db/config');

const app = express();
const port = 8080;

const printErr = err => {
  if (err) {
    console.log(err);
  }
};

app.get('/', (req, res) => {
  const options = {
    path: __dirname
  };
  res.sendFile(__dirname + '/site/index.html', options, printErr);
});

app.get('/books/data', (req, res) => {
  console.log('in book/data handler');
  pool.query('SELECT * FROM aircrafts;', (err, data) => {
    if (err) {
      console.log(err);
      res.end(JSON.parse('"res": "error"').stringify());
    } else {
      console.log(data);
      res.end(JSON.stringify(data.fields));
    }
  });
});

app.use('/site', (req, res) => {
  const fileName = __dirname + '/site' + req.url;
  res.sendFile(fileName, { path: __dirname }, printErr);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
