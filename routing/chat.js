'use strict';

const express = require('express');
const router = express.Router();
// const fs = require('fs');
// const path = require('path');
// const dotenv = require('dotenv');
const dbreader = require('../db/dbreader');
const dbwriter = require('../db/dbwriter');

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
  const login = req.session.name;

  let permission = '';
  let username = '';
  let title = '';
  pg.select('usersdata')
    .where({ login })
    .then(result => {
      username += result[0].fullname;
      permission += result[0].permission;
      console.log('THE USER === ', username, ': ', permission);

      if (permission === 'admin') {
        console.log('Entered admin section...');
        title += 'Chats';
        pg.select('chats_id')
          .then(array => {
            let resulting = '';

            array.forEach(elem => {
              if (elem.peoples.includes(username)) {
                const name = (elem.peoples[0] === username) ?
                  elem.peoples[1] : elem.peoples[0];
                const letter = name.split('')[0];
                resulting += '<a class="a"  href="/chat_entry/' +
                  name +
                  // eslint-disable-next-line max-len
                  '"><div class="admin"><div class="picture"><p class="letter">' +
                  letter + '</p></div><p class="text"><strong>' +
                  name + '</strong></p></div></a>';
              }
            });
            console.log(array);
            if (array.length === 0) resulting = 'No chats here yet';
            pg.close();
            res.render('views/chat', { layout: 'default',
              admins: resulting, title });
          });
      } else {
        console.log('Entered user section...');
        title += 'Administrators';
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
            pg.close();
            res.render('views/chat', { layout: 'default',
              admins: resulting, title });
          });
      }
    });
});

router.get('/chat_entry/:name', (req, res) => {
  const pg = dbreader.open(dbconfig);
  const login = req.session.name;

  const admin = req.params.name;
  const letterAdmin = admin.split('')[0];

  let username = '';
  let letterUser = '';
  pg.select('usersdata')
    .where({ login })
    .then(result => {
      username += result[0].fullname;
      letterUser += username.split('')[0];
      const cursor = pg.select('chats_id');
      cursor.where({ peoples: `@>{${username}, ${admin}}` })
        .then(rows => {
          if (rows.length === 0) {
            const write = dbwriter.open(dbconfig);

            write.insert('chats_id')
              .value({ peoples: [username, admin] }, { peoples: 'array' })
              .then(result => {
                console.log('Result: ');
                console.log(result);

                const row = pg.select('chats_id');
                row.where({ peoples: `@>{${username}, ${admin}}` })
                  .then(result => {
                    const id = result[0].id;
                    console.log('Id: ', id);
                    pg.close();
                    res.render('views/chat_entry',
                      { layout: 'default', admin, username,
                        letterAdmin, letterUser, id });
                  });
              });
          } else {
            console.log('showing rows...');
            console.log(rows);
            const id = rows[0].id;
            console.log('Id: ', id);
            pg.close();
            res.render('views/chat_entry',
              { layout: 'default', admin, username,
                letterAdmin, letterUser, id });
          }
        });
    });
});

module.exports = router;
