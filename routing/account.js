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

const readUserData = (login, callback) => {
  const pg = dbreader.open(dbconfig);
  pg.select('usersaccounts')
    .where({ login })
    .then(callback);
};

router.get('/account', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account');
    console.log(req.cookies);
    res.redirect('/login');
    return;
  }
  readUserData(login, result => {
      console.log(result);
      if (!result[0].activated) {
        res.cookie('redirect', '/account');
        res.redirect('/activate');
      } else {
        res.render('views/account', { layout: 'default' , user: result[0] });
      }
    });
});

const validate = (user) => {
  const re_email = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  const re_phone = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  const re_card = new RegExp('^[0-9]+$');
  console.log(user.newpassword === user.newpassword_r);
  return (re_email.test(user.email) && re_phone.test(user.phone) && re_card.test(user.bank_number));
};

const updateUserData = (res, user) => {
  const login = user.login;
  delete user.login;
  console.log('user in updater: ', user);
  const pg = dbwriter.open(dbconfig);
  pg.update('usersaccounts')
    .where({ login })
    .set(user)
    .then(result => {
      console.log('UPDATED');
      res.render('views/account', { layout: 'default', user, message: '<p>Data has been updated!</p>' });
    });
};

router.post('/updateprofile', (req, res) => {
  console.log('update profile post hanler');
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account');
    res.redirect('/login');
    return;
  }
  const user = {
    login,
    fullname: req.body.fullname,
    email: req.body.email,
    phone: req.body.phone,
    bank_number: req.body.card_number,
  };
  console.log(user);
  if (validate(user)) {
    updateUserData(res, user);
  } else {
    // user enter incorrect new information
    const pg = dbreader.open(dbconfig);
    pg.select('usersaccounts')
      .where({ login })
      .then(result => {
        pg.close();
        console.log(result);
        res.render('views/account', { layout: 'default' , user: result[0], message: '<p style="color:red">New data is incorrect. Updating aborted!</p>' });
      });
  }
});

module.exports = router;
