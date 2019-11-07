'use strict';

const express = require('express');
const expressSession = require('express-session');

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
    // user not login yet -> redirect
    console.log('open login page');
    // res.redirect('/site/login');
    res.send('login please');
  } else {
    // user have alredy loginned
    // redirect on account page
    console.log('open account page');
  }
});

router.use((req, res, next) => {
  console.log('the rest');
  console.log(req.url);
  res.send('the rest');
  next();
});

module.exports = router;

