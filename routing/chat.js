'use strict';

const express = require('express');
const router = express.Router();
const dbreader = require('../db/dbreader');

const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

const userBulletStyle = name => ('<a class="a"  href="/chat_entry/' +
    name + '"><div class="admin"><div class="picture">' +
    '<p class="letter">' + name[0] + '</p></div>' +
    '<p class="text"><strong>' + name + '</strong></p></div></a>');
const adminBulletStyle = (login, name) => ('<a class="a" href="/chat_entry/' +
        login + '"><div class="admin"><div class="picture">' +
        '<p class="letter">' + name[0] + '</p></div>' +
        '<p class="text"><strong>' + name + '</strong></p></div></a>');

router.get('/chat', async (req, res) => {
  const login = req.session.name;
  if (!login) {
    res.cookie('redirect', '/chat');
    res.redirect('/login');
    return;
  }
  const pg = dbreader.open(dbconfig);
  const users = pg.select('usersdata');
  const result = await users.where({ login }).fields(['permission']);
  const user = result[0];
  console.log('THE USER === ', user);
  const permission = user.permission;

  let resulting = '';
  let title = '';
  if (permission === 'admin') {
    console.log('Entered admin section...');
    title = 'Chats';
    const chatsQuery = pg.select('chats_id');
    console.log(login);
    const chats = await chatsQuery.where({ peoples: {
      accident: '@>',
      main: ['1']
    } });
    console.log(chats);
    chats.forEach(elem => {
      const name = (elem.peoples[0] === login) ?
        elem.peoples[1] : elem.peoples[0];
      resulting += userBulletStyle(name);
    });
    if (chats.length === 0) resulting = '<p class="warning"' +
      '>No chats here yet</p>';
  } else {
    console.log('Entered user section...');
    title = 'Administrators';
    const adminsQuery = pg.select('usersdata');
    const admins = await adminsQuery.where({ permission: 'admin' });
    admins.forEach(admin => {
      const name = admin.fullname;
      const adminLogin = admin.login;
      resulting += adminBulletStyle(adminLogin, name);
    });
  }
  pg.close();
  res.render('views/chat', { layout: 'default',
    admins: resulting, title });
});

module.exports = router;
