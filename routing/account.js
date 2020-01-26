'use strict';

const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const books = require('./books');
const dbreader = require('../db/dbreader');
const dbwriter = require('../db/dbwriter');

dotenv.config();

const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
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
  readUserData(login, 'usersdata', result => {
    if (!result[0].activated) {
      res.cookie('redirect', '/account');
      res.redirect('/activate');
    } else {
      const settings = (result[0].permission === 'admin') ?
        'Admin profile settings' : 'Profile settings';
      res.render('views/account/account', { layout: 'default',
        user: result[0], settings });
    }
  });
});

const validate = user => {
  const reEmail = new RegExp(['^(([^<>()\\[\\]\\.,;:\\s@\\"]+(\\.[^<>(',
    ')\\[\\]\\.,;:\\s@\\"]+)*)|(\\".+\\"))@(([^<>()[\\]\\.,;:\\s@\\"]',
    '+\\.)+[^<>()[\\]\\.,;:\\s@\\"]{2,})$'].join(''), 'i');
  const rePhone = new RegExp(['^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]',
    '?([0-9]{2})[-. ]?([0-9]{2})$'].join(''), 'i');
  const reCard = new RegExp('^[0-9]+$');
  return reEmail.test(user.email) &&
    rePhone.test(user.phone) &&
    reCard.test(user.cardnumber);
};

const updateUserData = (res, table, user) => {
  const login = user.login;
  delete user.login;
  const types = {};
  for (const field in user) {
    types[field] = 'value';
  }
  const pg = dbwriter.open(dbconfig);
  pg.update(table)
    .where({ login })
    .set(user, types)
    .then(() => {
      pg.close();
      res.redirect('/account');
    });
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
    phone: req.body.phone.replace(/\s+/g, ''),
    cardnumber: req.body.card_number.replace(/\s+/g, ''),
  };
  console.log(user);
  if (validate(user)) {
    updateUserData(res, 'usersdata', user);
  } else {
    // user enter incorrect new information
    readUserData(login, 'usersdata', result => {
      res.render('views/account/account', {
        layout: 'default',
        user: result[0],
        message: `<p style="color:red">New data is incorrect.
        Updating aborted!</p>`
      });
    });
  }
});

const comparePasswords = (res, hash, user) => {
  const readData = readUserData.bind(null, user.login, 'usersaccounts');
  bcrypt.compare(user.oldpassword, hash, (err, result) => {
    if (result) {
      if (user.newpassword === user.newpasswordr) {
        bcrypt.hash(user.newpassword, saltRounds, (err, newhash) => {
          updateUserData(res, 'users', { login: user.login, hash: newhash });
        });
      } else {
        readData(userdata => {
          res.render('views/account/account', {
            layout: 'default',
            user: userdata[0],
            message: `<p style="color:red">Can't change password: New
            passwords are not the same</p>`
          });
        });
      }
    } else {
      readData(userdata => {
        res.render('views/account/account', {
          layout: 'default',
          user: userdata[0],
          message: `<p style="color:red">Can't change password: Entered
          incorrect old password</p>`
        });
      });
    }
  });
};

router.post('/updatepassword', async (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/account');
    res.redirect('/login');
    return;
  }
  const user = {
    login,
    oldpassword: req.body.oldpassword,
    newpassword: req.body.newpassword,
    newpasswordr: req.body.newpassword_r,
  };
  const pg = dbreader.open(dbconfig);
  const hashesQuery = pg.select('users');
  const hashes = await hashesQuery.where({ login }).fields([ 'hash' ]);
  pg.close();
  const hash = hashes[0].hash;
  comparePasswords(res, hash, user);
});

router.post('/likebook/:id', async (req, res) => {
  console.log('likebook:');
  const login = req.session.name;
  const id = req.params.id;
  if (!login) {
    res.status('401').send('Login please');
    return;
  }
  const pg = dbreader.open(dbconfig);
  const booksQuery = pg.select('usersdata');
  const likedBooks = await booksQuery.where({ login }).fields([ 'likedbooks' ]);
  const books = likedBooks[0].likedbooks;
  pg.close();
  const up = dbwriter.open(dbconfig);
  const updateQuery = up.update('usersdata');
  updateQuery.where({ login });
  if (books.includes(parseInt(id))) {
    updateQuery.set({ likedbooks: `array_remove(likedbooks, '${id}')` }, {
      likedbooks: 'function' })
      .then(result => {
        up.close();
        console.log(result);
        res.status('200').send('Removed from your Liked Books');
      });
  } else {
    updateQuery.set({ likedbooks: `array_cat(likedbooks, ARRAY[${id}])` }, {
      likedbooks: 'function' })
      .then(result => {
        up.close();
        console.log(result);
        res.status('200').send('Added to your Liked Books');
      });
  }
});

router.post('/buybook/:id', async (req, res) => {
  console.log('buybook - processing...');
  const login = req.session.name;
  const id = req.params.id;
  if (!login) {
    res.status('401').send('Login please');
    return;
  }
  const pg = dbreader.open(dbconfig);
  const cartQuery = pg.select('usersdata');
  const result = await cartQuery.where({ login }).fields([ 'cart' ]);
  const books = result[0].cart;
  pg.close();
  const up = dbwriter.open(dbconfig);
  const updateQuery = up.update('usersdata');
  updateQuery.where({ login });
  if (books.includes(parseInt(id))) {
    updateQuery.set({ cart: `array_remove(cart, ARRAY[${id}])` },
      { cart: 'function' })
      .then(result => {
        up.close();
        console.log(result);
        res.end('Removed from your Cart');
      });
  } else {
    updateQuery.set({ cart: `array_cat(cart, ARRAY[${id}])` },
      { cart: 'function' })
      .then(result => {
        up.close();
        console.log(result);
        res.end('Added to your Cart');
      });
  }
});

module.exports = router;
