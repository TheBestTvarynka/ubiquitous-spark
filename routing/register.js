'use strict';

const express = require('express');
const dotenv = require('dotenv');
const expressSession = require('express-session');
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
const pg = dbreader.open(dbconfig);

const saltRounds = 10;

const router = express.Router();
router.use(expressSession({
  secret: 'mySecretKey',
}));

router.get('/register', (req, res) => {
  res.render('views/register', { layout: 'default', message: '<p>Let\'s create an account in a few second:)</p>' });
});

const validate = (user) => {
  const re_login = /^[a-zA-Z0-9]+$/;
  const re_email = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  const re_phone = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  return (re_login.test(user.login) && re_email.test(user.email) && re_phone.test(user.phone) && user.password === user.password_r);
};

const writeUserData = (res, user) => {
  const wr = dbwriter.open(dbconfig);
  const writePas = wr.insert('userdata');
  writePas.fields(['login', 'hash'])
          .value([user.login, user.hash])
          .then(result => {
            const writeData = wr.insert('usersaccounts');
            writeData.fields(['login', 'fullName', 'email', 'phone'])
                     .value([user.login, user.fullName, user.email, user.phone])
                     .then(result => {
                       res.render('views/login', { layout: 'default', message: '<p>You resenetly registered, login please to continue</p>'});
                       wr.close();
                     });
          });
};

const hashPassword = (res, user) => {
  bcrypt.hash(user.password, saltRounds, (err, hash) => {
    if(err) {
      console.log(err);
      res.render('views/register', { layout: 'default', message: '<p>Sorry, can\'t hash your password</p>' });
    } else {
      user.hash = hash;
      writeUserData(res, user);
    }
  });
};

const findUser = (res, user) => {
  pg.select('userdata')
    .fields(['login'])
    .where({ login: user.login })
    .then(rows => {
      // after searching a user, close dbreader
      pg.close();
      if (rows.length === 0) {
        hashPassword(res, user);
      } else {
        res.render('views/register', { layout: 'default', message: '<p style="color: red">User with this login already exist</p>' });
      }
    });
};

router.post('/register', (req, res) => {
  const user = {
    login: req.body.username,
    password: req.body.password,
    password_r: req.body.password_r,
    fullName: req.body.fullname,
    email: req.body.email,
    phone: req.body.phone,
  };
  if (validate(user)) {
    findUser(res, user);
  } else {
    res.render('views/register', { layout: 'default', message: '<p style="color: red">Entered data isn\'t valid(</p>' });
  }
});

module.exports = router;
