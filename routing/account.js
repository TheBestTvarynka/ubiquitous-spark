'use strict';

const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const dbreader = require('../db/dbreader');
const dbwriter = require('../db/dbwriter');

dotenv.config();

const dbconfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

const saltRounds = 10;

const router = express.Router();

router.get('/account', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account');
    console.log(req.cookies);
    res.redirect('/login');
    return;
  }
  // read user data
  const pg = dbreader.open(dbconfig);
  pg.select('usersaccounts')
    .where({ login })
    .then(result => {
      console.log(result);
      res.render('views/account', { layout: 'default' , user: result[0] });
    });
});

module.exports = router;
