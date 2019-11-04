'use strict';

const express = require('express');

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

app.use('/site', (req, res) => {
  const fileName = __dirname + '/site' + req.url;
  res.sendFile(fileName, { path: __dirname }, printErr);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
