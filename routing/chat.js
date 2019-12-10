'use strict';

const express = require('express');
const router = express.Router();
// const fs = require('fs');
// const path = require('path');
// const dotenv = require('dotenv');
const dbreader = require('../db/dbreader');

/* const dbconfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};
*/

const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

router.get('/chat', (req, res) => {
  const pg = dbreader.open(dbconfig);
  pg.select('usersdata')
    .where({ permission: 'admin' })
    .then(result => {
      let resulting = '';
      result.forEach(i => {
        const name = i.fullname;
        const letter = i.fullname.split('')[0];
        // eslint-disable-next-line max-len
        resulting += '<a class="a"  href="/chat_entry/' +
          // eslint-disable-next-line max-len
          name + '"><div class="admin"><div class="picture"><p class="letter">' +
          letter + '</p></div><p class="text"><strong>' +
          name + '</strong></p></div></a>';
      });
      res.render('views/chat', { layout: 'default', admins: resulting });
    });
});

router.get('/chat_entry/:name', (req, res) => {
  const pg = dbreader.open(dbconfig);
  const login = req.session.name;

  const fullname = req.params.name;
  const letterAdmin = fullname.split('')[0];

  let username = '';
  let letterUser = '';
  pg.select('usersdata')
    .where({ login })
    .then(result => {
      username += result[0].fullname;
      console.log('username: ', username);
      letterUser += username.split('')[0];
      console.log('letterUser: ', letterUser);
      res.render('views/chat_entry',
        { layout: 'default', admin: fullname, username,
          letterAdmin, letterUser });
    });
  pg.close();
});

module.exports = router;
