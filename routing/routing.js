'use strict';

const express = require('express');

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
  console.log(req.session.name);
  console.log('account');
  // check if user already loggined
  const userName = req.session.cookie.name;
  if (!userName) {
    console.log('open login page');
    res.redirect('/site/login');
  } else {
    // user have alredy loginned
    // redirect on account page
    console.log('open account page');
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
    const fileName = process.env.ROOT_DIR + 'site/login.html';
    fileSender(fileName, res);
  } else {
    res.redirect('/site/account');
  }
});

router.get('/register', (req, res) => {
  const fileName = process.env.ROOT_DIR + 'site/register.html';
  fileSender(fileName, res);
});

router.use((req, res, next) => {
  const fileName = process.env.ROOT_DIR + 'site' + req.url;
  fileSender(fileName, res);
  // next();
});

module.exports = router;


