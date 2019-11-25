'use strict';

const express = require('express');
const hbs = require('express-handlebars');
const path = require('path');
const expressSession = require('express-session');
const bodyParser = require('body-parser');
const cookie = require('cookie-parser');
const login = require('./routing/login');
const register = require('./routing/register');
const account = require('./routing/account');

const app = express();
const port = process.env.PORT || 8080;

// view render engine setup
app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'default', layoutsDir: __dirname + '/site/'}));
app.set('views', path.join(__dirname, 'site'));
app.set('view engine', 'hbs');

app.use(expressSession({
  secret: 'mySecretKey',
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookie());

app.use(login);
app.use(register);
app.use(account);

app.get('/', (req, res) => {
  res.render('views/home', { layout: 'default' });
});

const printErr = err => {
  if (err) {
    console.log(err);
  }
};

const sendFile = (fileName, res) => {
  res.sendFile(fileName, null, printErr);
};

app.use('/site', (req, res) => {
  const filename = __dirname + '/site' + req.url;
  console.log(filename);
  sendFile(filename, res);
});
app.use('/uploads', (req, res) => {
  const filename = __dirname + '/uploads' + req.url;
  sendFile(filename, res);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

