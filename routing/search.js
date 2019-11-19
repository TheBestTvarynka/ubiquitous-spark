'use strict'

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const dbwriter = require('../db/dbwriter');

const dbconfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};


router.post('/search', (res, req) => {
  //
  // //here i'm 'parsing' results of the found books, but first I've got
  // //to understand the principles of communicating with the db
  //
  // const pg = dbreader.open(dbconfig);
  let list = [];
  // pg.select('userdata')
  //   .where({ login: user.login })
  //   .then(rows => {
  //     list = parseBooks(req, res, user, rows);
  //   });

  //here I'm creating nodes (books) and inserting them in the document

});
