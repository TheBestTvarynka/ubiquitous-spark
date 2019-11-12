'use strict';

const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const hbs = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const siteRouter = require('./routing/routing');
const login = require('./routing/login');
const dbreader = require('./db/dbreader');
const dbwriter = require('./db/dbwriter');
const expressSession = require('express-session');

const app = express();
const port = 8080;

dotenv.config();


const dbconfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

const saltRounds = 10;

const printErr = err => {
  if (err) {
    console.log(err);
  }
};

const validator = (login, email, phone, pas, pas_r) => {
  const re_login = /^[a-zA-Z0-9]+$/;
  const re_email = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  const re_phone = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  if (re_login.test(login) && re_email.test(email) && re_phone.test(phone) && pas === pas_r) {
    return true;
  } else {
    return false;
  }
};
// write new user in corresponding ab tables
const userDataWriter = (login, fullName, email, phone, hash, res) => {
  // save data in db
  const pg = dbwriter.open(dbconfig);
  const pasWriter = pg.insert('userdata');
  pasWriter.fields(['login', 'hash'])
           .value([login, hash])
           .then(result => {
             const dataWriter = pg.insert('usersaccounts');
             dataWriter.fields(['login', 'fullName', 'email', 'phone'])
                       .value([login, fullName, email, phone])
                       .then(resul => {
                         pg.close();
                       });
           });
  res.end('all done');
};

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

app.get('/', (req, res) => {
  console.log(req.session.name);
  // load home page
  res.render('views/home', { layout: 'default' });
});

app.use('/site', siteRouter);

app.post('/register', (req, res) => {
  // collect data from request
  const login = req.body.username;
  const password = req.body.password;
  const password_r = req.body.password_r;
  const fullName = req.body.fullname;
  const email = req.body.email;
  const phone = req.body.phone;
  if (validator(login, email, phone, password, password_r)) {
    const pg = dbreader.open(dbconfig);
    pg.select('userdata')
      .fields(['login'])
      .where({ login })
      .then(rows => {
        pg.close();
        if (rows.length === 0) {
          // hashing a password
          bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) {
              console.log(err);
              res.end('problem with hashing your password:(');
            } else {
              // write new user in tables
              userDataWriter(login, fullName, email, phone, hash, res);
            }
          });
        } else {
          res.end('user with this login already exist');
        }
      });
  } else {
    res.end('you enter wrong date');
  }
});

app.post('/activate', (req, res) => {
  const card_number = req.body.bank_number;
  // login we read from cookies?
  const pg = dbwriter.open(dbconfig);
  const updater = pg.update('usersaccounts');
  updater.set({ userData: 't', bank_number: card_number })
         .whete({ login })
         .then(result => {
         });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
