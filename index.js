'use strict';

const express = require('express');
const hbs = require('express-handlebars');
const path = require('path');
const expressSession = require('express-session');
const bodyParser = require('body-parser');
const cookie = require('cookie-parser');
const WebSocketServer = require('websocket').server;
const http = require('http');
const dbwriter = require('./db/dbwriter');
const { Pool } = require('pg');
const login = require('./routing/login');
const register = require('./routing/register');
const account = require('./routing/account');
const search = require('./routing/search');
const book = require('./routing/book');

const app = express();
const port = process.env.PORT || 8080;
const clients = [];

const dbconfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: true
};
// view render engine setup
app.engine('hbs', hbs({ extname: 'hbs', defaultLayout: 'default',
  layoutsDir: __dirname + '/site/' }));
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
app.use(search);
app.use(book);

app.get('/', (req, res) => {
  res.render('views/home', { layout: 'default' });
});


app.get('/search', (req, res) => {
  res.render('views/search', { layout: 'default' });
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

const server = http.createServer(app);
const webSoketServer = new WebSocketServer({ httpServer: server });

webSoketServer.on('request', request => {
  console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
  const connection = request.accept(null, request.origin);
  clients.push(connection);
  console.log((new Date()) + ' Connection accepted.');

  connection.on('message', data => {
    if (data.type === 'utf8') {
      const message = JSON.parse(data.utf8Data);
      const types = {};
      for (const value in message) {
        types[value] = 'value';
      }
      console.log(message, types);
      // add this message to database
      const pg = dbwriter.open(dbconfig);
      pg.insert('chat')
        .value(message, types)
        .then(result => {
          console.log(result);
        });
      connection.send('{ "res": "OK" }');
    }
  });
  connection.on('close', connection => {
    console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
  });
});

server.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

