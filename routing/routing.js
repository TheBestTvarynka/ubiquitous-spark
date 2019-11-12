'use strict';

const express = require('express');
const dbreader = require('../db/dbreader');
const dotenv = require('dotenv');

dotenv.config();

const dbconfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

const printErr = err => {
  if (err) {
    console.log(err);
  }
};

const fileSender = (fileName, res) => {
  res.sendFile(fileName, null, printErr);
};

const router = express.Router();

router.get('/', (req, res) => {
  const fileName = process.env.ROOT_DIR + 'site/index.html';
  fileSender(fileName, res);
});

router.get('/account', (req, res) => {
  // check if user already loggined
  const login = req.session.name;
  if (!login) {
    res.redirect('/site/login');
  } else {
    const pg = dbreader.open(dbconfig);
    const readData = pg.select('usersaccounts');
    readData.where({ login })
            .then(rows => {
              const data = rows[0];
              console.log(data);
              res.end(JSON.stringify(data));
              pg.close();
            });
  }
});

router.get('/activate', (req, res) => {
  const fileName = process.env.ROOT_DIR + 'site/activate.html';
  fileSender(fileName, res);
});

router.get('/login', (req, res) => {
  // if already loginned then redirect to account page
  const userName = req.session.cookie.name;
  if (!userName) {
    // res.render('views/clear', { layout: 'login', message: 'templater works success' });
    res.render('views/login', { layout: 'default', message: 'Hmmm, I see you haven\'t logged in to your account so far :(' });
  } else {
    res.redirect('/site/account');
  }
});

router.get('/register', (req, res) => {
  res.render('views/register', { layout: 'default', message: 'login please' });
});

router.use((req, res, next) => {
  const fileName = process.env.ROOT_DIR + 'site' + req.url;
  fileSender(fileName, res, next);
  // next();
});

module.exports = router;


