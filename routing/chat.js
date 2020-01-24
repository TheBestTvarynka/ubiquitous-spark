'use strict';

const express = require('express');
const router = express.Router();
const dbreader = require('../db/dbreader');
// const dbwriter = require('../db/dbwriter');

const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

router.get('/chat', (req, res) => {
  const pg = dbreader.open(dbconfig);
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/chat');
    res.redirect('/login');
    return;
  }
  let permission = '';
  let username = '';
  let title = '';
  pg.select('usersdata')
    .where({ login })
    .then(result => {
      console.log('result of SELECT login: ', result);
      // read username and permission for user
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
              if (elem.peoples.includes(login)) {
                console.log('rewerger');
                const name = (elem.peoples[0] === login) ?
                  elem.peoples[1] : elem.peoples[0];
                console.log('name of client:', name);
                const letter = name.split('')[0];
                resulting += '<a class="a"  href="/chat_entry/' +
                  name + '"><div class="admin"><div class="picture">' +
                  '<p class="letter">' + letter + '</p></div>' +
                  '<p class="text"><strong>' + name + '</strong></p></div></a>';
              }
            });
            pg.close();
            console.log('res: ', resulting);
            console.log(array);
            if (array.length === 0) resulting = '<p class="warning"' +
              '>No chats here yet</p>';
            // pg.close();
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
              const adminLogin = i.login;
              const letter = i.fullname.split('')[0];
              resulting += '<a class="a" href="/chat_entry/' +
                adminLogin + '"><div class="admin"><div class="picture">' +
                '<p class="letter">' + letter + '</p></div>' +
                '<p class="text"><strong>' + name + '</strong></p></div></a>';
            });
            pg.close();
            res.render('views/chat', { layout: 'default',
              admins: resulting, title });
          });
      }
    });
});

module.exports = router;
