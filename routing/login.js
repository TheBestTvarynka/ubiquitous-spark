'use strict';

const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const dbreader = require('../db/dbreader');
// const dbwriter = require('../db/dbwriter');
const expressSession = require('express-session');

dotenv.config();

const dbconfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};
const pg = dbreader.open(dbconfig);

const router = express.Router();

router.use(expressSession({
  secret: 'mySecretKey',
}));

router.get('/login', (req, res) => {
  const login = req.session.name;
  console.log(login);
  if (!login) {
    res.render('views/login', { layout: 'default', message: 'Hmmm, I see you haven\'t logged in to your account so far :(' });
  } else {
    res.redirect('/account');
  }
});

const compare = (req, res, user) => {
  const hash = user.hash;
  const password = user.password;
  bcrypt.compare(password, hash, (err, result) => {
    if (err) {
      console.log(err)
    } else {
      if (result) {
        // login success
        console.log(user.login);
        req.session.name = user.login;
        const readUserData = pg.select('usersaccounts');
        readUserData.where({ login: user.login })
                    .then(rows => {
                      if (rows[0].activated) {
                        // will be render account profile page
                        console.log(JSON.stringify(rows[0]));
                        res.end(JSON.stringify(rows[0]));
                      } else res.redirect('/site/activate');
                    });
      } else {
        res.render('views/login', { layout: 'default', message: '<p style="color: red">Login or password incorrect</p>' });
      }
    }
  });
};

const parseUser = (req, res, user, rows) => {
  if (rows.length === 0) {
    // user not found
    res.render('views/login', { layout: 'default', message: '<p style="color: red">User with this login does not exist</p>' });
  } else {
    // compare passwords
    user.hash = rows[0].hash;
    compare(req, res, user);
  }
};

router.post('/login', (req, res) => {
  const user = {
    login: req.body.username,
    password: req.body.password,
  };
  // search user in db
  pg.select('userdata')
    .where({ login: user.login })
    .then(rows => {
      parseUser(req, res, user, rows);
    });
});

module.exports = router;
