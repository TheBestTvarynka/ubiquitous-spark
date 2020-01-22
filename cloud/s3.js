'use strict';

const AWS = require('aws-sdk');

class Cloud {
  constructor(s3config) {
    this.s3 = new AWS.S3(s3config);
  }
  upload(bucket, file, filename, mimetype, callback) {
    const params = {
      Bucket: bucket,
      Key: filename,
      Body: file,
      ContentType: mimetype,
    };
    this.s3.upload(params, callback);
  }
  download(bucket, filename, callback) {
    const params = {
      Bucket: bucket,
      Key: filename,
    };
    this.s3.getObject(params, callback);
  }
}

module.exports = {
  open: s3config => new Cloud(s3config),
};
