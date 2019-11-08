'use strict';

const { Pool } = require('pg');

class DBInserter {
  constructor(database, table) {
    this.database = database;
    this.table = table;
    this.fieldsOrder = [];
    this.values = [];
  }
  value(value) {
    const newValue = '(' + value.map(elem => (`'${elem}'`)).join(', ') + ')';
    this.values.push(newValue);
    return this;
  }
  values(values) {
    this.values = this.values.concat(values);
    return this;
  }
  getvalues() {
    return values;
  }
  clearValues() {
    this.values = [];
    return this;
  }
  fields(list) {
    this.fieldsOrder = list;
    return this;
  }
  then(callback) {
    const { table, fields, values } = this;
    const { pool } = this;
    // create a request to db
    let sql = `INSERT INTO ${table}`;
    if (this.fieldsOrder !== []) {
      const fieldsOrder = ' (' + this.fieldsOrder.join(', ') + ')';
      sql += fieldsOrder;
    }
    const value = values.join(',');
    sql += ' VALUES ' + value;
    console.log('insert: ', sql);
    this.database.query(sql, (err, res) => {
      if (err) {
        console.log(err);
        callback('');
      } else {
        callback(res);
      }
    });

    return this;
  }
};

class DBWriter {
  constructor(config, logger) {
    this.pool = new Pool(config);
    this.config = config;
    this.logger = logger;
  }
  // get object for inserting in db
  insert(table) {
    return new DBInserter(this, table);
  }
  query(sql, callback) {
    console.log(sql);
    this.pool.query(sql, (err, res) => {
      if (callback) {
        callback(err, res);
      }
    });
  }
  close() {
    this.pool.end();
  }
};

module.exports = {
  open: (config, logger) => new DBWriter(config, logger),
};
