'use strict';

const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const dbreader = require('../db/dbreader');

dotenv.config();

/* const dbconfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};
*/
const dbconfig = {
  connectionString: process.env.DATABASE_URL
};
const pg = dbreader.open(dbconfig);

const router = express.Router();

router.get('/login', (req, res) => {
  const login = req.session.name;
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
        req.session.name = user.login;
        const readUserData = pg.select('usersdata');
        readUserData.where({ login: user.login })
                    .then(rows => {
                      if (rows[0].activated) {
                        const redirect = req.cookies.redirect;
                        res.cookie('redirect', '');
                        if (redirect) {
                          res.redirect(redirect);
                        } else {
                          res.redirect('/account');
                        }
                      } else res.redirect('/activate');
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
  pg.select('users')
    .where({ login: user.login })
    .then(rows => {
      parseUser(req, res, user, rows);
    });
});

router.get('/logout', (req, res) => {
  req.session.name = undefined;
  res.redirect('/login');
});

module.exports = router;
