'use strict';

const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const siteRouter = require('./routing/routing');
const dbreader = require('./db/dbreader');
const dbwriter = require('./db/dbwriter');

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

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  // load home page
  const fileName = process.env.ROOT_DIR + 'site/index.html';
  res.sendFile(fileName, null, printErr);
});

app.get('/books/data', (req, res) => {
  console.log('in book/data handler');
  const pg = dbreader.open(dbconfig);
  const cursor = pg.select('aircrafts');
  cursor.fields(['model', 'aircraft_code'])
      .order('aircraft_code')
      .then((rows) => {
        console.log(rows);
        res.end(JSON.stringify(rows));
        pg.close();
      });
});

app.use('/site', siteRouter);

app.post('/login', (req, res) => {
  // post variables saves in req.body
  
  res.send('loginned');
});

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
          res.end('this user already exist');
        }
      });
  } else {
    res.end('you enter wrong date');
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
