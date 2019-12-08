'use strict';

const express = require('express');
const hbs = require('express-handlebars');
const path = require('path');
const expressSession = require('express-session');
const bodyParser = require('body-parser');
const cookie = require('cookie-parser');
const login = require('./routing/login');
const dbreader = require('./db/dbreader');
const register = require('./routing/register');
const account = require('./routing/account');
const search = require('./routing/search');
const book = require('./routing/book');

const app = express();
const port = process.env.PORT || 8080;

// view render engine setup
app.engine('hbs', hbs({ extname: 'hbs', defaultLayout: 'default',
  layoutsDir: __dirname + '/site/' }));
app.set('views', path.join(__dirname, 'site'));
app.set('view engine', 'hbs');

const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};

app.use(expressSession({
  secret: 'mySecretKey',
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookie());

app.use(login);
app.use(register);
app.use(account);
app.use(search);
app.use(book);

app.get('/', (req, res) => {
  res.render('views/home', { layout: 'default' });
});


app.get('/search', (req, res) => {
  res.render('views/search', { layout: 'default' });
});

app.get('/chat', (req, res) => {
  const pg = dbreader.open(dbconfig);
  pg.select('usersdata')
    .where({ permission: 'admin' })
    .then(result => {
      let resulting = '';
      console.log(result);
      result.forEach(i => {
        console.log(i);
        const name = i.fullname;
        console.log(name);
        const letter = i.fullname.split('')[0];
        console.log(letter);
        // eslint-disable-next-line max-len
        resulting += '<a class="a"  href="chat_entry/' + name + '"><div class="admin"><div class="picture"><p class="letter">' + letter + '</p></div><p class="text"><strong>' + name + '</strong></p></div></a>';
      });
      res.render('views/chat', { layout: 'default', admins: resulting });
    });
});

app.get('/about', (req, res) => {
  res.render('views/about', { layout: 'default' });
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
