'use strict';

const express = require('express');
// const fileUpload = require('express-fileupload');

const router = express.Router();

// router.use(fileUpload());

router.get('/addbook', (req, res) => {
  console.log('add book GET');
  res.render('views/addbook', { layout: 'default', message: 'Have a book? Good idea to sell it' });
});

/*router.post('/addbook', (req, res) => {
  console.dir(req.files);
  console.log(req.body);
  res.end('we have got all your files');
});*/

module.exports = router;
