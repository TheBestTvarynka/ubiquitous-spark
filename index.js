'use strict';

const express = require('express');
const hbs = require('express-handlebars');
const path = require('path');
const expressSession = require('express-session');
const bodyParser = require('body-parser');
const cookie = require('cookie-parser');
const WebSocketServer = require('websocket').server;
const http = require('http');
const dbreader = require('./db/dbreader');
// const { Pool } = require('pg');
const login = require('./routing/login');
// eslint-disable-next-line no-unused-vars
const dbwriter = require('./db/dbwriter.js');
const register = require('./routing/register');
const account = require('./routing/account');
const search = require('./routing/search');
const chat = require('./routing/chat');
const book = require('./routing/book');

const app = express();
const port = process.env.PORT || 8080;
const clients = {};
const historyPack = 4;

// view render engine setup
app.engine('hbs', hbs({ extname: 'hbs', defaultLayout: 'default',
  layoutsDir: __dirname + '/site/' }));
app.set('views', path.join(__dirname, 'site'));
app.set('view engine', 'hbs');

// eslint-disable-next-line no-unused-vars
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
app.use(chat);

app.get('/', (req, res) => {
  res.render('views/home', { layout: 'default' });
});


app.get('/search', (req, res) => {
  res.render('views/search', { layout: 'default' });
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

app.get('/users/:permission', (req, res) => {
  const pg = dbreader.open(dbconfig);
  pg.select('usersdata')
    .fields([ 'login', 'fullname' ])
    .where({ permission: req.params.permission })
    .then(result => {
      res.end(JSON.stringify(result));
    });
});

const server = http.createServer(app);
const webSoketServer = new WebSocketServer({ httpServer: server });

// check correct name
const sendNeightbourds = (clients, message) => {
  console.log('===================> Entered sendNeightbourds');
  console.log('Sending message: =====', message, '===== to clients =====',
    clients, '=====');
  const pg = dbreader.open(dbconfig);
  pg.select('chats_id')
    .fields([ 'peoples' ])
    .where({ id: message.chat_id })
    .then(result => {
      pg.close();
      const peoples = result[0].peoples;
      console.log(peoples);
      for (const person of peoples) {
        console.log(person);
        if (clients[person] && person !== message.author) {
          console.log(person);
          clients[person].send(JSON.stringify({ title: 'message',
            messages: [ message ] }));
        }
      }
      console.log('===================> Entered sendNeightbourds');
    });
};

const writeInDB = data => {
  console.log('===================> Entered writeInDb');
  const message = data;
  console.log('message');
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
      pg.close();
      console.log(result);
    });
  sendNeightbourds(clients, message);
  console.log('===================> Left writeInDb');
};

const loadHistory = (data, connection, title) => {
  // load history
  data.time = '< ' + data.time;
  console.log(data);
  const pg = dbreader.open(dbconfig);
  if (title === 'fullHistory') {
    pg.select('chat')
      .fields(['author', 'message', 'time'])
      .where(data)
      .order('time', false)
      .then(result => {
        pg.close();
        console.log(result);
        connection.send(JSON.stringify({ title: 'fullHistory',
          messages: result }));
      });
  } else {
    pg.select('chat')
      .fields(['author', 'message', 'time'])
      .where(data)
      .limit(historyPack)
      .order('time', false)
      .then(result => {
        pg.close();
        console.log(result);
        connection.send(JSON.stringify({ title: 'history', messages: result }));
      });
  }
};

const routing = {
  message: writeInDB,
  history: loadHistory,
};

webSoketServer.on('request', request => {
  console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
  console.log(request.httpRequest.headers);
  const connection = request.accept(null, request.origin);
  console.log((new Date()) + ' Connection accepted.');

  let userName = undefined;
  connection.on('message', data => {
    if (data.type === 'utf8') {
      const message = JSON.parse(data.utf8Data);
      console.log('data, sent to server =======================> ', message,
        '<=========================');
      if (userName || message.title === 'fullHistory') {
        if (message.title === 'fullHistory') {
          console.log('on message: full history');
          delete message.title;
          delete message.author;
          loadHistory(message, connection, 'fullHistory');
        } else {
          console.log('on message: write in db');
          const title = message.title;
          delete message.title;
          // const action = routing[title];
          // action(message, connection);
          writeInDB(message);
        }
      } else {
        console.log('on message: save name');
        userName = message.author;
        console.log('user name:', userName);
        clients[userName] = connection;
        delete message.title;
        delete message.author;
        loadHistory(message, connection, message.title);
      }
    }
  });
  connection.on('close', connection => {
    console.log((new Date()) + ' Peer ' + connection.remoteAddress +
      ' disconnected.');
    delete clients[userName];
  });
});

server.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
