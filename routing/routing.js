'use strict';

const express = require('express');
const expressSession = require('express-session');

const fileSender = (fileName, res) => {
  res.sendFile(fileName, null, (err) => {
    if (err) {
      console.log(err);
    }
  });
};

const router = express.Router();
router.use(expressSession({
  secret: 'mySecretKey',
}));

router.get('/', (req, res) => {
  console.log('root');
  console.log(req.url);
  res.send('All good, root)');
});

router.get('/account', (req, res) => {
  console.log('account');
  // check if user already loggined
  const userName = req.session.cookie.name;
  if (!userName) {
    console.log('open login page');
    res.redirect('/site/login');
  } else {
    // user have alredy loginned
    // redirect on account page
    console.log('open account page');
  }
});

router.get('/login', (req, res) => {
  const fileName = process.env.ROOT_DIR + 'site' + req.url + '.html';
  fileSender(fileName, res);
});

router.use((req, res, next) => {
  const fileName = process.env.ROOT_DIR + 'site' + req.url;
  fileSender(fileName, res);
  // next();
});

module.exports = router;

