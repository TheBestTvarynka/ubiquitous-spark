'use strict';

const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const books = require('./books');
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

const readUserData = (login, table, callback) => {
  const pg = dbreader.open(dbconfig);
  pg.select(table)
    .where({ login })
    .then(callback);
  pg.close();
};
router.use('/account', books);
router.get('/account', (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account');
    res.redirect('/login');
    return;
  }
  readUserData(login, 'usersaccounts', result => {
      if (!result[0].activated) {
        res.cookie('redirect', '/account');
        res.redirect('/activate');
      } else {
        res.render('views/account/account', { layout: 'default' , user: result[0] });
      }
    });
});

const validate = (user) => {
  const re_email = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  const re_phone = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  const re_card = new RegExp('^[0-9]+$');
  return (re_email.test(user.email) && re_phone.test(user.phone) && re_card.test(user.bank_number));
};

const updateUserData = (res, table, user) => {
  const login = user.login;
  delete user.login;
  const types = {};
  for (const field in user) types[field] = 'value';
  const pg = dbwriter.open(dbconfig);
  pg.update(table)
    .where({ login })
    .set(user, types)
    .then(result => {
      res.redirect('/account');
    });
  pg.close();
};

router.post('/updateprofile', (req, res) => {
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
  if (validate(user)) {
    updateUserData(res, 'usersaccounts', user);
  } else {
    // user enter incorrect new information
    readUserData(login, 'usersaccounts', result => {
        res.render('views/account/account', { layout: 'default' , user: result[0], message: '<p style="color:red">New data is incorrect. Updating aborted!</p>' });
      });
  }
});

const comparePasswords = (res, hash, user) => {
  const readData = readUserData.bind(null, user.login, 'usersaccounts');
  bcrypt.compare(user.oldpassword, hash, (err, result) => {
    if (result) {
      if (user.newpassword === user.newpassword_r) {
        bcrypt.hash(user.newpassword, saltRounds, (err, hash) => {
          user.hash = hash;
          delete user.oldpassword;
          delete user.newpassword;
          delete user.newpassword_r;
          updateUserData(res, 'userdata', user);
        });
      } else {
        readData(userdata => {
          res.render('views/account/account', { layout: 'default', user: userdata[0], message: '<p style="color:red">Can\'t change password: New passwords are not the same</p>' });
        });
      }
    } else {
      readData(userdata => {
        res.render('views/account/account', { layout: 'default', user: userdata[0], message: '<p style="color:red">Can\'t change password: Entered incorrect old password</p>' });
      });
    }
  });
};

router.post('/updatepassword', (req, res) => {
  const login = req.session.name;
  const user = {
    login,
    oldpassword: req.body.oldpassword,
    newpassword: req.body.newpassword,
    newpassword_r: req.body.newpassword_r,
  };
  if (!login) {
    res.cookie('redirect', '/account');
    res.redirect('/login');
    return;
  }
  const pg = dbreader.open(dbconfig);
  pg.select('userdata')
    .where({ login })
    .then(hashes => {
      const hash = hashes[0].hash;
      comparePasswords(res, hash, user);
    });
});

module.exports = router;
