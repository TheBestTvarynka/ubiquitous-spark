'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const hbs = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const expressSession = require('express-session');
const siteRouter = require('./routing/routing');
const login = require('./routing/login');
const register = require('./routing/register');

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
app.use(login);
app.use(register);

app.get('/', (req, res) => {
  console.log(req.session.name);
  // load home page
  res.render('views/home', { layout: 'default' });
});

app.use('/site', siteRouter);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
