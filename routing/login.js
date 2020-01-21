'use strict';

const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const dbreader = require('../db/dbreader');

dotenv.config();

const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

const router = express.Router();

router.get('/login', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.render('views/login', { layout: 'default', message: 'Hmmm, I see you haven\'t logged in to your account so far :(' });
  } else {
    res.redirect('/account');
  }
});

router.post('/login', async (req, res) => {
  const login = req.body.username;
  const password = req.body.password;
  // search user in db
  const pg = dbreader.open(dbconfig);
  const cursor = pg.select('users');
  const result = await cursor.where({ login });
  if (result.length === 0) {
    // user not found
    res.render('views/login', { layout: 'default', message: '<p style="color: red">Login or password incorrect</p>' });
    return;
  }
  // at least user exist
  const hash = result[0].hash;
  // check pssword
  const match = await bcrypt.compare(password, hash);
  if (match) {
    req.session.name = login;
    const readUserData = pg.select('usersdata');
    const data = await readUserData.where({ login }).fields([ 'activated' ]);
    pg.close();
    const userData = data[0];
    if (userData.activated) {
      const redirect = req.cookies.redirect;
      res.cookie('redirect', '');
      if (redirect) {
        res.redirect(redirect);
      } else {
        res.redirect('/account');
      }
    } else {
      res.redirect('/activate');
    }
  } else {
    // password incorrect
    res.render('views/login', { layout: 'default', message: '<p style="color: red">Login or password incorrect</p>' });
  }
});

router.get('/logout', (req, res) => {
  req.session.name = undefined;
  res.redirect('/login');
});

module.exports = router;

