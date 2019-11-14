'use strict';

const express = require('express');
const hbs = require('express-handlebars');
const path = require('path');
const expressSession = require('express-session');

const upload = require('express-busboy');

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

app.use(login);
app.use(register);
app.use(books);

// upload.extend(app, { upload: true, path: __dirname + 'uploadfiles' });
upload.extend(app, { upload: true });

app.get('/', (req, res) => {
  console.log(req.session.name);
  // load home page
  res.render('views/home', { layout: 'default' });
});

app.post('/addbook', (req, res) => {
  console.log('---------------');
  console.dir(req.files);
  console.log(req.body);
  res.end('data in process');
});

app.use('/site', siteRouter);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

