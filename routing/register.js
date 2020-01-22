'use strict';

const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const dbreader = require('../db/dbreader');
const dbwriter = require('../db/dbwriter');

dotenv.config();

const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

const pg = dbreader.open(dbconfig);

const saltRounds = 10;

const router = express.Router();

router.get('/register', (req, res) => {
  res.render('views/register', {
    layout: 'default',
    message: '<p>Let\'s create an account in a few second:)</p>'
  });
});

const validate = user => {
  const reEmail = new RegExp(['/^(([^<>()\\[\\]\\.,;:\\s@\\"]+(\\.[^<>(',
    ')\\[\\]\\.,;:\\s@\\"]+)*)|(\\".+\\"))@(([^<>()[\\]\\.,;:\\s@\\"]',
    '+\\.)+[^<>()[\\]\\.,;:\\s@\\"]{2,})$/i'].join(''));
  const rePhone = new RegExp(['/^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?(',
    '[0-9]{2})[-. ]?([0-9]{2})$/'].join(''));
  const reCard = new RegExp('^[0-9]+$');
  return reEmail.test(user.email) &&
    rePhone.test(user.phone) &&
    reCard.test(user.cardnumber) &&
    user.password === user.passwordr;
};

const writeUserData = (res, user) => {
  const values = {
    login: user.login,
    hash: user.hash,
  };
  const types = {
    login: 'value',
    hash: 'value',
  };
  const wr = dbwriter.open(dbconfig);
  const writePas = wr.insert('users');
  writePas.value(values, types)
    .then(() => {
      const values = {
        login: user.login,
        fullName: user.fullname,
        email: user.email,
        phone: user.phone,
      };
      const types = {
        login: 'value',
        fullName: 'value',
        email: 'value',
        phone: 'value',
      };
      const writeData = wr.insert('usersdata');
      writeData.value(values, types)
        .then(() => {
          res.render('views/login', {
            layout: 'default',
            message: '<p>You resenetly registered, login please to continue</p>'
          });
          wr.close();
        });
    });
};

const hashPassword = (res, user) => {
  bcrypt.hash(user.password, saltRounds, (err, hash) => {
    if (err) {
      console.log(err);
      res.render('views/register', {
        layout: 'default',
        message: '<p>Sorry, can\'t hash your password</p>'
      });
    } else {
      user.hash = hash;
      writeUserData(res, user);
    }
  });
};

const findUser = (res, user) => {
  pg.select('users')
    .fields(['login'])
    .where({ login: user.login })
    .then(rows => {
      // after searching a user, close dbreader
      pg.close();
      if (rows.length === 0) {
        hashPassword(res, user);
      } else {
        res.render('views/register', {
          layout: 'default',
          message: '<p style="color: red">User already exist</p>'
        });
      }
    });
};

router.post('/register', (req, res) => {
  console.log(req.body);
  const user = {
    login: req.body.username,
    password: req.body.password,
    passwordr: req.body.password_r,
    fullname: req.body.fullname,
    email: req.body.email,
    phone: req.body.phone.replace(/\s+/g, ''),
  };
  if (validate(user)) {
    findUser(res, user);
  } else {
    res.render('views/register', {
      layout: 'default',
      message: '<p style="color: red">Entered data isn\'t valid(</p>'
    });
  }
});

router.get('/activate', (req, res) => {
  const login = req.session.name;
  if (login) {
    const filename = process.cwd() + '/site/activate.html';
    console.log(filename);
    res.sendFile(filename, null, err => {
      if (err) console.log(err);
    });
  } else {
    res.redirect('/login');
  }
});

router.post('/activate', (req, res) => {
  const login = req.session.name;
  const setters = {
    activated: true,
    cardnumber: req.body.card_number.replace(/\s+/g, ''),
  };
  const types = {
    activated: 'value',
    cardnumber: 'value',
  };
  const activateHandler = dbwriter.open(dbconfig);
  activateHandler.update('usersdata')
    .set(setters, types)
    .where({ login })
    .then(() => {
      if (req.cookies.redirect) {
        res.redirect(req.cookies.redirect);
      } else {
        res.redirect('/account');
      }
    });
});

module.exports = router;
