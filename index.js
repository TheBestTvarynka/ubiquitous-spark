'use strict';

const express = require('express');
const hbs = require('express-handlebars');
const path = require('path');
const expressSession = require('express-session');
const bodyParser = require('body-parser');
const cookie = require('cookie-parser');
const siteRouter = require('./routing/routing');
const login = require('./routing/login');
const register = require('./routing/register');
const books = require('./routing/books');

const app = express();
const port = 8080;

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
app.use(books);

app.get('/', (req, res) => {
  res.render('views/home', { layout: 'default' });
});

app.get('/account', (req, res) => {
  res.render('views/account', { layout: 'default' });
});

app.use('/site', siteRouter);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

