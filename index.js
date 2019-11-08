'use strict';

const express = require('express');
const dotenv = require('dotenv');
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

const printErr = err => {
  if (err) {
    console.log(err);
  }
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
  // post variables saves in req.body
  console.log('req.body: ', req.body);
  // collect data from request
  const login = req.body.username;
  const password = req.body.password;
  const password_r = req.body.password_r;
  const fullName = req.body.fullname;
  const email = req.body.email;
  const phone = req.body.phone;
  // hashing and validation will be here
  const hash = 'qjif7j4f0ke398k0f9f8';
  // save data in db
  console.log(dbwriter);
  const pg = dbwriter.open(dbconfig);
  const pasWriter = pg.insert('userdata');
  pasWriter.fields(['login', 'hash'])
           .value([login, hash])
           .then(result => {
             console.log('first insertion: ', result);
             const dataWriter = pg.insert('usersaccounts');
             dataWriter.fields(['login', 'fullName', 'email', 'phone'])
                       .value([login, fullName, email, phone])
                       .then(resul => {
                         console.log('second insertion: ', resul);
                         pg.close();
                       });
           });
  res.end('all done');
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
